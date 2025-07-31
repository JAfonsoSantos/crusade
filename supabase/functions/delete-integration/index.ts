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

    // Step 3: Find and delete campaigns that were imported from this integration
    console.log('Finding campaigns imported from this integration...')
    const { data: linkedCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, description')
      .eq('company_id', integration.company_id)
    
    if (!campaignsError && linkedCampaigns) {
      // Find campaigns that were imported from this specific integration provider
      const campaignsToDelete = linkedCampaigns.filter(campaign => {
        // Check if campaign description indicates it was imported from this provider
        const description = campaign.description || ''
        const providerName = integration.provider.toLowerCase()
        return description.toLowerCase().includes(`imported from ${providerName}`)
      })

      if (campaignsToDelete.length > 0) {
        console.log(`Deleting ${campaignsToDelete.length} campaigns imported from ${integration.provider}...`)
        
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

    // Step 4: Find and delete ad spaces that were imported from this integration
    console.log('Finding ad spaces imported from this integration...')
    const { data: linkedAdSpaces, error: adSpacesError } = await supabase
      .from('ad_spaces')
      .select('id, name, location')
      .eq('company_id', integration.company_id)
    
    if (!adSpacesError && linkedAdSpaces) {
      // Find ad spaces that were imported from this specific provider
      const adSpacesToDelete = linkedAdSpaces.filter(adSpace => {
        // Check if ad space was created for this provider integration
        // Kevel ad spaces typically have "kevel.co" in the location
        const location = adSpace.location || ''
        const providerName = integration.provider.toLowerCase()
        
        if (providerName === 'kevel') {
          return location.toLowerCase().includes('kevel.co')
        }
        
        // For other providers, we can add similar logic
        return false
      })

      if (adSpacesToDelete.length > 0) {
        console.log(`Deleting ${adSpacesToDelete.length} ad spaces imported from ${integration.provider}...`)
        
        // Delete campaign_ad_spaces that reference these ad spaces first
        for (const adSpace of adSpacesToDelete) {
          const { error: campaignAdSpacesError } = await supabase
            .from('campaign_ad_spaces')
            .delete()
            .eq('ad_space_id', adSpace.id)
          
          if (campaignAdSpacesError) {
            console.error(`Error deleting campaign ad spaces for ad space ${adSpace.id}:`, campaignAdSpacesError)
          }
        }

        // Then delete the ad spaces
        const adSpaceIds = adSpacesToDelete.map(as => as.id)
        const { error: deleteAdSpacesError } = await supabase
          .from('ad_spaces')
          .delete()
          .in('id', adSpaceIds)
        
        if (deleteAdSpacesError) {
          console.error('Error deleting ad spaces:', deleteAdSpacesError)
        } else {
          deletedCount.ad_spaces = adSpacesToDelete.length
          console.log(`Deleted ${deletedCount.ad_spaces} ad spaces`)
        }
      }
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