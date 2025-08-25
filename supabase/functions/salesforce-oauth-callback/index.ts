import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Authorization Error</h1>
            <p>Error: ${error}</p>
            <p>Description: ${url.searchParams.get('error_description') || 'Unknown error'}</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Salesforce credentials not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://bzqjxkmkrzvsigimnwwc.supabase.co/functions/v1/salesforce-oauth-callback',
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    console.log('OAuth tokens received:', {
      access_token: tokenData.access_token ? 'present' : 'missing',
      refresh_token: tokenData.refresh_token ? 'present' : 'missing',
      instance_url: tokenData.instance_url
    });

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salesforce OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .token { background: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; margin: 10px 0; }
            .success { color: green; }
            .warning { color: orange; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Salesforce Authorization Successful!</h1>
          
          <h2>Refresh Token:</h2>
          <div class="token">${tokenData.refresh_token}</div>
          
          <p class="warning">
            <strong>Important:</strong> Copy the refresh token above and add it to your Supabase secrets as 
            <code>SALESFORCE_REFRESH_TOKEN</code>. Keep this token secure and don't share it publicly.
          </p>
          
          <h3>Additional Information:</h3>
          <p><strong>Instance URL:</strong> ${tokenData.instance_url}</p>
          <p><strong>Access Token:</strong> ${tokenData.access_token ? 'Generated (expires in ' + (tokenData.expires_in || 'unknown') + ' seconds)' : 'Not provided'}</p>
          
          <p>You can now close this window and use the Salesforce integration.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>OAuth Error</h1>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
});