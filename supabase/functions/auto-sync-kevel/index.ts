import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting automatic sync for all active Kevel integrations...')

    // Get all active Kevel integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .eq('provider', 'kevel')
      .eq('status', 'active')

    if (integrationsError) {
      console.error('Error fetching integrations:', integrationsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integrations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integrations || integrations.length === 0) {
      console.log('No active Kevel integrations found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active Kevel integrations found',
          synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalSynced = 0
    let totalErrors = 0

    // Sync each integration
    for (const integration of integrations) {
      try {
        console.log(`Syncing integration: ${integration.name} (${integration.id})`)
        
        // Call the sync-kevel-inventory function
        const { data, error } = await supabase.functions.invoke('sync-kevel-inventory', {
          body: {
            integrationId: integration.id
          },
        })

        if (error) {
          console.error(`Sync failed for integration ${integration.id}:`, error)
          totalErrors++
          
          // Update integration status to error
          await supabase
            .from('ad_server_integrations')
            .update({ 
              status: 'error',
              last_sync: new Date().toISOString()
            })
            .eq('id', integration.id)
        } else {
          console.log(`Sync completed for integration ${integration.id}:`, data)
          totalSynced += data.synced || 0
          totalErrors += data.errors || 0
        }
      } catch (error) {
        console.error(`Error syncing integration ${integration.id}:`, error)
        totalErrors++
      }
    }

    const result = {
      success: true,
      integrations_processed: integrations.length,
      total_synced: totalSynced,
      total_errors: totalErrors,
      message: `Auto-sync completed: ${integrations.length} integrations processed, ${totalSynced} items synced`
    }

    console.log('Auto-sync completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto-sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})