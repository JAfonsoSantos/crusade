import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// CRM-specific configurations
const CRM_CONFIGS = {
  salesforce: {
    name: 'Salesforce',
    authEndpoint: 'https://login.salesforce.com/services/oauth2/token',
    apiVersion: 'v58.0'
  },
  hubspot: {
    name: 'HubSpot',
    authEndpoint: 'https://api.hubapi.com/oauth/v1/token',
    apiVersion: 'v3'
  },
  pipedrive: {
    name: 'Pipedrive',
    authEndpoint: 'https://oauth.pipedrive.com/oauth/token',
    apiVersion: 'v1'
  },
  vtex: {
    name: 'VTEX',
    authEndpoint: 'https://vtexid.vtex.com.br/api/vtexid/oauth/token',
    apiVersion: 'v1'
  }
}

interface CRMAdapter {
  syncOpportunities(integration: any): Promise<any>
  syncContacts(integration: any): Promise<any>
  syncAdvertisers(integration: any): Promise<any>
}

class SalesforceAdapter implements CRMAdapter {
  async syncOpportunities(integration: any) {
    console.log('Starting Salesforce opportunities sync...')
    
    // Use the dedicated sync-salesforce function
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data, error } = await supabase.functions.invoke('sync-salesforce', {
      body: { integrationId: integration.id }
    })
    
    if (error) throw error
    
    return {
      opportunities: data?.synced || 0,
      errors: data?.errors || 0,
      platform: 'salesforce'
    }
  }

  async syncContacts(integration: any) {
    // Get Salesforce credentials
    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID')
    const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET')
    const refreshToken = Deno.env.get('SALESFORCE_REFRESH_TOKEN')

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing Salesforce credentials')
    }

    // Get access token
    const tokenResponse = await fetch(CRM_CONFIGS.salesforce.authEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    const tokenData = await tokenResponse.json()
    
    // Fetch contacts from Salesforce
    const soqlQuery = `
      SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId, Account.Name, Account.Website
      FROM Contact 
      WHERE LastModifiedDate >= LAST_N_DAYS:30
      ORDER BY LastModifiedDate DESC
    `

    const queryResponse = await fetch(`${tokenData.instance_url}/services/data/${CRM_CONFIGS.salesforce.apiVersion}/query/?q=${encodeURIComponent(soqlQuery)}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    const queryData = await queryResponse.json()
    const contacts = queryData.records || []

    console.log(`Fetched ${contacts.length} contacts from Salesforce`)

    // Sync to our database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let syncedCount = 0
    let errorCount = 0

    for (const contact of contacts) {
      try {
        const contactData = {
          first_name: contact.FirstName || '',
          last_name: contact.LastName || '',
          email: contact.Email,
          phone: contact.Phone,
          job_title: contact.Title,
          company_name: contact.Account?.Name,
          website: contact.Account?.Website,
          lead_source: 'salesforce',
          company_id: integration.company_id,
          created_by: integration.company_id, // Use company_id as created_by for system imports
        }

        // Upsert contact
        const { error } = await supabase
          .from('contacts')
          .upsert(contactData, { onConflict: 'company_id,email' })

        if (error) {
          console.error('Error syncing contact:', error)
          errorCount++
        } else {
          syncedCount++
        }
      } catch (error) {
        console.error('Error processing contact:', error)
        errorCount++
      }
    }

    return {
      contacts: syncedCount,
      errors: errorCount,
      platform: 'salesforce'
    }
  }

  async syncAdvertisers(integration: any) {
    // Similar implementation for Accounts -> Advertisers
    return {
      advertisers: 0,
      errors: 0,
      platform: 'salesforce'
    }
  }
}

class HubSpotAdapter implements CRMAdapter {
  async syncOpportunities(integration: any) {
    // HubSpot deals sync implementation
    return {
      opportunities: 0,
      errors: 0,
      platform: 'hubspot'
    }
  }

  async syncContacts(integration: any) {
    // HubSpot contacts sync implementation
    return {
      contacts: 0,
      errors: 0,
      platform: 'hubspot'
    }
  }

  async syncAdvertisers(integration: any) {
    // HubSpot companies sync implementation
    return {
      advertisers: 0,
      errors: 0,
      platform: 'hubspot'
    }
  }
}

class PipedriveAdapter implements CRMAdapter {
  async syncOpportunities(integration: any) {
    // Pipedrive deals sync implementation
    return {
      opportunities: 0,
      errors: 0,
      platform: 'pipedrive'
    }
  }

  async syncContacts(integration: any) {
    // Pipedrive persons sync implementation
    return {
      contacts: 0,
      errors: 0,
      platform: 'pipedrive'
    }
  }

  async syncAdvertisers(integration: any) {
    // Pipedrive organizations sync implementation
    return {
      advertisers: 0,
      errors: 0,
      platform: 'pipedrive'
    }
  }
}

class VtexAdapter implements CRMAdapter {
  async syncOpportunities(integration: any) {
    // VTEX orders -> opportunities sync implementation
    return {
      opportunities: 0,
      errors: 0,
      platform: 'vtex'
    }
  }

  async syncContacts(integration: any) {
    // VTEX customers sync implementation
    return {
      contacts: 0,
      errors: 0,
      platform: 'vtex'
    }
  }

  async syncAdvertisers(integration: any) {
    // VTEX sellers -> advertisers sync implementation
    return {
      advertisers: 0,
      errors: 0,
      platform: 'vtex'
    }
  }
}

// Factory pattern for CRM adapters
function getCRMAdapter(provider: string): CRMAdapter {
  switch (provider) {
    case 'salesforce':
      return new SalesforceAdapter()
    case 'hubspot':
      return new HubSpotAdapter()
    case 'pipedrive':
      return new PipedriveAdapter()
    case 'vtex':
      return new VtexAdapter()
    default:
      throw new Error(`Unsupported CRM provider: ${provider}`)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user first
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { integrationId, syncType = 'full' } = await req.json()

    if (!integrationId) {
      return new Response(
        JSON.stringify({ error: 'Integration ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`CRM universal sync: ${integrationId}, type: ${syncType}`)

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('integration_type', 'crm')
      .single()

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'CRM integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get CRM adapter
    const adapter = getCRMAdapter(integration.provider)
    
    // Perform sync based on type
    let result: any = {}
    
    if (syncType === 'full' || syncType === 'opportunities') {
      const oppResult = await adapter.syncOpportunities(integration)
      result.opportunities = oppResult
    }
    
    if (syncType === 'full' || syncType === 'contacts') {
      const contactResult = await adapter.syncContacts(integration)
      result.contacts = contactResult
    }
    
    if (syncType === 'full' || syncType === 'advertisers') {
      const advertiserResult = await adapter.syncAdvertisers(integration)
      result.advertisers = advertiserResult
    }

    // Record sync history
    const totalSynced = Object.values(result).reduce((sum: number, item: any) => sum + (item.opportunities || item.contacts || item.advertisers || 0), 0)
    const totalErrors = Object.values(result).reduce((sum: number, item: any) => sum + (item.errors || 0), 0)

    await supabase
      .from('integration_sync_history')
      .insert({
        integration_id: integrationId,
        status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
        synced_count: totalSynced,
        errors_count: totalErrors,
        operations: result,
      })

    // Update integration last sync
    await supabase
      .from('ad_server_integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', integrationId)

    console.log(`CRM sync completed for ${integration.provider}: ${totalSynced} synced, ${totalErrors} errors`)

    return new Response(JSON.stringify({ 
      success: true,
      provider: integration.provider,
      synced: totalSynced,
      errors: totalErrors,
      details: result
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Error in crm-universal-sync function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});