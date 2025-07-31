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

    const { campaignId, integrationId, activate } = await req.json()

    if (!campaignId || !integrationId || activate === undefined) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID, Integration ID, and activate flag are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Toggling campaign ${campaignId} to ${activate ? 'active' : 'inactive'} in integration ${integrationId}`)

    // Get the integration details
    const { data: integration, error: integrationError } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = integration.api_key_encrypted
    if (!apiKey) {
      console.error('No API key found for integration')
      return new Response(
        JSON.stringify({ error: 'No API key configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get campaign config to find Kevel campaign ID
    const campaignConfig = integration.configuration as any || {}
    const kevelCampaignId = campaignConfig.campaigns?.[campaignId]?.kevel_id

    if (!kevelCampaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found in Kevel. Push the campaign first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update campaign status in Kevel
    console.log(`Updating Kevel campaign ${kevelCampaignId} status to: ${activate}`)
    const kevelResponse = await fetch(`https://api.kevel.co/v1/campaign/${kevelCampaignId}`, {
      method: 'PUT',
      headers: {
        'X-Adzerk-ApiKey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        IsActive: activate
      }),
    })

    if (!kevelResponse.ok) {
      const errorText = await kevelResponse.text()
      console.error('Kevel API error:', kevelResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update campaign status in Kevel', 
          details: `${kevelResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const kevelCampaign = await kevelResponse.json()
    console.log('Kevel campaign updated:', kevelCampaign)

    // Also update all flights to match campaign status
    console.log('Updating flights status...')
    const flightsResponse = await fetch(`https://api.kevel.co/v1/campaign/${kevelCampaignId}/flight`, {
      method: 'GET',
      headers: {
        'X-Adzerk-ApiKey': apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (flightsResponse.ok) {
      const flightsData = await flightsResponse.json()
      
      // Update each flight status
      for (const flight of flightsData.items || []) {
        try {
          await fetch(`https://api.kevel.co/v1/flight/${flight.Id}`, {
            method: 'PUT',
            headers: {
              'X-Adzerk-ApiKey': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              IsActive: activate
            }),
          })
          console.log(`Updated flight ${flight.Id} status to: ${activate}`)
        } catch (error) {
          console.error(`Failed to update flight ${flight.Id}:`, error)
        }
      }
    }

    // Update local campaign status
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: activate ? 'active' : 'paused'
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error updating local campaign status:', updateError)
    }

    console.log(`Campaign ${campaignId} successfully ${activate ? 'activated' : 'paused'} in Kevel`)

    return new Response(
      JSON.stringify({ 
        success: true,
        status: activate ? 'active' : 'paused',
        message: `Campaign successfully ${activate ? 'activated' : 'paused'} in Kevel`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Toggle campaign error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})