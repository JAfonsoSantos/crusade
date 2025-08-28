
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Link as LinkIcon, Search, ExternalLink } from "lucide-react";

/** Minimal types to align with existing schema */
interface Advertiser {
  id: string;
  name: string;
  created_at?: string | null;
}

interface IdentityRow {
  advertiser_id: string;
  website?: string | null;
  industry?: string | null;
  crm_account_external_id?: string | null;
  crm_name?: string | null;
  ad_server_advertiser_external_id?: string | null;
  ad_server_name?: string | null;
  crm_opportunities_open?: number | null;
  crm_opportunities_won?: number | null;
  crm_opportunities_total?: number | null;
}

/** Simple search result types */
interface CRMAccount {
  external_id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
}

interface AdServerAdvertiser {
  external_id: string;
  name: string;
  provider?: string | null;
}

export default function Advertisers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Advertiser[]>([]);
  const [identity, setIdentity] = useState<Record<string, IdentityRow>>({});
  const [syncing, setSyncing] = useState(false);

  // Link modal state
  const [linkOpen, setLinkOpen] = useState(false);
  const [activeAdv, setActiveAdv] = useState<Advertiser | null>(null);

  // Search states inside the modal
  const [crmQuery, setCrmQuery] = useState("");
  const [crmResults, setCrmResults] = useState<CRMAccount[]>([]);
  const [selectedCRM, setSelectedCRM] = useState<CRMAccount | null>(null);

  const [adQuery, setAdQuery] = useState("");
  const [adResults, setAdResults] = useState<AdServerAdvertiser[]>([]);
  const [selectedAd, setSelectedAd] = useState<AdServerAdvertiser | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) fetch advertisers
      const { data: advs, error: advErr } = await supabase
        .from("advertisers")
        .select("id,name")
        .order("name", { ascending: true });
      if (advErr) {
        toast({ title: "Error", description: "Failed to load advertisers", variant: "destructive" });
        setLoading(false);
        return;
      }
      setList(advs || []);

      // 2) fetch identity view rows (optional LEFT set)
      const { data: ids, error: idErr } = await supabase
        .from("v_advertiser_identity")
        .select("*");
      if (idErr) {
        // still render advertisers; identity is optional
        console.warn("v_advertiser_identity not available:", idErr);
      } else {
        const map: Record<string, IdentityRow> = {};
        (ids as any[]).forEach((row) => {
          if (row?.advertiser_id) map[row.advertiser_id] = row as IdentityRow;
        });
        setIdentity(map);
      }
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => {
    return list.map((a) => ({
      ...a,
      _id: a.id,
      identity: identity[a.id] || {},
    }));
  }, [list, identity]);

  async function refreshIdentity() {
    // No server-side job here; just re-read the view
    setSyncing(true);
    const { data, error } = await supabase.from("v_advertiser_identity").select("*");
    if (!error && data) {
      const map: Record<string, IdentityRow> = {};
      (data as any[]).forEach((row) => {
        if (row?.advertiser_id) map[row.advertiser_id] = row as IdentityRow;
      });
      setIdentity(map);
    } else {
      toast({ title: "Refresh failed", description: error?.message || "Could not refresh identity.", variant: "destructive" });
    }
    setSyncing(false);
  }

  function openLinkModal(a: Advertiser) {
    setActiveAdv(a);
    setCrmQuery("");
    setCrmResults([]);
    setSelectedCRM(null);
    setAdQuery("");
    setAdResults([]);
    setSelectedAd(null);
    setLinkOpen(true);
  }

  // --- Search helpers ---
  async function searchCRM(q: string) {
    setCrmQuery(q);
    if (!q || q.length < 2) {
      setCrmResults([]);
      return;
    }
    const { data, error } = await supabase
      .from("crm_accounts")
      .select("external_id,name,website,industry")
      .ilike("name", `%${q}%`)
      .limit(20);
    if (!error) setCrmResults((data || []) as CRMAccount[]);
  }

  async function searchAdServer(q: string) {
    setAdQuery(q);
    if (!q || q.length < 2) {
      setAdResults([]);
      return;
    }
    // derive from ad_server_adv_links + advertisers? Provide a search over link table by name if present,
    // or fallback to advertisers names in our DB (best effort).
    const { data, error } = await supabase
      .from("ad_server_adv_links")
      .select("external_id,name,provider")
      .ilike("name", `%${q}%`)
      .limit(20);
    if (!error && data?.length) {
      setAdResults(data as AdServerAdvertiser[]);
      return;
    }
    const { data: advLike } = await supabase.from("advertisers").select("id,name").ilike("name", `%${q}%`).limit(20);
    const conv = (advLike || []).map((x: any) => ({ external_id: x.id, name: x.name, provider: null as any }));
    setAdResults(conv);
  }

  // --- Link calls ---
  async function linkCRM() {
    if (!activeAdv || !selectedCRM) return;
    // Calls the helper function created earlier: upsert_adv_link_fn(advertiser_id, integration_id, external_id, source)
    // We do not know the integration UUID here. Use any CRM integration present in ad_server_integrations with provider='salesforce'.
    const { data: integ } = await supabase
      .from("ad_server_integrations")
      .select("id")
      .eq("provider", "salesforce")
      .limit(1)
      .maybeSingle();

    if (!integ?.id) {
      toast({ title: "No CRM integration found", description: "Create a Salesforce integration first.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.rpc("upsert_adv_link_fn", {
      p_advertiser_id: activeAdv.id,
      p_integration_id: integ.id,
      p_external_id: selectedCRM.external_id,
      p_source: "crm",
    });

    if (error) {
      toast({ title: "Link failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Linked", description: `Linked "${activeAdv.name}" to CRM Account ${selectedCRM.name}` });
    setLinkOpen(false);
    refreshIdentity();
  }

  async function linkAdServer() {
    if (!activeAdv || !selectedAd) return;

    // Pick any Ad Server integration (first active) – Kevel by default
    const { data: integ } = await supabase
      .from("ad_server_integrations")
      .select("id")
      .in("provider", ["kevel", "koddi", "topsort", "google_ad_manager", "criteo", "citrusad", "moloko"])
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!integ?.id) {
      toast({ title: "No Ad Server integration found", description: "Create/activate at least one Ad Server integration.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.rpc("upsert_adv_link_fn", {
      p_advertiser_id: activeAdv.id,
      p_integration_id: integ.id,
      p_external_id: selectedAd.external_id,
      p_source: "ad_server",
    });

    if (error) {
      toast({ title: "Link failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Linked", description: `Linked "${activeAdv.name}" to Ad Server advertiser ${selectedAd.name}` });
    setLinkOpen(false);
    refreshIdentity();
  }

  if (loading) {
    return <div className="p-6">Loading advertisers…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Advertisers</h1>
        <Button variant="outline" onClick={refreshIdentity} disabled={syncing} className="gap-2">
          <RefreshCw className={syncing ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((row) => {
          const id = row.identity || {};
          return (
            <Card key={row._id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{row.name}</CardTitle>
                    <CardDescription>
                      {id.industry ? <span>{id.industry} · </span> : null}
                      {id.website ? (
                        <a href={id.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                          {id.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No website</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {id.crm_account_external_id ? (
                      <Badge variant="secondary">CRM linked</Badge>
                    ) : (
                      <Badge variant="outline">No CRM</Badge>
                    )}
                    {id.ad_server_advertiser_external_id ? (
                      <Badge variant="secondary">Ad Server linked</Badge>
                    ) : (
                      <Badge variant="outline">No Ad Server</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CRM Account:</span>
                    <span>{id.crm_name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ad Server:</span>
                    <span>{id.ad_server_name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Opportunities:</span>
                    <span>
                      {(id.crm_opportunities_open || 0) + (id.crm_opportunities_won || 0)} total ·{" "}
                      <span className="text-green-700">{id.crm_opportunities_open || 0} open</span>
                    </span>
                  </div>
                </div>
                <div className="pt-4">
                  <Dialog open={linkOpen && activeAdv?.id === row._id} onOpenChange={(o) => setLinkOpen(o)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2" onClick={() => openLinkModal(row)}>
                        <LinkIcon className="h-4 w-4" /> Link CRM / Ad Server
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[720px]">
                      <DialogHeader>
                        <DialogTitle>Link integrations</DialogTitle>
                        <DialogDescription>Link “{activeAdv?.name}” to a CRM Account and/or an Ad Server advertiser.</DialogDescription>
                      </DialogHeader>
                      <Tabs defaultValue="crm">
                        <TabsList className="mb-3">
                          <TabsTrigger value="crm">CRM Account</TabsTrigger>
                          <TabsTrigger value="ad">Ad Server</TabsTrigger>
                        </TabsList>
                        <TabsContent value="crm">
                          <div className="space-y-3">
                            <Label htmlFor="crm-search">Search CRM Accounts</Label>
                            <div className="flex gap-2">
                              <div className="relative w-full">
                                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                                <Input id="crm-search" placeholder="Type 2+ chars…" className="pl-8" value={crmQuery} onChange={(e) => searchCRM(e.target.value)} />
                              </div>
                              <Button variant="secondary" disabled={!selectedCRM} onClick={linkCRM}>
                                Link CRM
                              </Button>
                            </div>
                            <div className="max-h-56 overflow-auto rounded border">
                              {(crmResults || []).map((r) => (
                                <div
                                  key={r.external_id}
                                  className={`px-3 py-2 cursor-pointer hover:bg-muted ${selectedCRM?.external_id === r.external_id ? "bg-muted" : ""}`}
                                  onClick={() => setSelectedCRM(r)}
                                >
                                  <div className="font-medium">{r.name}</div>
                                  <div className="text-xs text-muted-foreground">Ext ID: {r.external_id} · {r.industry || "—"} · {r.website || "—"}</div>
                                </div>
                              ))}
                              {crmQuery.length >= 2 && (crmResults || []).length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="ad">
                          <div className="space-y-3">
                            <Label htmlFor="ad-search">Search Ad Server Advertisers</Label>
                            <div className="flex gap-2">
                              <div className="relative w-full">
                                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                                <Input id="ad-search" placeholder="Type 2+ chars…" className="pl-8" value={adQuery} onChange={(e) => searchAdServer(e.target.value)} />
                              </div>
                              <Button variant="secondary" disabled={!selectedAd} onClick={linkAdServer}>
                                Link Ad Server
                              </Button>
                            </div>
                            <div className="max-h-56 overflow-auto rounded border">
                              {(adResults || []).map((r) => (
                                <div
                                  key={r.external_id}
                                  className={`px-3 py-2 cursor-pointer hover:bg-muted ${selectedAd?.external_id === r.external_id ? "bg-muted" : ""}`}
                                  onClick={() => setSelectedAd(r)}
                                >
                                  <div className="font-medium">{r.name}</div>
                                  <div className="text-xs text-muted-foreground">Ext ID: {r.external_id} {r.provider ? `· ${r.provider}` : ""}</div>
                                </div>
                              ))}
                              {adQuery.length >= 2 && (adResults || []).length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
