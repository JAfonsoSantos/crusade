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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Get user email from auth.users
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (userError || !userData.user) {
      throw new Error('User not found')
    }

    // Send password reset email
    const { error: resetError } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email!,
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/reset-password`
      }
    })

    if (resetError) {
      throw resetError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})