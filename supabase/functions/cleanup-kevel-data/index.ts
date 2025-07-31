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

    // Get the authorization header to verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting Kevel data cleanup for user: ${user.id}`)

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let deletedCount = {
      campaigns: 0,
      ad_spaces: 0,
      campaign_ad_spaces: 0
    }

    // Step 1: Find and delete campaigns imported from Kevel
    console.log('Finding campaigns imported from Kevel...')
    const { data: kevelCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, description')
      .eq('company_id', profile.company_id)

    if (!campaignsError && kevelCampaigns) {
      const campaignsToDelete = kevelCampaigns.filter(campaign => {
        const description = campaign.description || ''
        return description.toLowerCase().includes('imported from kevel')
      })

      if (campaignsToDelete.length > 0) {
        console.log(`Deleting ${campaignsToDelete.length} campaigns imported from Kevel...`)
        
        // Delete campaign_ad_spaces first
        for (const campaign of campaignsToDelete) {
          const { data: deletedCampaignAdSpaces, error: adSpacesError } = await supabase
            .from('campaign_ad_spaces')
            .delete()
            .eq('campaign_id', campaign.id)
            .select('count')
          
          if (!adSpacesError && deletedCampaignAdSpaces) {
            deletedCount.campaign_ad_spaces += deletedCampaignAdSpaces.length || 0
          }
        }

        // Then delete campaigns
        const campaignIds = campaignsToDelete.map(c => c.id)
        const { error: deleteCampaignsError } = await supabase
          .from('campaigns')
          .delete()
          .in('id', campaignIds)
        
        if (!deleteCampaignsError) {
          deletedCount.campaigns = campaignsToDelete.length
          console.log(`Deleted ${deletedCount.campaigns} Kevel campaigns`)
        }
      }
    }

    // Step 2: Find and delete ad spaces from Kevel
    console.log('Finding ad spaces from Kevel...')
    const { data: kevelAdSpaces, error: adSpacesError } = await supabase
      .from('ad_spaces')
      .select('id, name, location')
      .eq('company_id', profile.company_id)

    if (!adSpacesError && kevelAdSpaces) {
      const adSpacesToDelete = kevelAdSpaces.filter(adSpace => {
        const location = adSpace.location || ''
        return location.toLowerCase().includes('kevel.co')
      })

      if (adSpacesToDelete.length > 0) {
        console.log(`Deleting ${adSpacesToDelete.length} ad spaces from Kevel...`)
        
        // Delete remaining campaign_ad_spaces that reference these ad spaces
        for (const adSpace of adSpacesToDelete) {
          const { data: deletedCampaignAdSpaces, error: campaignAdSpacesError } = await supabase
            .from('campaign_ad_spaces')
            .delete()
            .eq('ad_space_id', adSpace.id)
            .select('count')
          
          if (!campaignAdSpacesError && deletedCampaignAdSpaces) {
            deletedCount.campaign_ad_spaces += deletedCampaignAdSpaces.length || 0
          }
        }

        // Then delete the ad spaces
        const adSpaceIds = adSpacesToDelete.map(as => as.id)
        const { error: deleteAdSpacesError } = await supabase
          .from('ad_spaces')
          .delete()
          .in('id', adSpaceIds)
        
        if (!deleteAdSpacesError) {
          deletedCount.ad_spaces = adSpacesToDelete.length
          console.log(`Deleted ${deletedCount.ad_spaces} Kevel ad spaces`)
        }
      }
    }

    console.log('Kevel data cleanup completed successfully:', deletedCount)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'All Kevel data has been removed from your Crusade account',
        deleted: deletedCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in cleanup-kevel-data function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})