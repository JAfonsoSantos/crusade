import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KevelSite {
  Id: number
  Title: string
  Url: string
}

interface KevelAdSize {
  Id: number
  Name: string
  Width: number
  Height: number
  IsDeleted: boolean
}

interface KevelCampaign {
  Id: number
  Name: string
  StartDate: string
  EndDate: string
  IsActive: boolean
  IsDeleted: boolean
  Price: number
  AdvertiserId: number
}

interface KevelApiResponse {
  items: KevelSite[] | KevelAdSize[] | KevelCampaign[]
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

    console.log('Fetching sites and campaigns from Kevel API...')

    // Fetch both sites and campaigns from Kevel Management API
    const [sitesResponse, campaignsResponse] = await Promise.all([
      fetch('https://api.kevel.co/v1/site', {
        method: 'GET',
        headers: {
          'X-Adzerk-ApiKey': apiKey,
          'Content-Type': 'application/json',
        },
      }),
      fetch('https://api.kevel.co/v1/campaign', {
        method: 'GET',
        headers: {
          'X-Adzerk-ApiKey': apiKey,
          'Content-Type': 'application/json',
        },
      })
    ])

    if (!sitesResponse.ok) {
      const errorText = await sitesResponse.text()
      console.error('Kevel Sites API error:', sitesResponse.status, errorText)
      
      await supabase
        .from('ad_server_integrations')
        .update({ 
          status: 'error',
          last_sync: new Date().toISOString()
        })
        .eq('id', integrationId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch sites from Kevel API', 
          details: `${sitesResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text()
      console.error('Kevel Campaigns API error:', campaignsResponse.status, errorText)
      
      await supabase
        .from('ad_server_integrations')
        .update({ 
          status: 'error',
          last_sync: new Date().toISOString()
        })
        .eq('id', integrationId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch campaigns from Kevel API', 
          details: `${campaignsResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sitesData: { items: KevelSite[] } = await sitesResponse.json()
    const campaignsData: { items: KevelCampaign[] } = await campaignsResponse.json()
    
    let syncedCount = 0
    let errorCount = 0
    
    // Track detailed operations by category
    const operationDetails = {
      campaigns: { created: 0, updated: 0, existing: 0, errors: [] as string[] },
      ad_units: { created: 0, updated: 0, existing: 0, errors: [] as string[] },
      sites: { created: 0, updated: 0, existing: 0, errors: [] as string[] }
    }

    // For now, let's create ad spaces with common sizes instead of fetching from API
    const commonAdSizes = [
      { Name: 'Banner', Width: 728, Height: 90 },
      { Name: 'Leaderboard', Width: 728, Height: 90 },
      { Name: 'Medium Rectangle', Width: 300, Height: 250 },
      { Name: 'Skyscraper', Width: 160, Height: 600 },
      { Name: 'Mobile Banner', Width: 320, Height: 50 },
      { Name: 'Square', Width: 250, Height: 250 }
    ]

    // Sync Ad Spaces and create Ad Units in Kevel
    console.log('Syncing ad spaces and creating Ad Units in Kevel...')
    for (const site of sitesData.items || []) {
      console.log(`Processing site: ${site.Title} (ID: ${site.Id})`)
      
      // Count existing ad units for this site (only once per site)
      let siteAdUnitsCountedAlready = false
      
      for (const adSize of commonAdSizes) {
        try {
          // First, check if Ad Unit already exists in Kevel with exact match
          const adUnitName = `${site.Title} - ${adSize.Name}`
          
          console.log(`Checking for existing Ad Unit: ${adUnitName}`)
          
          // Check if Ad Unit already exists in Kevel using zone/list endpoint
          const adUnitsResponse = await fetch(`https://api.kevel.co/v1/zone/list`, {
            method: 'POST',
            headers: {
              'X-Adzerk-ApiKey': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              SiteId: site.Id
            })
          })
          
          let adUnitId = null
          let needsUpdate = false
          
          if (adUnitsResponse.ok) {
            const adUnitsData = await adUnitsResponse.json()
            
            // Count all existing ad units for this site (only once per site)
            if (!siteAdUnitsCountedAlready) {
              operationDetails.ad_units.existing += adUnitsData.items?.length || 0
              siteAdUnitsCountedAlready = true
            }
            
            const existingAdUnit = adUnitsData.items?.find((unit: any) => 
              unit.Name === adUnitName || 
              unit.Name.toLowerCase() === adUnitName.toLowerCase()
            )
            
            if (existingAdUnit) {
              adUnitId = existingAdUnit.Id
              console.log(`Found existing Ad Unit: ${adUnitName} (ID: ${adUnitId})`)
              
              // Check if dimensions need updating
              if (existingAdUnit.Width !== adSize.Width || existingAdUnit.Height !== adSize.Height) {
                needsUpdate = true
                console.log(`Ad Unit dimensions need updating: ${existingAdUnit.Width}x${existingAdUnit.Height} -> ${adSize.Width}x${adSize.Height}`)
              }
              
              operationDetails.ad_units.updated++ // Count as processed
            }
          } else {
            console.log(`Could not fetch existing ad units for site ${site.Id}: ${adUnitsResponse.status}`)
            // Skip creating ad unit if we can't verify existing ones to avoid duplicates
            console.log(`Skipping ad unit creation for ${adUnitName} due to API access issues`)
            continue
          }
          
          // Only create Ad Unit in Kevel if it doesn't exist
          if (!adUnitId) {
            console.log(`Creating new Ad Unit in Kevel: ${adUnitName}`)
            const createAdUnitResponse = await fetch(`https://api.kevel.co/v1/site/${site.Id}/zone`, {
              method: 'POST',
              headers: {
                'X-Adzerk-ApiKey': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                Name: adUnitName,
                SiteId: site.Id,
                IsDeleted: false,
                Width: adSize.Width,
                Height: adSize.Height
              }),
            })
            
            if (createAdUnitResponse.ok) {
              const newAdUnit = await createAdUnitResponse.json()
              adUnitId = newAdUnit.Id
              operationDetails.ad_units.created++
              console.log(`Successfully created Ad Unit: ${adUnitName} (ID: ${adUnitId})`)
            } else {
              const errorText = await createAdUnitResponse.text()
              const errorMsg = `Failed to create Ad Unit: ${adUnitName} - ${createAdUnitResponse.status}: ${errorText}`
              operationDetails.ad_units.errors.push(errorMsg)
              console.error(errorMsg)
              continue // Skip to next ad size if creation failed
            }
          } else if (needsUpdate) {
            // Update existing Ad Unit if dimensions changed
            console.log(`Updating Ad Unit dimensions: ${adUnitName}`)
            const updateResponse = await fetch(`https://api.kevel.co/v1/zone/${adUnitId}`, {
              method: 'PUT',
              headers: {
                'X-Adzerk-ApiKey': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                Name: adUnitName,
                SiteId: site.Id,
                IsDeleted: false,
                Width: adSize.Width,
                Height: adSize.Height
              }),
            })
            
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text()
              const errorMsg = `Failed to update Ad Unit: ${adUnitName} - ${updateResponse.status}: ${errorText}`
              operationDetails.ad_units.errors.push(errorMsg)
              console.error(errorMsg)
            } else {
              console.log(`Successfully updated Ad Unit: ${adUnitName}`)
            }
          } else {
            console.log(`Ad Unit already exists and is up to date: ${adUnitName}`)
          }

          // Create/update ad space in our database
          const adSpaceData = {
            name: adUnitName,
            type: 'display',
            size: `${adSize.Width}x${adSize.Height}`,
            location: site.Url || site.Title,
            base_price: 2.50,
            price_model: 'cpm',
            currency: 'USD',
            status: 'available',
            company_id: integration.company_id,
          }

          const { data: existingSpace } = await supabase
            .from('ad_spaces')
            .select('id')
            .eq('name', adSpaceData.name)
            .eq('company_id', integration.company_id)
            .single()

          if (existingSpace) {
            const { error: updateError } = await supabase
              .from('ad_spaces')
              .update(adSpaceData)
              .eq('id', existingSpace.id)

            if (updateError) {
              const errorMsg = `Error updating ad space: ${adSpaceData.name}`
              operationDetails.sites.errors.push(errorMsg)
              console.error('Error updating ad space:', updateError)
              errorCount++
            } else {
              operationDetails.sites.updated++
              syncedCount++
            }
          } else {
            const { error: insertError } = await supabase
              .from('ad_spaces')
              .insert(adSpaceData)

            if (insertError) {
              const errorMsg = `Error inserting ad space: ${adSpaceData.name}`
              operationDetails.sites.errors.push(errorMsg)
              console.error('Error inserting ad space:', insertError)
              errorCount++
            } else {
              operationDetails.sites.created++
              syncedCount++
            }
          }
        } catch (error) {
          const errorMsg = `Error processing ad space for ${site.Title} - ${adSize.Name}: ${error.message}`
          operationDetails.sites.errors.push(errorMsg)
          console.error('Error processing ad size:', error)
          errorCount++
        }
      }
    }

    // Sync Campaigns from Kevel
    console.log('Syncing campaigns from Kevel...')
    for (const kevelCampaign of campaignsData.items || []) {
      if (kevelCampaign.IsDeleted) continue
      
      console.log(`Processing campaign: ${kevelCampaign.Name} (ID: ${kevelCampaign.Id})`)
      
      try {
        // Safely handle date fields that might be undefined
        const startDate = kevelCampaign.StartDate ? kevelCampaign.StartDate.split('T')[0] : new Date().toISOString().split('T')[0]
        const endDate = kevelCampaign.EndDate ? kevelCampaign.EndDate.split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to 7 days from now
        
        const campaignData = {
          name: kevelCampaign.Name,
          description: `Imported from Kevel (ID: ${kevelCampaign.Id})`,
          start_date: startDate,
          end_date: endDate,
          budget: kevelCampaign.Price || 1000, // Default budget if not provided
          currency: 'USD',
          status: kevelCampaign.IsActive ? 'active' : 'paused',
          company_id: integration.company_id,
          // Don't set created_by for synced campaigns - it requires a valid user ID
        }

        // Check if campaign already exists (by name and company)
        const { data: existingCampaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('name', campaignData.name)
          .eq('company_id', integration.company_id)
          .single()

        if (existingCampaign) {
          // Update existing campaign
          const { error: updateError } = await supabase
            .from('campaigns')
            .update(campaignData)
            .eq('id', existingCampaign.id)

          if (updateError) {
            const errorMsg = `Error updating campaign: ${campaignData.name}`
            operationDetails.campaigns.errors.push(errorMsg)
            console.error('Error updating campaign:', updateError)
            errorCount++
          } else {
            operationDetails.campaigns.updated++
            syncedCount++
          }
        } else {
          // Insert new campaign
          const { error: insertError } = await supabase
            .from('campaigns')
            .insert(campaignData)

          if (insertError) {
            const errorMsg = `Error inserting campaign: ${campaignData.name}`
            operationDetails.campaigns.errors.push(errorMsg)
            console.error('Error inserting campaign:', insertError)
            errorCount++
          } else {
            operationDetails.campaigns.created++
            syncedCount++
          }
        }
      } catch (error) {
        const errorMsg = `Error processing campaign ${kevelCampaign.Name}: ${error.message}`
        operationDetails.campaigns.errors.push(errorMsg)
        console.error('Error processing campaign:', error)
        errorCount++
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
        operations: operationDetails,
        message: `Successfully synced ${syncedCount} items from Kevel${errorCount > 0 ? ` with ${errorCount} errors` : ''}`
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