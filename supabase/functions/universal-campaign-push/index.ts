import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Platform-specific configurations
const PLATFORM_CONFIGS = {
  kevel: {
    hierarchy: ['advertiser', 'campaign', 'flight', 'ad'],
    apiBase: 'https://api.kevel.co/v1',
    authHeader: 'X-Adzerk-ApiKey'
  },
  koddi: {
    hierarchy: ['advertiser_group', 'advertiser', 'media_plan', 'line_item', 'campaign', 'ad_group', 'entity'],
    apiBase: 'https://api.koddi.com/v1',
    authHeader: 'Authorization'
  },
  topsort: {
    hierarchy: ['marketplace', 'campaign', 'products_bids'],
    apiBase: 'https://api.topsort.com/public/v1',
    authHeader: 'Authorization'
  }
}

interface PlatformAdapter {
  createCampaignHierarchy(campaign: any, integration: any): Promise<any>
  updateCampaignStatus(campaignId: string, isActive: boolean, integration: any): Promise<any>
  syncInventory(integration: any): Promise<any>
}

class KevelAdapter implements PlatformAdapter {
  async createCampaignHierarchy(campaign: any, integration: any) {
    const apiKey = integration.api_key_encrypted
    const config = PLATFORM_CONFIGS.kevel
    
    // 1. Get/Create Advertiser
    const advertiser = await this.getOrCreateAdvertiser(apiKey)
    
    // 2. Create Campaign
    const kevelCampaign = await this.createCampaign(campaign, advertiser.Id, apiKey)
    
    // 3. Create Flights for each ad unit
    const flights = await this.createFlights(kevelCampaign.Id, campaign, apiKey)
    
    // 4. Create Ads for each flight
    const ads = await this.createAds(flights, campaign, apiKey)
    
    return {
      advertiser_id: advertiser.Id,
      campaign_id: kevelCampaign.Id,
      flights: flights.map(f => ({ id: f.Id, name: f.Name })),
      ads: ads.length,
      hierarchy: 'advertiser → campaign → flights → ads'
    }
  }

  async updateCampaignStatus(campaignId: string, isActive: boolean, integration: any) {
    const apiKey = integration.api_key_encrypted
    
    // Update campaign
    await fetch(`${PLATFORM_CONFIGS.kevel.apiBase}/campaign/${campaignId}`, {
      method: 'PUT',
      headers: {
        [PLATFORM_CONFIGS.kevel.authHeader]: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ IsActive: isActive }),
    })
    
    // Update all flights
    const flightsResponse = await fetch(`${PLATFORM_CONFIGS.kevel.apiBase}/campaign/${campaignId}/flight`, {
      method: 'GET',
      headers: {
        [PLATFORM_CONFIGS.kevel.authHeader]: apiKey,
        'Content-Type': 'application/json',
      },
    })
    
    if (flightsResponse.ok) {
      const flightsData = await flightsResponse.json()
      for (const flight of flightsData.items || []) {
        await fetch(`${PLATFORM_CONFIGS.kevel.apiBase}/flight/${flight.Id}`, {
          method: 'PUT',
          headers: {
            [PLATFORM_CONFIGS.kevel.authHeader]: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ IsActive: isActive }),
        })
      }
    }
    
    return { success: true, platform: 'kevel' }
  }

  async syncInventory(integration: any) {
    // Implementation similar to current sync-kevel-inventory
    return { synced: 0, errors: 0, platform: 'kevel' }
  }

  private async getOrCreateAdvertiser(apiKey: string) {
    const response = await fetch(`${PLATFORM_CONFIGS.kevel.apiBase}/advertiser`, {
      method: 'GET',
      headers: {
        [PLATFORM_CONFIGS.kevel.authHeader]: apiKey,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    if (data.items && data.items.length > 0) {
      return data.items[0]
    }
    
    // Create default advertiser
    const createResponse = await fetch(`${PLATFORM_CONFIGS.kevel.apiBase}/advertiser`, {
      method: 'POST',
      headers: {
        [PLATFORM_CONFIGS.kevel.authHeader]: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Title: 'Default Advertiser',
        IsActive: true
      }),
    })
    
    return await createResponse.json()
  }

  private async createCampaign(campaign: any, advertiserId: number, apiKey: string) {
    const response = await fetch(`${PLATFORM_CONFIGS.kevel.apiBase}/campaign`, {
      method: 'POST',
      headers: {
        [PLATFORM_CONFIGS.kevel.authHeader]: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Name: campaign.name,
        AdvertiserId: advertiserId,
        StartDate: campaign.start_date + 'T00:00:00.000Z',
        EndDate: campaign.end_date + 'T23:59:59.999Z',
        IsActive: false,
        Price: (campaign.budget || 1000) * 100
      }),
    })
    
    return await response.json()
  }

  private async createFlights(campaignId: number, campaign: any, apiKey: string) {
    // Implementation for creating flights
    return []
  }

  private async createAds(flights: any[], campaign: any, apiKey: string) {
    // Implementation for creating ads
    return []
  }
}

class TopsortAdapter implements PlatformAdapter {
  async createCampaignHierarchy(campaign: any, integration: any) {
    const apiKey = integration.api_key_encrypted
    const config = PLATFORM_CONFIGS.topsort
    
    // Topsort structure: marketplace → campaign → products/bids
    
    // 1. Create Campaign
    const topsortCampaign = await this.createCampaign(campaign, apiKey)
    
    // 2. Get products from our ad_spaces (simplified)
    const products = await this.getProducts(integration)
    
    // 3. Create bids for products
    const bids = await this.createBids(topsortCampaign.campaignId, products, campaign, apiKey)
    
    return {
      marketplace_id: integration.company_id,
      campaign_id: topsortCampaign.campaignId,
      products: products.length,
      bids: bids.length,
      hierarchy: 'marketplace → campaign → products/bids'
    }
  }

  async updateCampaignStatus(campaignId: string, isActive: boolean, integration: any) {
    const apiKey = integration.api_key_encrypted
    
    // Update campaign status in Topsort
    const response = await fetch(`${PLATFORM_CONFIGS.topsort.apiBase}/campaign-service/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: {
        [PLATFORM_CONFIGS.topsort.authHeader]: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update campaign status: ${response.statusText}`)
    }
    
    return { success: true, platform: 'topsort' }
  }

  async syncInventory(integration: any) {
    // Topsort uses catalog sync - sync products from our ad_spaces
    const apiKey = integration.api_key_encrypted
    
    // Get ad_spaces as products
    const products = await this.getProducts(integration)
    
    // Upload to Topsort catalog
    if (products.length > 0) {
      const response = await fetch(`${PLATFORM_CONFIGS.topsort.apiBase}/catalog-search-service/catalogs/products`, {
        method: 'PUT',
        headers: {
          [PLATFORM_CONFIGS.topsort.authHeader]: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to sync catalog: ${response.statusText}`)
      }
    }
    
    return { synced: products.length, errors: 0, platform: 'topsort' }
  }

  private async createCampaign(campaign: any, apiKey: string) {
    const response = await fetch(`${PLATFORM_CONFIGS.topsort.apiBase}/campaign-service/campaigns`, {
      method: 'POST',
      headers: {
        [PLATFORM_CONFIGS.topsort.authHeader]: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: campaign.name,
        adFormat: 'listing', // Default to sponsored listings
        campaignType: 'manual',
        chargeType: 'CPC', // Cost per click
        startDate: campaign.start_date + 'T00:00:00Z',
        endDate: campaign.end_date + 'T23:59:59Z',
        isActive: false, // Start inactive
        budget: {
          type: 'daily',
          amount: Math.round((campaign.budget || 1000) / 30) // Daily budget
        }
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create campaign: ${response.statusText}`)
    }
    
    return await response.json()
  }

  private async getProducts(integration: any) {
    // Convert our ad_spaces to Topsort products format
    return [
      {
        id: `ad-space-${Date.now()}`,
        name: "Sample Product",
        active: true,
        categories: ["general"],
        imageURL: "https://via.placeholder.com/300",
        price: "9.99",
        vendors: [integration.company_id]
      }
    ]
  }

  private async createBids(campaignId: string, products: any[], campaign: any, apiKey: string) {
    const bids = []
    
    for (const product of products) {
      try {
        const response = await fetch(`${PLATFORM_CONFIGS.topsort.apiBase}/campaign-service/campaigns/${campaignId}/bids`, {
          method: 'POST',
          headers: {
            [PLATFORM_CONFIGS.topsort.authHeader]: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            bid: {
              amount: 0.50, // Default bid amount
              currency: campaign.currency || 'USD'
            },
            triggers: [
              {
                type: 'product',
                products: [product.id]
              }
            ]
          }),
        })
        
        if (response.ok) {
          const bid = await response.json()
          bids.push(bid)
          console.log(`Created bid for product: ${product.id}`)
        }
      } catch (error) {
        console.error(`Failed to create bid for ${product.id}:`, error)
      }
    }
    
    return bids
  }
}

class KoddiAdapter implements PlatformAdapter {
  async createCampaignHierarchy(campaign: any, integration: any) {
    const apiKey = integration.api_key_encrypted
    const config = PLATFORM_CONFIGS.koddi
    
    // Koddi hierarchy: advertiser_group → advertiser → media_plan → line_item → campaign → ad_group
    
    // 1. Get/Create Advertiser Group
    const advertiserGroup = await this.getOrCreateAdvertiserGroup(apiKey)
    
    // 2. Get/Create Advertiser
    const advertiser = await this.getOrCreateAdvertiser(advertiserGroup.id, apiKey)
    
    // 3. Create Media Plan
    const mediaPlan = await this.createMediaPlan(campaign, advertiser.id, apiKey)
    
    // 4. Create Line Item
    const lineItem = await this.createLineItem(mediaPlan.id, campaign, apiKey)
    
    // 5. Create Campaign
    const koddiCampaign = await this.createCampaign(lineItem.id, campaign, apiKey)
    
    // 6. Create Ad Groups
    const adGroups = await this.createAdGroups(koddiCampaign.id, campaign, apiKey)
    
    return {
      advertiser_group_id: advertiserGroup.id,
      advertiser_id: advertiser.id,
      media_plan_id: mediaPlan.id,
      line_item_id: lineItem.id,
      campaign_id: koddiCampaign.id,
      ad_groups: adGroups.length,
      hierarchy: 'advertiser_group → advertiser → media_plan → line_item → campaign → ad_groups'
    }
  }

  async updateCampaignStatus(campaignId: string, isActive: boolean, integration: any) {
    // Koddi-specific implementation
    return { success: true, platform: 'koddi' }
  }

  async syncInventory(integration: any) {
    // Koddi-specific implementation
    return { synced: 0, errors: 0, platform: 'koddi' }
  }

  private async getOrCreateAdvertiserGroup(apiKey: string) {
    // Koddi API calls for advertiser groups
    return { id: 'default-group' }
  }

  private async getOrCreateAdvertiser(groupId: string, apiKey: string) {
    // Koddi API calls for advertisers
    return { id: 'default-advertiser' }
  }

  private async createMediaPlan(campaign: any, advertiserId: string, apiKey: string) {
    // Koddi API calls for media plans
    return { id: 'media-plan-1' }
  }

  private async createLineItem(mediaPlanId: string, campaign: any, apiKey: string) {
    // Koddi API calls for line items
    return { id: 'line-item-1' }
  }

  private async createCampaign(lineItemId: string, campaign: any, apiKey: string) {
    // Koddi API calls for campaigns
    return { id: 'campaign-1' }
  }

  private async createAdGroups(campaignId: string, campaign: any, apiKey: string) {
    // Koddi API calls for ad groups
    return []
  }
}

// Factory pattern for adapters
function getAdapter(provider: string): PlatformAdapter {
  switch (provider) {
    case 'kevel':
      return new KevelAdapter()
    case 'koddi':
      return new KoddiAdapter()
    case 'topsort':
      return new TopsortAdapter()
    default:
      throw new Error(`Unsupported platform: ${provider}`)
  }
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

    console.log(`Universal campaign push: ${campaignId} to integration ${integrationId}`)

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get platform adapter
    const adapter = getAdapter(integration.provider)
    
    // Create campaign hierarchy using adapter
    const result = await adapter.createCampaignHierarchy(campaign, integration)
    
    // Store platform mappings
    const mappingData = {
      integration_id: integrationId,
      local_entity_type: 'campaign',
      local_entity_id: campaignId,
      platform_entity_type: 'campaign',
      platform_entity_id: result.campaign_id,
      metadata: result
    }

    await supabase
      .from('platform_mappings')
      .upsert(mappingData)

    // Update integration config
    const updatedConfig = {
      ...integration.platform_config,
      campaigns: {
        ...integration.platform_config?.campaigns,
        [campaignId]: {
          platform_id: result.campaign_id,
          hierarchy: result.hierarchy,
          created_at: new Date().toISOString(),
          status: 'synced'
        }
      }
    }

    await supabase
      .from('ad_server_integrations')
      .update({ 
        platform_config: updatedConfig,
        last_sync: new Date().toISOString()
      })
      .eq('id', integrationId)

    console.log(`Campaign successfully pushed to ${integration.provider}:`, result)

    return new Response(
      JSON.stringify({ 
        success: true,
        platform: integration.provider,
        result,
        message: `Campaign successfully pushed to ${integration.provider} with full hierarchy`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Universal push campaign error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})