import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KevelSite {
  Id: number
  Title: string
  Url: string
  AdTypes: Array<{
    Id: number
    Name: string
    Width: number
    Height: number
    IsDeleted: boolean
  }>
}

interface KevelApiResponse {
  items: KevelSite[]
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting sync for integration: ${integrationId}`)

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

    console.log('Fetching sites from Kevel API...')

    // Fetch sites from Kevel Management API
    const kevelResponse = await fetch('https://api.kevel.co/v1/site', {
      method: 'GET',
      headers: {
        'X-Adzerk-ApiKey': apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!kevelResponse.ok) {
      const errorText = await kevelResponse.text()
      console.error('Kevel API error:', kevelResponse.status, errorText)
      
      // Update integration status to error
      await supabase
        .from('ad_server_integrations')
        .update({ 
          status: 'error',
          last_sync: new Date().toISOString()
        })
        .eq('id', integrationId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Kevel API', 
          details: `${kevelResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sitesData: KevelApiResponse = await kevelResponse.json()
    console.log(`Found ${sitesData.items?.length || 0} sites`)

    let syncedCount = 0
    let errorCount = 0

    // Process each site and its ad types
    for (const site of sitesData.items || []) {
      console.log(`Processing site: ${site.Title} (ID: ${site.Id})`)
      
      // Process each ad type as a separate ad space
      for (const adType of site.AdTypes || []) {
        if (adType.IsDeleted) continue

        try {
          const adSpaceData = {
            name: `${site.Title} - ${adType.Name}`,
            type: 'display',
            size: `${adType.Width}x${adType.Height}`,
            location: site.Url || site.Title,
            base_price: 2.50, // Default CPM
            price_model: 'cpm',
            currency: 'USD',
            status: 'available',
            company_id: integration.company_id,
          }

          // Check if ad space already exists
          const { data: existingSpace } = await supabase
            .from('ad_spaces')
            .select('id')
            .eq('name', adSpaceData.name)
            .eq('company_id', integration.company_id)
            .single()

          if (existingSpace) {
            // Update existing ad space
            const { error: updateError } = await supabase
              .from('ad_spaces')
              .update(adSpaceData)
              .eq('id', existingSpace.id)

            if (updateError) {
              console.error('Error updating ad space:', updateError)
              errorCount++
            } else {
              syncedCount++
            }
          } else {
            // Insert new ad space
            const { error: insertError } = await supabase
              .from('ad_spaces')
              .insert(adSpaceData)

            if (insertError) {
              console.error('Error inserting ad space:', insertError)
              errorCount++
            } else {
              syncedCount++
            }
          }
        } catch (error) {
          console.error('Error processing ad type:', error)
          errorCount++
        }
      }
    }

    // Update integration status and last sync time
    await supabase
      .from('ad_server_integrations')
      .update({ 
        status: errorCount > 0 ? 'error' : 'active',
        last_sync: new Date().toISOString()
      })
      .eq('id', integrationId)

    console.log(`Sync completed: ${syncedCount} synced, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount, 
        errors: errorCount,
        message: `Successfully synced ${syncedCount} ad spaces from Kevel`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})