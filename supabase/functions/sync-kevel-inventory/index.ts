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
    
    // Check if integration exists and is active
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
    
    // Check if integration is paused
    if (integration.status === 'paused') {
      console.log(`Integration ${integrationId} is paused, skipping sync`)
      return new Response(
        JSON.stringify({ 
          message: 'Integration is paused, sync skipped',
          synced: 0,
          errors: 0,
          operations: {}
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Check if integration is active
    if (integration.status !== 'active') {
      console.log(`Integration ${integrationId} is not active (status: ${integration.status}), skipping sync`)
      return new Response(
        JSON.stringify({ 
          error: `Integration is ${integration.status}, cannot sync`,
          synced: 0,
          errors: 1,
          operations: {}
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
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
    // Kevel Hierarchy: NETWORK (You) → ADVERTISER → CAMPAIGN → FLIGHT → AD
    // Sites represent platforms (iOS, Android, Web) - where ads appear
    // Ad Units are specific placements within sites
    console.log('Syncing ad spaces and creating Ad Units in Kevel...')
    for (const site of sitesData.items || []) {
      console.log(`Processing site: ${site.Title} (ID: ${site.Id}) - Platform level in Kevel hierarchy`)
      
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
            // We can't verify existing ad units, but we'll still create ad spaces in our database
            console.log(`Could not verify existing ad units, but will still create ad space in Crusade for ${adUnitName}`)
          }
          
          // Try to create Ad Unit in Kevel if it doesn't exist
          let kevelAdUnitCreated = false
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
              kevelAdUnitCreated = true
              console.log(`Successfully created Ad Unit: ${adUnitName} (ID: ${adUnitId})`)
            } else {
              const errorText = await createAdUnitResponse.text()
              console.log(`Could not create Ad Unit in Kevel: ${adUnitName} - ${createAdUnitResponse.status}: ${errorText}`)
              // Don't count as error - Kevel API issues don't affect our ad spaces
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
              console.log(`Could not update Ad Unit in Kevel: ${adUnitName} - ${updateResponse.status}: ${errorText}`)
              // Don't count as error - Kevel API issues don't affect our ad spaces
            } else {
              console.log(`Successfully updated Ad Unit: ${adUnitName}`)
            }
          } else {
            console.log(`Ad Unit already exists and is up to date: ${adUnitName}`)
          }

          // Create/update ad space in our database (Crusade inventory)
          // This maps Kevel's Ad Units to our unified ad_spaces table
          // Format: "Platform - AdSize" (e.g., "iOS - Banner", "Web - Leaderboard")
          console.log(`Creating/updating ad space in Crusade database: ${adUnitName}`)
          const adSpaceData = {
            name: adUnitName, // Follows Kevel naming: Site.Title - AdSize.Name
            type: 'display',
            size: `${adSize.Width}x${adSize.Height}`, // Standard IAB sizes
            location: site.Url || site.Title, // Platform identifier (iOS, Android, Web)
            base_price: 2.50, // Default CPM price
            price_model: 'cpm',
            currency: 'USD',
            status: 'available',
            company_id: integration.company_id,
          }

          console.log(`Ad space data:`, adSpaceData)

          const { data: existingSpace } = await supabase
            .from('ad_spaces')
            .select('id')
            .eq('name', adSpaceData.name)
            .eq('company_id', integration.company_id)
            .single()

          if (existingSpace) {
            // Ad space already exists - check if it needs updating
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
          // Update existing campaign with latest status from Kevel
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({
              status: kevelCampaign.IsActive ? 'active' : 'paused',
              budget: kevelCampaign.Price || 1000,
              start_date: startDate,
              end_date: endDate
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

    // Sync Flights for each campaign
    console.log('Syncing flights for each campaign...')
    console.log(`Found ${campaignsData.items?.length || 0} campaigns to process for flights`)
    
    for (const kevelCampaign of campaignsData.items || []) {
      if (kevelCampaign.IsDeleted) {
        console.log(`Skipping deleted campaign: ${kevelCampaign.Name}`)
        continue
      }
      
      console.log(`Processing flights for campaign: ${kevelCampaign.Name} (ID: ${kevelCampaign.Id})`)
      
      try {
        // Get the local campaign ID
        const { data: localCampaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id')
          .eq('name', kevelCampaign.Name)
          .eq('company_id', integration.company_id)
          .single()

        if (campaignError) {
          console.error(`Error finding local campaign for ${kevelCampaign.Name}:`, campaignError)
          continue
        }

        if (localCampaign) {
          console.log(`Found local campaign ID: ${localCampaign.id} for ${kevelCampaign.Name}`)
          
          // Fetch flights for this campaign from Kevel
          console.log(`Fetching flights from Kevel for campaign ${kevelCampaign.Id}...`)
          const flightsResponse = await fetch(`https://api.kevel.co/v1/flight`, {
            method: 'GET',
            headers: {
              'X-Adzerk-ApiKey': apiKey,
              'Content-Type': 'application/json',
            }
          })

          console.log(`Kevel flights API response status: ${flightsResponse.status}`)
          
          if (!flightsResponse.ok) {
            const errorText = await flightsResponse.text()
            console.error(`Failed to fetch flights from Kevel: ${flightsResponse.status} - ${errorText}`)
            continue
          }
          
          const flightsData = await flightsResponse.json()
          console.log(`Fetched ${flightsData.items?.length || 0} total flights from Kevel`)
          
          // Filter flights for this specific campaign
          const campaignFlights = (flightsData.items || []).filter(flight => 
            flight.CampaignId === kevelCampaign.Id
          )
          console.log(`Found ${campaignFlights.length} flights for campaign ${kevelCampaign.Name} (ID: ${kevelCampaign.Id})`)
          
          for (const kevelFlight of campaignFlights) {
            if (kevelFlight.IsDeleted) {
              console.log(`Skipping deleted flight: ${kevelFlight.Name || kevelFlight.Id}`)
              continue
            }
            
            console.log(`Processing flight: ${kevelFlight.Name || kevelFlight.Id} (ID: ${kevelFlight.Id})`)
            
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
                  console.error('Error updating flight:', updateError)
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
                  console.error('Error inserting flight:', insertError)
                  errorCount++
                } else {
                  syncedCount++
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error syncing flights for campaign ${kevelCampaign.Name}:`, error)
        errorCount++
      }
    }
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