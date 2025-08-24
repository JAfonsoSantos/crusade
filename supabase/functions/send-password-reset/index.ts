import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://bzqjxkmkrzvsigimnwwc.lovable.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetUrl: string;
  userName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetUrl, userName }: PasswordResetRequest = await req.json();

    if (!email || !resetUrl) {
      throw new Error("Email and reset URL are required");
    }

    // Rate limiting check - create Supabase client for logging
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Check rate limit (max 5 attempts per email per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from('password_reset_attempts')
      .select('id')
      .eq('email', email)
      .gte('attempted_at', oneHourAgo);

    if (recentAttempts && recentAttempts.length >= 5) {
      await supabase
        .from('password_reset_attempts')
        .insert({ email, ip_address: userIp, success: false });
      
      throw new Error("Too many password reset attempts. Please try again later.");
    }

    console.log(`Sending password reset email to: ${email.substring(0, 3)}***`);

    const emailResponse = await resend.emails.send({
      from: "AdSpace CRM <noreply@resend.dev>",
      to: [email],
      subject: "Reset da sua password - AdSpace CRM",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AdSpace CRM</h1>
              <h2>Reset da sua password</h2>
            </div>
            <div class="content">
              <p>Olá${userName ? ` ${userName}` : ''},</p>
              
              <p>Recebemos um pedido para fazer reset à password da sua conta no AdSpace CRM.</p>
              
              <p>Se foi você que fez este pedido, clique no botão abaixo para definir uma nova password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este link é válido apenas por 1 hora</li>
                  <li>Se não foi você que fez este pedido, ignore este email</li>
                  <li>Por segurança, nunca partilhe este link com outras pessoas</li>
                </ul>
              </div>
              
              <p>Se não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${resetUrl}
              </p>
              
              <p>Se tiver alguma questão, responda a este email.</p>
              
              <p>Cumprimentos,<br>
              Equipa AdSpace CRM</p>
            </div>
            <div class="footer">
              <p>© 2025 AdSpace CRM. Todos os direitos reservados.</p>
              <p>Se não solicitou este email, pode ignorá-lo em segurança.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Log successful attempt
    await supabase
      .from('password_reset_attempts')
      .insert({ email, ip_address: userIp, success: true });

    console.log("Password reset email sent successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      message: "Password reset email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);