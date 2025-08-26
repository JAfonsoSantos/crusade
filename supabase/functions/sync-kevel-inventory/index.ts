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
  const syncStartTime = Date.now();
  
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

    // Get the integration details
    const { data: integration, error: integrationError } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ 
          error: 'Integration not found',
          details: integrationError?.message || 'No integration found with provided ID'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (integration.status === 'paused') {
      return new Response(
        JSON.stringify({ 
          error: 'Integration is paused',
          details: 'Integration sync is temporarily paused'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Allow sync when status is 'active' or recovering from 'error'
    if (integration.status === 'paused') {
      return new Response(
        JSON.stringify({ 
          error: 'Integration is paused',
          details: 'Integration sync is temporarily paused'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    // Proceed for statuses: active, error, inactive (attempt first sync)


    if (integration.provider !== 'kevel') {
      console.error('Invalid provider:', integration.provider)
      return new Response(
        JSON.stringify({ error: 'Invalid provider', details: 'Expected Kevel provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = integration.api_key_encrypted || integration.api_key // In production, decrypt if encrypted
    if (!apiKey) {
      console.error('No API key found for integration')
      return new Response(
        JSON.stringify({ error: 'No API key configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting sync for integration:', integration.name)

    // Fetch sites and campaigns from Kevel
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
      }),
    ])

    if (!sitesResponse.ok) {
      console.error('Failed to fetch sites from Kevel:', sitesResponse.status, sitesResponse.statusText)
      
      await supabase
        .from('ad_server_integrations')
        .update({ 
          status: 'error',
          last_sync: new Date().toISOString()
        })
        .eq('id', integrationId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch sites from Kevel',
          details: `HTTP ${sitesResponse.status}: ${sitesResponse.statusText}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!campaignsResponse.ok) {
      console.error('Failed to fetch campaigns from Kevel:', campaignsResponse.status, campaignsResponse.statusText)
      
      await supabase
        .from('ad_server_integrations')
        .update({ 
          status: 'error',
          last_sync: new Date().toISOString()
        })
        .eq('id', integrationId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch campaigns from Kevel',
          details: `HTTP ${campaignsResponse.status}: ${campaignsResponse.statusText}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sitesData: KevelApiResponse = await sitesResponse.json()
    const campaignsData: KevelApiResponse = await campaignsResponse.json()

    console.log(`Fetched ${sitesData.items?.length || 0} sites and ${campaignsData.items?.length || 0} campaigns from Kevel`)

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
      { Name: 'Large Rectangle', Width: 336, Height: 280 },
      { Name: 'Skyscraper', Width: 160, Height: 600 },
      { Name: 'Wide Skyscraper', Width: 300, Height: 600 },
      { Name: 'Mobile Banner', Width: 320, Height: 50 },
      { Name: 'Mobile Large Banner', Width: 320, Height: 100 }
    ]

    // Process sites and create ad spaces
    for (const site of sitesData.items || []) {
      console.log(`Processing site: ${site.Title}`)
      
      let siteAdUnitsCountedAlready = false

      for (const adSize of commonAdSizes) {
        try {
          const adUnitName = `${site.Title} - ${adSize.Name}`
          let adUnitId = null
          let needsUpdate = false
          let kevelAdUnitCreated = false

          // Check if ad unit already exists for this site and ad size
          const adUnitsResponse = await fetch(`https://api.kevel.co/v1/zone/list?SiteId=${site.Id}`, {
            method: 'GET',
            headers: {
              'X-Adzerk-ApiKey': apiKey,
              'Content-Type': 'application/json',
            }
          })

          if (adUnitsResponse.ok) {
            const adUnitsData = await adUnitsResponse.json()
            
            // Count all existing ad units for this site (only once per site)
            if (!siteAdUnitsCountedAlready) {
              operationDetails.ad_units.existing += adUnitsData.items?.length || 0
              siteAdUnitsCountedAlready = true
            }

            // Find existing ad unit with the same size
            const existingAdUnit = adUnitsData.items?.find((adUnit: any) => 
              adUnit.Width === adSize.Width && adUnit.Height === adSize.Height
            )

            if (existingAdUnit) {
              adUnitId = existingAdUnit.Id
              if (existingAdUnit.Width !== adSize.Width || existingAdUnit.Height !== adSize.Height) {
                needsUpdate = true
              }
              
              operationDetails.ad_units.updated++ // Count as processed
            }
          } else {
            console.warn(`Failed to fetch ad units for site ${site.Id}: ${adUnitsResponse.status}`)
          }

          // Create ad unit in Kevel if it doesn't exist
          if (!adUnitId) {
            // Create the ad unit/zone in Kevel
            const createAdUnitResponse = await fetch(`https://api.kevel.co/v1/site/${site.Id}/zone`, {
              method: 'POST',
              headers: {
                'X-Adzerk-ApiKey': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                Name: adUnitName,
                Width: adSize.Width,
                Height: adSize.Height
              })
            })

            if (createAdUnitResponse.ok) {
              const newAdUnit = await createAdUnitResponse.json()
              adUnitId = newAdUnit.Id
              operationDetails.ad_units.created++
              kevelAdUnitCreated = true
              console.log(`Successfully created Ad Unit: ${adUnitName} (ID: ${adUnitId})`)
            } else {
              console.error(`Failed to create ad unit ${adUnitName}:`, createAdUnitResponse.status, createAdUnitResponse.statusText)
              continue
            }
          } else if (needsUpdate) {
            // Update existing ad unit if needed
            const updateResponse = await fetch(`https://api.kevel.co/v1/zone/${adUnitId}`, {
              method: 'PUT',
              headers: {
                'X-Adzerk-ApiKey': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                Name: adUnitName,
                Width: adSize.Width,
                Height: adSize.Height
              })
            })

            if (!updateResponse.ok) {
              console.error(`Failed to update ad unit ${adUnitName}:`, updateResponse.status)
              continue
            } else {
              console.log(`Successfully updated Ad Unit: ${adUnitName}`)
            }
          } else {
            console.log(`Ad Unit already exists and is up to date: ${adUnitName} (ID: ${adUnitId})`)
          }

          // Create or update ad space in our database
          const adSpaceData = {
            name: adUnitName,
            description: `Ad space for ${site.Title} - ${adSize.Name} (${adSize.Width}x${adSize.Height})`,
            dimensions: `${adSize.Width}x${adSize.Height}`,
            location: `${site.Url} (kevel.co)`,
            type: 'display',
            status: 'active',
            company_id: integration.company_id,
            external_id: adUnitId?.toString(),
            ad_server: 'kevel',
            targeting_criteria: {
              site_id: site.Id,
              site_name: site.Title,
              ad_size: adSize.Name,
              kevel_zone_id: adUnitId
            },
            pricing_model: 'cpm',
            floor_price: 1.00
          }

          // Check if ad space already exists
          const { data: existingSpace } = await supabase
            .from('ad_spaces')
            .select('id')
            .eq('external_id', adUnitId?.toString())
            .eq('ad_server', 'kevel')
            .single()

          if (existingSpace) {
            // Update existing ad space
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
              operationDetails.sites.existing++
              syncedCount++
            }
          } else {
            // Insert new ad space
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

    // Process campaigns and sync them
    for (const kevelCampaign of campaignsData.items || []) {
      if (kevelCampaign.IsDeleted) {
        continue // Skip deleted campaigns
      }

      try {
        const startDate = kevelCampaign.StartDate ? new Date(kevelCampaign.StartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        const endDate = kevelCampaign.EndDate ? new Date(kevelCampaign.EndDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const campaignData = {
          name: kevelCampaign.Name,
          description: `Imported from Kevel (ID: ${kevelCampaign.Id})`,
          start_date: startDate,
          end_date: endDate,
          budget: kevelCampaign.Price || null,
          currency: 'USD',
          status: kevelCampaign.IsActive ? 'active' : 'paused',
          company_id: integration.company_id,
          external_id: kevelCampaign.Id.toString(),
          ad_server: 'kevel',
          targeting_criteria: {
            kevel_campaign_id: kevelCampaign.Id,
            advertiser_id: kevelCampaign.AdvertiserId
          }
        }

        // Check if campaign already exists
        const { data: existingCampaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('external_id', kevelCampaign.Id.toString())
          .eq('ad_server', 'kevel')
          .single()

        if (existingCampaign) {
          // Update existing campaign
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({
              name: campaignData.name,
              status: campaignData.status,
              budget: campaignData.budget,
              start_date: campaignData.start_date,
              end_date: campaignData.end_date
            })
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

    // Sync flights for each campaign
    console.log('Starting flight sync...')
    for (const kevelCampaign of campaignsData.items || []) {
      if (kevelCampaign.IsDeleted) {
        continue // Skip deleted campaigns
      }

      try {
        // Find the local campaign
        const { data: localCampaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id')
          .eq('external_id', kevelCampaign.Id.toString())
          .eq('ad_server', 'kevel')
          .single()

        if (campaignError) {
          console.error(`Error finding local campaign for Kevel campaign ${kevelCampaign.Id}:`, campaignError)
          continue
        }

        if (localCampaign) {
          console.log(`Syncing flights for campaign: ${kevelCampaign.Name}`)

          // Fetch flights for this campaign from Kevel
          const flightsResponse = await fetch(`https://api.kevel.co/v1/flight`, {
            method: 'GET',
            headers: {
              'X-Adzerk-ApiKey': apiKey,
              'Content-Type': 'application/json',
            }
          })

          if (!flightsResponse.ok) {
            console.error(`Failed to fetch flights from Kevel for campaign ${kevelCampaign.Id}:`, flightsResponse.status)
            continue
          }

          const allFlights = await flightsResponse.json()
          
          // Filter flights for this specific campaign
          const campaignFlights = allFlights.items?.filter((flight: any) => 
            flight.CampaignId === kevelCampaign.Id
          ) || []

          console.log(`Found ${campaignFlights.length} flights for campaign ${kevelCampaign.Name}`)

          for (const kevelFlight of campaignFlights) {
            if (kevelFlight.IsDeleted) {
              continue // Skip deleted flights
            }

            try {
              const flightData = {
                campaign_id: localCampaign.id,
                name: kevelFlight.Name || `Flight ${kevelFlight.Id}`,
                description: `Imported from Kevel (ID: ${kevelFlight.Id})`,
                start_date: kevelFlight.StartDate ? kevelFlight.StartDate.split('T')[0] : kevelCampaign.StartDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                end_date: kevelFlight.EndDate ? kevelFlight.EndDate.split('T')[0] : kevelCampaign.EndDate?.split('T')[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                budget: kevelFlight.Price || null,
                currency: 'USD',
                status: kevelFlight.IsActive ? 'active' : 'paused',
                priority: kevelFlight.Priority || 1,
                external_id: kevelFlight.Id.toString(),
                ad_server: 'kevel',
                targeting_criteria: {
                  kevel_flight_id: kevelFlight.Id,
                  impression_cap: kevelFlight.CapType || null,
                  daily_cap: kevelFlight.DailyCap || null
                }
              }

              // Check if flight already exists
              const { data: existingFlight } = await supabase
                .from('flights')
                .select('id')
                .eq('external_id', kevelFlight.Id.toString())
                .eq('campaign_id', localCampaign.id)
                .single()

              if (existingFlight) {
                // Update existing flight
                const { error: updateError } = await supabase
                  .from('flights')
                  .update({
                    status: kevelFlight.IsActive ? 'active' : 'paused',
                    budget: kevelFlight.Price || null,
                    priority: kevelFlight.Priority || 1
                  })
                  .eq('id', existingFlight.id)

                if (updateError) {
                  console.error(`Error updating flight ${kevelFlight.Name}:`, updateError)
                  errorCount++
                } else {
                  syncedCount++
                }
              } else {
                // Insert new flight
                const { error: insertError } = await supabase
                  .from('flights')
                  .insert(flightData)

                if (insertError) {
                  console.error(`Error inserting flight ${kevelFlight.Name}:`, insertError)
                  errorCount++
                } else {
                  syncedCount++
                }
              }
            } catch (error) {
              console.error(`Error syncing flight ${kevelFlight.Id}:`, error)
              errorCount++
            }
          }
        }
      } catch (error) {
        console.error(`Error processing flights for campaign ${kevelCampaign.Id}:`, error)
        errorCount++
      }
    }

    // Campaign cleanup - remove campaigns that no longer exist in Kevel
    console.log('Checking for campaigns to clean up...')
    try {
      // Get all campaigns that were imported from Kevel for this company
      const { data: localCampaigns, error: localCampaignsError } = await supabase
        .from('campaigns')
        .select('id, name, description')
        .eq('company_id', integration.company_id)
        .like('description', '%Imported from Kevel%')

      if (localCampaignsError) {
        console.error('Error fetching local campaigns:', localCampaignsError)
      } else if (localCampaigns && localCampaigns.length > 0) {
        console.log(`Found ${localCampaigns.length} local campaigns imported from Kevel`)
        
        // Get ALL Kevel campaign IDs (both active and deleted)
        const allKevelCampaignIds = (campaignsData.items || []).map(campaign => campaign.Id)
        console.log('All Kevel campaign IDs from API:', allKevelCampaignIds)
        
        // Get only active (non-deleted) Kevel campaign IDs
        const activeKevelIds = (campaignsData.items || [])
          .filter(campaign => !campaign.IsDeleted)
          .map(campaign => campaign.Id)
        console.log('Active Kevel campaign IDs:', activeKevelIds)

        // Find campaigns that no longer exist in Kevel OR are marked as deleted
        const campaignsToDelete = localCampaigns.filter(campaign => {
          const match = campaign.description?.match(/Imported from Kevel \(ID: (\d+)\)/)
          const kevelId = match ? parseInt(match[1]) : null
          
          if (!kevelId) {
            console.log(`No Kevel ID found in description for campaign: ${campaign.name}`)
            return false
          }
          
          const existsInKevel = allKevelCampaignIds.includes(kevelId)
          const isActiveInKevel = activeKevelIds.includes(kevelId)
          
          console.log(`Campaign ${campaign.name} (Kevel ID: ${kevelId}): exists=${existsInKevel}, active=${isActiveInKevel}`)
          
          // Delete if it doesn't exist in Kevel at all OR if it exists but is marked as deleted
          return !existsInKevel || !isActiveInKevel
        })

        console.log(`Found ${campaignsToDelete.length} campaigns to delete`)

        // Delete campaigns that no longer exist in Kevel
        for (const campaign of campaignsToDelete) {
          try {
            console.log(`Deleting campaign: ${campaign.name} (ID: ${campaign.id})`)
            
            // First delete any related campaign_ad_spaces
            await supabase
              .from('campaign_ad_spaces')
              .delete()
              .eq('campaign_id', campaign.id)

            // Then delete the campaign
            const { error: deleteError } = await supabase
              .from('campaigns')
              .delete()
              .eq('id', campaign.id)

            if (deleteError) {
              console.error(`Error deleting campaign ${campaign.name}:`, deleteError)
              operationDetails.campaigns.errors.push(`Failed to delete ${campaign.name}`)
              errorCount++
            } else {
              console.log(`Successfully deleted campaign: ${campaign.name}`)
              operationDetails.campaigns.deleted = (operationDetails.campaigns.deleted || 0) + 1
              syncedCount++
            }
          } catch (error) {
            console.error(`Error deleting campaign ${campaign.name}:`, error)
            operationDetails.campaigns.errors.push(`Failed to delete ${campaign.name}: ${error.message}`)
            errorCount++
          }
        }
      }
    } catch (error) {
      console.error('Error in campaign cleanup:', error)
      errorCount++
    }

    // Save sync history
    const syncEndTime = Date.now()
    const syncDuration = syncEndTime - syncStartTime
    
    await supabase
      .from('integration_sync_history')
      .insert({
        integration_id: integrationId,
        sync_timestamp: new Date().toISOString(),
        status: errorCount > 0 ? 'completed_with_errors' : 'completed',
        synced_count: syncedCount,
        errors_count: errorCount,
        operations: operationDetails,
        duration_ms: syncDuration
      })

    // Update integration status and last sync time
    await supabase
      .from('ad_server_integrations')
      .update({ 
        status: errorCount > 0 ? 'error' : 'active',
        last_sync: new Date().toISOString()
      })
      .eq('id', integrationId);

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