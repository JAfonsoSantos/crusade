import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KevelForecastRequest {
  Type: string;
  StartDate?: string;
  EndDate: string;
  TimeZone?: string;
  Priority?: number;
  Targeting?: any;
  Params?: {
    Sampling?: number;
  };
}

interface KevelForecastResponse {
  id: string;
  status: string;
  progress: number;
  desc: string;
  resultStatus?: string;
  result?: any;
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

    const { integrationId, forecastType = 'available', startDate, endDate, priority = 50 } = await req.json();

    // Get the Kevel integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('ad_server_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('provider', 'kevel')
      .single();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ error: 'Integration not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const networkId = integration.configuration?.networkId;
    const apiKey = integration.api_key_encrypted; // In production, this should be decrypted

    if (!networkId || !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Kevel credentials' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Build forecast request based on type
    let forecastRequest: KevelForecastRequest;

    switch (forecastType) {
      case 'existing':
        forecastRequest = {
          Type: 'existing',
          EndDate: endDate,
          Params: {
            Sampling: 2 // Balance between speed and accuracy
          }
        };
        break;
      
      case 'available':
        forecastRequest = {
          Type: 'available',
          StartDate: startDate || new Date().toISOString().split('T')[0],
          EndDate: endDate,
          TimeZone: 'UTC',
          Priority: priority,
          Params: {
            Sampling: 2
          }
        };
        break;
      
      case 'deliverable':
        // For deliverable forecasts, we'd need additional targeting and ad configuration
        // This is more complex and would require campaign-specific data
        forecastRequest = {
          Type: 'deliverable',
          StartDate: startDate || new Date().toISOString().split('T')[0],
          EndDate: endDate,
          TimeZone: 'UTC',
          Params: {
            Sampling: 2
          }
        };
        break;
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid forecast type' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    // Submit forecast request to Kevel
    const forecastResponse = await fetch('https://api.kevel.co/v1/forecaster/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Adzerk-ApiKey': apiKey,
      },
      body: JSON.stringify(forecastRequest),
    });

    if (!forecastResponse.ok) {
      const errorText = await forecastResponse.text();
      return new Response(JSON.stringify({ 
        error: 'Kevel API error', 
        details: errorText 
      }), { 
        status: forecastResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const forecastResult: KevelForecastResponse = await forecastResponse.json();

    // If forecast is enqueued, we need to poll for results
    if (forecastResult.status === 'enqueued' || forecastResult.status === 'running') {
      // Return the forecast ID so the client can poll for results
      return new Response(JSON.stringify({
        id: forecastResult.id,
        status: forecastResult.status,
        progress: forecastResult.progress,
        message: 'Forecast is being processed. Poll with this ID for results.'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // If forecast is finished, return the results
    if (forecastResult.status === 'finished') {
      return new Response(JSON.stringify({
        id: forecastResult.id,
        status: forecastResult.status,
        result: forecastResult.result,
        resultStatus: forecastResult.resultStatus
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Return the current status for any other case
    return new Response(JSON.stringify(forecastResult), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in kevel-forecast function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});