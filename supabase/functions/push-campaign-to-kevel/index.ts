import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CampaignData {
  id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  budget?: number
  currency: string
  status: string
  company_id: string
}

interface KevelCampaignRequest {
  Name: string
  AdvertiserId: number
  StartDate: string
  EndDate: string
  IsActive: boolean
  Price?: number
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

    const { campaignId, integrationId } = await req.json()

    if (!campaignId || !integrationId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID and Integration ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Pushing campaign ${campaignId} to integration ${integrationId}`)

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

    if (integration.provider !== 'kevel') {
      return new Response(
        JSON.stringify({ error: 'This function only supports Kevel integrations' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Get the campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError)
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found campaign: ${campaign.name}`)

    // First, get available advertisers from Kevel
    console.log('Fetching advertisers from Kevel...')
    const advertisersResponse = await fetch('https://api.kevel.co/v1/advertiser', {
      method: 'GET',
      headers: {
        'X-Adzerk-ApiKey': apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!advertisersResponse.ok) {
      const errorText = await advertisersResponse.text()
      console.error('Kevel Advertisers API error:', advertisersResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch advertisers from Kevel', 
          details: `${advertisersResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const advertisersData = await advertisersResponse.json()
    console.log('Available advertisers:', advertisersData)

    // Use the first available advertiser, or create one if none exist
    let advertiserId
    if (advertisersData.items && advertisersData.items.length > 0) {
      advertiserId = advertisersData.items[0].Id
      console.log(`Using existing advertiser ID: ${advertiserId}`)
    } else {
      // Create a default advertiser if none exist
      console.log('No advertisers found, creating default advertiser...')
      const createAdvertiserResponse = await fetch('https://api.kevel.co/v1/advertiser', {
        method: 'POST',
        headers: {
          'X-Adzerk-ApiKey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Title: 'Default Advertiser',
          IsActive: true
        }),
      })

      if (!createAdvertiserResponse.ok) {
        const errorText = await createAdvertiserResponse.text()
        console.error('Failed to create advertiser:', createAdvertiserResponse.status, errorText)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create advertiser in Kevel', 
            details: `${createAdvertiserResponse.status}: ${errorText}` 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const newAdvertiser = await createAdvertiserResponse.json()
      advertiserId = newAdvertiser.Id
      console.log(`Created new advertiser with ID: ${advertiserId}`)
    }

    // Check if campaign already exists in Kevel (by checking if it has external metadata)
    const campaignConfig = integration.configuration as any || {}
    const existingKevelCampaignId = campaignConfig.campaigns?.[campaign.id]?.kevel_id

    // Prepare campaign data for Kevel
    const kevelCampaignData: KevelCampaignRequest = {
      Name: campaign.name,
      AdvertiserId: advertiserId,
      StartDate: campaign.start_date + 'T00:00:00.000Z',
      EndDate: campaign.end_date + 'T23:59:59.999Z',
      IsActive: campaign.status === 'active',
      Price: campaign.budget || 1000
    }

    console.log('Kevel campaign data:', kevelCampaignData)

    let kevelResponse
    let method = 'POST'
    let endpoint = 'https://api.kevel.co/v1/campaign'

    if (existingKevelCampaignId) {
      // Update existing campaign
      method = 'PUT'
      endpoint = `https://api.kevel.co/v1/campaign/${existingKevelCampaignId}`
      console.log(`Updating existing Kevel campaign ${existingKevelCampaignId}`)
    } else {
      console.log('Creating new Kevel campaign')
    }

    // Push to Kevel API
    kevelResponse = await fetch(endpoint, {
      method: method,
      headers: {
        'X-Adzerk-ApiKey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kevelCampaignData),
    })

    if (!kevelResponse.ok) {
      const errorText = await kevelResponse.text()
      console.error('Kevel API error:', kevelResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to push campaign to Kevel', 
          details: `${kevelResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const kevelCampaign = await kevelResponse.json()
    console.log('Kevel campaign response:', kevelCampaign)

    // Get available ad units (zones) to create flights
    console.log('Fetching available ad units for flights...')
    const sitesResponse = await fetch('https://api.kevel.co/v1/site', {
      method: 'GET',
      headers: {
        'X-Adzerk-ApiKey': apiKey,
        'Content-Type': 'application/json',
      },
    })

    let flightCount = 0
    if (sitesResponse.ok) {
      const sitesData = await sitesResponse.json()
      
      // Create flights for each site's ad units
      for (const site of sitesData.items || []) {
        const adUnitsResponse = await fetch(`https://api.kevel.co/v1/site/${site.Id}/zone`, {
          method: 'GET',
          headers: {
            'X-Adzerk-ApiKey': apiKey,
            'Content-Type': 'application/json',
          },
        })
        
        if (adUnitsResponse.ok) {
          const adUnitsData = await adUnitsResponse.json()
          
          // Create one flight per ad unit (limit to 3 for demo)
          for (const adUnit of adUnitsData.items?.slice(0, 3) || []) {
            try {
              const flightData = {
                Name: `${campaign.name} - ${adUnit.Name}`,
                CampaignId: kevelCampaign.Id,
                PriorityId: 5, // Medium priority
                ZoneId: adUnit.Id,
                StartDate: campaign.start_date + 'T00:00:00.000Z',
                EndDate: campaign.end_date + 'T23:59:59.999Z',
                IsActive: false, // Start inactive for safety
                IsUnlimited: true,
                Price: Math.round((campaign.budget || 1000) * 100 / 3) // Distribute budget
              }

              console.log(`Creating flight for ad unit: ${adUnit.Name}`)
              const flightResponse = await fetch('https://api.kevel.co/v1/flight', {
                method: 'POST',
                headers: {
                  'X-Adzerk-ApiKey': apiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(flightData),
              })

              if (flightResponse.ok) {
                const flight = await flightResponse.json()
                console.log(`Created flight: ${flight.Name} (ID: ${flight.Id})`)
                flightCount++
              } else {
                const errorText = await flightResponse.text()
                console.error(`Failed to create flight for ${adUnit.Name}:`, errorText)
              }
            } catch (error) {
              console.error(`Error creating flight for ${adUnit.Name}:`, error)
            }
          }
        }
      }
    }

    // Update integration configuration with campaign mapping
    const updatedConfig = {
      ...campaignConfig,
      campaigns: {
        ...campaignConfig.campaigns,
        [campaign.id]: {
          kevel_id: kevelCampaign.Id,
          pushed_at: new Date().toISOString(),
          status: 'synced',
          flights_created: flightCount
        }
      }
    }

    await supabase
      .from('ad_server_integrations')
      .update({ 
        configuration: updatedConfig,
        last_sync: new Date().toISOString()
      })
      .eq('id', integrationId)

    console.log(`Campaign ${campaign.name} successfully pushed to Kevel with ID ${kevelCampaign.Id} and ${flightCount} flights`)

    return new Response(
      JSON.stringify({ 
        success: true,
        kevel_campaign_id: kevelCampaign.Id,
        flights_created: flightCount,
        message: `Campaign "${campaign.name}" successfully ${existingKevelCampaignId ? 'updated in' : 'created in'} Kevel with ${flightCount} flights`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Push campaign error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})