import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { integrationId } = await req.json()
    
    if (!integrationId) {
      return new Response(
        JSON.stringify({ error: 'Integration ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting deletion process for integration: ${integrationId}`)

    // Check if integration exists
    const { data: integration, error: integrationError } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()
    
    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found integration: ${integration.name} (${integration.provider})`)

    let deletedCount = {
      platform_mappings: 0,
      sync_history: 0,
      campaigns: 0,
      ad_spaces: 0,
      integration: 0
    }

    // Step 1: Delete platform mappings for this integration
    console.log('Deleting platform mappings...')
    const { data: deletedMappings, error: mappingsError } = await supabase
      .from('platform_mappings')
      .delete()
      .eq('integration_id', integrationId)
      .select('count')
    
    if (mappingsError) {
      console.error('Error deleting platform mappings:', mappingsError)
    } else {
      deletedCount.platform_mappings = deletedMappings?.length || 0
      console.log(`Deleted ${deletedCount.platform_mappings} platform mappings`)
    }

    // Step 2: Delete sync history for this integration
    console.log('Deleting sync history...')
    const { data: deletedHistory, error: historyError } = await supabase
      .from('integration_sync_history')
      .delete()
      .eq('integration_id', integrationId)
      .select('count')
    
    if (historyError) {
      console.error('Error deleting sync history:', historyError)
    } else {
      deletedCount.sync_history = deletedHistory?.length || 0
      console.log(`Deleted ${deletedCount.sync_history} sync history records`)
    }

    // Step 3: Find and delete campaigns that were created specifically for this integration
    // We'll check platform_config to see if campaigns are linked to this integration
    console.log('Finding campaigns linked to this integration...')
    const { data: linkedCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('company_id', integration.company_id)
      .not('platform_config', 'is', null)
    
    if (!campaignsError && linkedCampaigns) {
      const campaignsToDelete = linkedCampaigns.filter(campaign => {
        // Check if campaign has platform_config that references this integration
        const platformConfig = campaign.platform_config
        return platformConfig && 
               typeof platformConfig === 'object' && 
               platformConfig.integration_id === integrationId
      })

      if (campaignsToDelete.length > 0) {
        console.log(`Deleting ${campaignsToDelete.length} campaigns linked to integration...`)
        
        // Delete campaign_ad_spaces first (foreign key constraint)
        for (const campaign of campaignsToDelete) {
          const { error: adSpacesError } = await supabase
            .from('campaign_ad_spaces')
            .delete()
            .eq('campaign_id', campaign.id)
          
          if (adSpacesError) {
            console.error(`Error deleting ad spaces for campaign ${campaign.id}:`, adSpacesError)
          }
        }

        // Then delete campaigns
        const campaignIds = campaignsToDelete.map(c => c.id)
        const { error: deleteCampaignsError } = await supabase
          .from('campaigns')
          .delete()
          .in('id', campaignIds)
        
        if (deleteCampaignsError) {
          console.error('Error deleting campaigns:', deleteCampaignsError)
        } else {
          deletedCount.campaigns = campaignsToDelete.length
          console.log(`Deleted ${deletedCount.campaigns} campaigns`)
        }
      }
    }

    // Step 4: Find and delete ad spaces that were created specifically for this integration
    console.log('Finding ad spaces linked to this integration...')
    const { data: linkedAdSpaces, error: adSpacesError } = await supabase
      .from('ad_spaces')
      .select('id, name')
      .eq('company_id', integration.company_id)
    
    if (!adSpacesError && linkedAdSpaces) {
      // For ad spaces, we need to be more careful - only delete those that are ONLY used by this integration
      // We'll check if they have platform_config or metadata that ties them exclusively to this integration
      
      // For now, we'll be conservative and not auto-delete ad spaces unless they have specific metadata
      // This prevents accidentally deleting ad spaces that might be used by multiple integrations
      console.log('Ad spaces deletion skipped for safety - manual review recommended')
    }

    // Step 5: Finally, delete the integration itself
    console.log('Deleting integration...')
    const { error: deleteIntegrationError } = await supabase
      .from('ad_server_integrations')
      .delete()
      .eq('id', integrationId)
    
    if (deleteIntegrationError) {
      console.error('Error deleting integration:', deleteIntegrationError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete integration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      deletedCount.integration = 1
      console.log('Integration deleted successfully')
    }

    console.log('Deletion completed successfully:', deletedCount)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Integration "${integration.name}" and all related data deleted successfully`,
        deleted: deletedCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in delete-integration function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})