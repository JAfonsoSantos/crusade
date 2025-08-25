import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { integrationId, forecastId } = await req.json();

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

    const apiKey = integration.api_key_encrypted; // In production, this should be decrypted

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Kevel API key' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Poll forecast status from Kevel
    const statusResponse = await fetch(`https://api.kevel.co/v1/forecaster/${forecastId}`, {
      method: 'GET',
      headers: {
        'X-Adzerk-ApiKey': apiKey,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      return new Response(JSON.stringify({ 
        error: 'Kevel API error', 
        details: errorText 
      }), { 
        status: statusResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const result = await statusResponse.json();

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in kevel-forecast-poll function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});