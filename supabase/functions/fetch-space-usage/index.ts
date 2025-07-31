import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Set the auth token for the supabase client
    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: '',
    })

    const { spaceId } = await req.json()

    // Get space details
    const { data: space, error: spaceError } = await supabaseClient
      .from('ad_spaces')
      .select('*, external_id, ad_server')
      .eq('id', spaceId)
      .single()

    if (spaceError) {
      throw spaceError
    }

    if (!space || space.ad_server !== 'kevel' || !space.external_id) {
      return new Response(
        JSON.stringify({ error: 'Space not found or not a Kevel space with external_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Kevel integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('ad_server_integrations')
      .select('api_key_encrypted, configuration')
      .eq('provider', 'kevel')
      .eq('status', 'active')
      .single()

    if (integrationError || !integration) {
      throw new Error('Kevel integration not found')
    }

    // Fetch usage data from Kevel API
    // This is a simplified example - you'd need to implement actual Kevel API calls
    // based on your specific setup and the reports API
    const kevelApiKey = integration.api_key_encrypted
    const networkId = 11833 // Your network ID

    // Example API call to get site stats (you'll need to adjust based on Kevel's actual API)
    const statsResponse = await fetch(`https://api.kevel.co/v1/report/stats`, {
      method: 'POST',
      headers: {
        'X-Adzerk-ApiKey': kevelApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        endDate: new Date().toISOString().split('T')[0],
        groupBy: ['SiteId'],
        metrics: ['Impressions', 'Clicks'],
        filters: {
          SiteId: [space.external_id]
        }
      })
    })

    let usageData = {
      impressions: 0,
      clicks: 0,
      last_impression: null,
      last_click: null
    }

    if (statsResponse.ok) {
      const statsData = await statsResponse.json()
      
      // Process the response based on Kevel's API structure
      if (statsData && statsData.length > 0) {
        const siteStats = statsData[0]
        usageData.impressions = siteStats.Impressions || 0
        usageData.clicks = siteStats.Clicks || 0
        
        // You might need additional API calls to get last impression/click timestamps
        if (usageData.impressions > 0) {
          usageData.last_impression = new Date().toISOString() // Placeholder
        }
        if (usageData.clicks > 0) {
          usageData.last_click = new Date().toISOString() // Placeholder
        }
      }
    } else {
      console.log('Kevel API response not ok:', statsResponse.status, await statsResponse.text())
    }

    // Update the space with real usage data
    const { error: updateError } = await supabaseClient
      .from('ad_spaces')
      .update(usageData)
      .eq('id', spaceId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, usageData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})