// supabase/functions/sync-salesforce/index.ts
// Full version: CORS + JSON guard + token refresh + sample fetch of Accounts
// Writes a sync-history row and updates last_sync on ad_server_integrations.
// You can extend "upsertAccounts" to persist into your own tables.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

type SyncSummary = {
  synced: number;
  errors: number;
  operations: Record<string, any>;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // parse safe
  let payload: any = {};
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) payload = await req.json();
  } catch {}
  const url = new URL(req.url);
  const integrationId = payload?.integrationId ?? url.searchParams.get("integrationId");

  if (!integrationId) {
    return json({ error: "integrationId is required" }, 400);
  }

  // Supabase client
  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service for DB writes
  const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } });

  // Load integration row
  const { data: integ, error: integErr } = await supabase
    .from("ad_server_integrations")
    .select("*")
    .eq("id", integrationId)
    .maybeSingle();

  if (integErr || !integ) {
    return json({ error: "Integration not found", details: integErr }, 404);
  }
  if (integ.provider !== "salesforce") {
    return json({ error: "Integration provider must be 'salesforce' for this function." }, 400);
  }

  // Where is the refresh_token?
  // 1) Prefer configuration.oauth.refresh_token saved by your OAuth callback
  // 2) Fallback to Supabase secrets SALESFORCE_REFRESH_TOKEN
  const refreshToken =
    integ?.configuration?.oauth?.refresh_token ||
    Deno.env.get("SALESFORCE_REFRESH_TOKEN");

  const instanceUrl =
    integ?.configuration?.oauth?.instance_url ||
    Deno.env.get("SALESFORCE_INSTANCE_URL");

  if (!refreshToken) {
    return json({ error: "Missing Salesforce refresh_token (configuration.oauth.refresh_token or SALESFORCE_REFRESH_TOKEN)" }, 400);
  }

  const clientId = Deno.env.get("SALESFORCE_CLIENT_ID");
  const clientSecret = Deno.env.get("SALESFORCE_CLIENT_SECRET");
  const loginDomain = Deno.env.get("SALESFORCE_LOGIN_DOMAIN") || "https://login.salesforce.com";

  if (!clientId || !clientSecret) {
    return json({ error: "Set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in Supabase secrets." }, 400);
  }

  // ---- Refresh token
  const tokenRes = await fetch(`${loginDomain}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const tokenText = await tokenRes.text();
  let tokenJson: any;
  try { tokenJson = JSON.parse(tokenText); } catch { tokenJson = { raw: tokenText }; }

  if (!tokenRes.ok || !tokenJson.access_token) {
    await recordHistory(supabase, integrationId, { synced_count: 0, errors_count: 1, note: "refresh_failed", payload: tokenJson });
    return json({ error: "Salesforce token refresh failed", details: tokenJson }, 401);
  }

  const accessToken: string = tokenJson.access_token;
  const effectiveInstanceUrl: string =
    tokenJson.instance_url || instanceUrl;
  if (!effectiveInstanceUrl) {
    return json({ error: "instance_url missing from refresh response and not provided via configuration/secret" }, 400);
  }

  // ---- Example: fetch 50 Accounts to prove connectivity
  const apiVersion = Deno.env.get("SALESFORCE_API_VERSION") || "v60.0";
  const accRes = await fetch(`${effectiveInstanceUrl}/services/data/${apiVersion}/query?q=${encodeURIComponent("SELECT Id, Name, CreatedDate FROM Account ORDER BY CreatedDate DESC LIMIT 50")}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const accText = await accRes.text();
  let accountsJson: any;
  try { accountsJson = JSON.parse(accText); } catch { accountsJson = { raw: accText }; }

  if (!accRes.ok) {
    await recordHistory(supabase, integrationId, { synced_count: 0, errors_count: 1, note: "accounts_fetch_failed", payload: accountsJson });
    return json({ error: "Failed to fetch accounts", details: accountsJson }, 502);
  }

  const records: any[] = accountsJson?.records || [];
  // TODO: replace this with your own upsert logic into your CRM tables
  const upserted = await upsertAccounts(supabase, records, integ.company_id);

  // Build summary
  const summary: SyncSummary = {
    synced: upserted,
    errors: 0,
    operations: {
      accounts: { fetched: records.length, upserted },
    },
  };

  // Persist last_sync & history
  await supabase
    .from("ad_server_integrations")
    .update({ last_sync: new Date().toISOString() })
    .eq("id", integrationId);
  await recordHistory(supabase, integrationId, {
    synced_count: summary.synced,
    errors_count: summary.errors,
    payload: summary.operations,
  });

  return json(summary, 200);
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders });
}

async function upsertAccounts(supabase: ReturnType<typeof createClient>, records: any[], companyId: string): Promise<number> {
  // Create a simple landing table if you don't have one yet
  // CREATE TABLE IF NOT EXISTS crm_accounts (
  //   id uuid default uuid_generate_v4() primary key,
  //   company_id uuid not null,
  //   sf_id text unique,
  //   name text,
  //   created_at timestamptz default now()
  // );
  if (!records?.length) return 0;

  const rows = records.map((r: any) => ({
    company_id: companyId,
    sf_id: r?.Id,
    name: r?.Name,
  }));

  const { error } = await supabase.from("crm_accounts").upsert(rows, { onConflict: "sf_id" });
  if (error) {
    console.error("upsertAccounts error", error);
    return 0;
  }
  return rows.length;
}

async function recordHistory(
  supabase: ReturnType<typeof createClient>,
  integrationId: string,
  payload: { synced_count?: number; errors_count?: number; note?: string; payload?: any },
) {
  try {
    await supabase.from("integration_sync_history").insert({
      integration_id: integrationId,
      sync_timestamp: new Date().toISOString(),
      synced_count: payload.synced_count ?? 0,
      errors_count: payload.errors_count ?? 0,
      details: payload.payload ?? payload.note ?? null,
    });
  } catch (e) {
    console.error("recordHistory error", e);
  }
}
