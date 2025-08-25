import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SalesforceOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number;
  CloseDate: string;
  Probability: number;
  Description?: string;
  AccountId?: string;
  Account?: {
    Name: string;
    Website?: string;
  };
  Contact?: {
    Name: string;
    Email?: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
}

interface SalesforceTokenResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { integrationId } = await req.json();

    // Get the Salesforce integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('ad_server_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('provider', 'salesforce')
      .single();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ error: 'Salesforce integration not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Starting Salesforce sync for integration:', integrationId);

    // Get Salesforce credentials from environment
    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');
    const refreshToken = Deno.env.get('SALESFORCE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      return new Response(JSON.stringify({ 
        error: 'Missing Salesforce credentials. Please configure SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, and SALESFORCE_REFRESH_TOKEN.' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Salesforce token refresh failed:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to authenticate with Salesforce', 
        details: errorText 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const tokenData: SalesforceTokenResponse = await tokenResponse.json();
    console.log('Successfully authenticated with Salesforce');

    // Fetch opportunities from Salesforce
    const soqlQuery = `
      SELECT Id, Name, StageName, Amount, CloseDate, Probability, Description,
             AccountId, Account.Name, Account.Website, 
             CreatedDate, LastModifiedDate
      FROM Opportunity 
      WHERE LastModifiedDate >= LAST_N_DAYS:30
      ORDER BY LastModifiedDate DESC
    `;

    const queryResponse = await fetch(`${tokenData.instance_url}/services/data/v58.0/query/?q=${encodeURIComponent(soqlQuery)}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('Salesforce query failed:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch opportunities from Salesforce', 
        details: errorText 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const queryData = await queryResponse.json();
    const opportunities: SalesforceOpportunity[] = queryData.records || [];

    console.log(`Fetched ${opportunities.length} opportunities from Salesforce`);

    let syncedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each opportunity
    for (const opp of opportunities) {
      try {
        // Map Salesforce stages to our pipeline stages
        const stageMapping: { [key: string]: string } = {
          'Prospecting': 'needs_analysis',
          'Qualification': 'needs_analysis', 
          'Needs Analysis': 'needs_analysis',
          'Value Proposition': 'value_proposition',
          'Id. Decision Makers': 'value_proposition',
          'Perception Analysis': 'proposal',
          'Proposal/Price Quote': 'proposal',
          'Negotiation/Review': 'negotiation',
          'Closed Won': 'closed_won',
          'Closed Lost': 'closed_lost',
        };

        const mappedStage = stageMapping[opp.StageName] || 'needs_analysis';

        // Create or update opportunity in our database
        const opportunityData = {
          name: opp.Name,
          description: opp.Description || '',
          amount: opp.Amount || 0,
          currency: 'USD', // Salesforce default, could be enhanced
          stage: mappedStage,
          probability: opp.Probability || 50,
          close_date: opp.CloseDate,
          source: 'salesforce',
          company_id: integration.company_id,
          created_by: user.id,
          last_activity_date: new Date(opp.LastModifiedDate).toISOString(),
        };

        // Check if opportunity already exists (by external ID or name + company)
        const { data: existingOpp } = await supabaseClient
          .from('opportunities')
          .select('id')
          .eq('name', opp.Name)
          .eq('company_id', integration.company_id)
          .eq('source', 'salesforce')
          .single();

        if (existingOpp) {
          // Update existing opportunity
          const { error: updateError } = await supabaseClient
            .from('opportunities')
            .update(opportunityData)
            .eq('id', existingOpp.id);

          if (updateError) {
            console.error('Error updating opportunity:', updateError);
            errors.push(`Failed to update opportunity ${opp.Name}: ${updateError.message}`);
            errorCount++;
          } else {
            syncedCount++;
          }
        } else {
          // Create new opportunity
          const { error: insertError } = await supabaseClient
            .from('opportunities')
            .insert(opportunityData);

          if (insertError) {
            console.error('Error creating opportunity:', insertError);
            errors.push(`Failed to create opportunity ${opp.Name}: ${insertError.message}`);
            errorCount++;
          } else {
            syncedCount++;
          }
        }

        // Also sync related advertiser if Account exists
        if (opp.Account?.Name) {
          const advertiserData = {
            name: opp.Account.Name,
            company_id: integration.company_id,
            source: 'salesforce',
            external_id: opp.AccountId,
          };

          // Upsert advertiser (create or update)
          const { error: advertiserError } = await supabaseClient
            .from('advertisers')
            .upsert(advertiserData, { onConflict: 'company_id,name' });

          if (advertiserError) {
            console.error('Error syncing advertiser:', advertiserError);
            errors.push(`Failed to sync advertiser ${opp.Account.Name}: ${advertiserError.message}`);
          }
        }

      } catch (error: any) {
        console.error('Error processing opportunity:', error);
        errors.push(`Failed to process opportunity ${opp.Name}: ${error.message}`);
        errorCount++;
      }
    }

    // Record sync history
    const syncHistoryData = {
      integration_id: integrationId,
      status: errorCount > 0 ? 'completed_with_errors' : 'completed',
      synced_count: syncedCount,
      errors_count: errorCount,
      operations: {
        opportunities: {
          fetched: opportunities.length,
          synced: syncedCount,
          errors: errorCount,
          error_details: errors
        }
      },
      duration_ms: Date.now() - Date.now(), // This would be calculated properly
    };

    await supabaseClient
      .from('integration_sync_history')
      .insert(syncHistoryData);

    // Update integration last sync
    await supabaseClient
      .from('ad_server_integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', integrationId);

    console.log(`Salesforce sync completed: ${syncedCount} synced, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total_opportunities: opportunities.length,
      error_details: errors.length > 0 ? errors : undefined
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Error in sync-salesforce function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});