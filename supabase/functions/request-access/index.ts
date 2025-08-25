import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Set the auth token for the supabase client
    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: '',
    })

    const { module_name, message } = await req.json()

    if (!module_name) {
      throw new Error('Module name is required')
    }

    // Get current user profile
    const { data: user } = await supabaseClient.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, company_id, full_name')
      .eq('user_id', user.user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    // Check if request already exists and is pending
    const { data: existingRequest } = await supabaseClient
      .from('access_requests')
      .select('id')
      .eq('requester_id', profile.id)
      .eq('module_name', module_name)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      throw new Error('Já tem uma solicitação pendente para este módulo')
    }

    // Create access request
    const { error: insertError } = await supabaseClient
      .from('access_requests')
      .insert({
        requester_id: profile.id,
        company_id: profile.company_id,
        module_name,
        message: message || `Solicitação de acesso ao módulo ${module_name}`,
        status: 'pending'
      })

    if (insertError) {
      throw insertError
    }

    // TODO: Send notification to admins (could be email, in-app notification, etc.)
    // For now, we'll just log it
    console.log(`Access request created for user ${profile.full_name} to module ${module_name}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Solicitação de acesso enviada com sucesso!' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error in request-access function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})