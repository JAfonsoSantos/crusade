
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Link as LinkIcon, Search, X } from "lucide-react";

type AdvertiserRow = { id: string; name: string };

type AdvertiserIdentity = {
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
};

type CRMAccount = { external_id: string; name: string };
type AdServerAdvertiser = { external_id: string; name: string };

export default function AdvertisersPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdvertiserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [identities, setIdentities] = useState<Record<string, AdvertiserIdentity>>(
    {}
  );

  // Linking modal
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkFor, setLinkFor] = useState<AdvertiserRow | null>(null);
  const [crmQuery, setCrmQuery] = useState("");
  const [adQuery, setAdQuery] = useState("");
  const [crmResults, setCrmResults] = useState<CRMAccount[]>([]);
  const [adResults, setAdResults] = useState<AdServerAdvertiser[]>([]);
  const [saving, setSaving] = useState(false);

  // Load advertisers
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("advertisers")
        .select("id,name")
        .order("name", { ascending: true });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setRows((data || []) as AdvertiserRow[]);
      }
      setLoading(false);
    })();
  }, [toast]);

  // Load identity view for the list
  useEffect(() => {
    if (rows.length === 0) return;
    (async () => {
      const ids = rows.map((r) => r.id);
      const q = (supabase.from("v_advertiser_identity" as any) as any)
        .select("*")
        .in("advertiser_id", ids);
      const { data, error } = await q;
      if (error) {
        // view não presente na tipagem -> cast
        console.error(error);
      } else {
        const map: Record<string, AdvertiserIdentity> = {};
        (data as any[]).forEach((d) => {
          map[d.advertiser_id] = d as AdvertiserIdentity;
        });
        setIdentities(map);
      }
    })();
  }, [rows]);

  const refreshIdentities = async () => {
    if (rows.length === 0) return;
    const ids = rows.map((r) => r.id);
    const { data, error } = await (supabase.from("v_advertiser_identity" as any) as any)
      .select("*")
      .in("advertiser_id", ids);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    const map: Record<string, AdvertiserIdentity> = {};
    (data as any[]).forEach((d) => {
      map[d.advertiser_id] = d as AdvertiserIdentity;
    });
    setIdentities(map);
    toast({ title: "Refreshed", description: "Identity refreshed." });
  };

  const openLinkModal = (adv: AdvertiserRow) => {
    setLinkFor(adv);
    setCrmQuery("");
    setAdQuery("");
    setCrmResults([]);
    setAdResults([]);
    setLinkOpen(true);
  };

  // Search CRM
  const searchCRM = async () => {
    const term = crmQuery.trim();
    if (!term) {
      setCrmResults([]);
      return;
    }
    const { data, error } = await (supabase.from("crm_accounts" as any) as any)
      .select("external_id,name")
      .ilike("name", `%${term}%`)
      .limit(20);
    if (error) {
      toast({ title: "CRM search error", description: error.message, variant: "destructive" });
    } else {
      setCrmResults(((data || []) as any) as CRMAccount[]);
    }
  };

  // Search Ad Server (simple helper view)
  const searchAdServer = async () => {
    const term = adQuery.trim();
    if (!term) {
      setAdResults([]);
      return;
    }
    // If you created a helper view ad_server_adv_links(external_id,name,advertiser_id), use it.
    // Otherwise fall back to listing advertisers (demo).
    let data: any = null, error: any = null;
    const tryView = await (supabase.from("ad_server_adv_links" as any) as any)
      .select("external_id,name")
      .ilike("name", `%${term}%`)
      .limit(20);
    if (tryView.error) {
      const fb = await supabase
        .from("advertisers")
        .select("id,name")
        .ilike("name", `%${term}%`)
        .limit(20);
      if (!fb.error) {
        data = (fb.data || []).map((r: any) => ({
          external_id: r.id,
          name: r.name,
        }));
      } else {
        error = fb.error;
      }
    } else {
      data = tryView.data;
      error = tryView.error;
    }
    if (error) {
      toast({
        title: "Ad Server search error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAdResults(((data || []) as any) as AdServerAdvertiser[]);
    }
  };

  const saveLink = async (source: "crm" | "ad_server", externalId: string) => {
    if (!linkFor) return;
    setSaving(true);
    try {
      const { data: integrations } = await supabase
        .from("ad_server_integrations")
        .select("id,provider,status")
        .eq("status", "active");
      let integrationId: string | null = null;
      const providersCRM = new Set(["salesforce", "hubspot", "pipedrive", "vtex"]);
      const providersAS = new Set([
        "kevel",
        "koddi",
        "topsort",
        "google_ad_manager",
        "criteo",
        "citrusad",
        "moloko",
      ]);
      (integrations || []).forEach((i: any) => {
        if (source === "crm" && providersCRM.has(i.provider)) integrationId = i.id;
        if (source === "ad_server" && providersAS.has(i.provider)) integrationId = i.id;
      });
      if (!integrationId) {
        throw new Error("No active integration found for the selected source.");
      }

      const payload = {
        p_source: source,
        p_advertiser_id: linkFor.id,
        p_integration_id: integrationId,
        p_external_id: externalId,
      };

      const rpcRes = await (supabase.rpc as any)("upsert_adv_link_fn", payload);
      if (rpcRes.error) throw rpcRes.error;

      toast({ title: "Linked", description: "Link saved successfully." });
      setLinkOpen(false);
      await refreshIdentities();
    } catch (e: any) {
      toast({
        title: "Link error",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const table = useMemo(() => {
    return rows.map((r) => {
      const id = r.id;
      const i = identities[id] || ({} as AdvertiserIdentity);
      return (
        <Card key={id} className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{r.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openLinkModal(r)}>
                  <LinkIcon className="w-4 h-4 mr-1" /> Link
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <div className="text-muted-foreground">Website</div>
              <div className="truncate">{i.website || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Industry</div>
              <div>{i.industry || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">CRM</div>
              <div className="flex items-center gap-2">
                {i.crm_account_external_id ? (
                  <Badge variant="secondary">linked</Badge>
                ) : (
                  <Badge variant="outline">not linked</Badge>
                )}
                <span className="truncate">{i.crm_name || "—"}</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Ad Server</div>
              <div className="flex items-center gap-2">
                {i.ad_server_advertiser_external_id ? (
                  <Badge variant="secondary">linked</Badge>
                ) : (
                  <Badge variant="outline">not linked</Badge>
                )}
                <span className="truncate">{i.ad_server_name || "—"}</span>
              </div>
            </div>
            <div className="md:col-span-4">
              <div className="text-muted-foreground mb-1">CRM Pipeline</div>
              <div className="text-xs">
                open: {i.crm_opportunities_open ?? 0} • won:{" "}
                {i.crm_opportunities_won ?? 0} • total:{" "}
                {i.crm_opportunities_total ?? 0}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  }, [rows, identities]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Advertisers</h1>
        <Button size="sm" onClick={refreshIdentities}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-muted-foreground">No advertisers.</div>
      ) : (
        <div className="grid gap-3">{table}</div>
      )}

      {/* Link modal */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link integrations</DialogTitle>
            <DialogDescription>
              Connect this advertiser with CRM or Ad Server entities.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Tabs defaultValue="crm">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="crm">CRM</TabsTrigger>
                <TabsTrigger value="adserver">Ad Server</TabsTrigger>
              </TabsList>
              <TabsContent value="crm" className="mt-4 space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Search CRM Accounts</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name…"
                        value={crmQuery}
                        onChange={(e) => setCrmQuery(e.target.value)}
                      />
                      <Button variant="outline" onClick={searchCRM}>
                        <Search className="w-4 h-4 mr-1" />
                        Search
                      </Button>
                    </div>
                  </div>
                  {crmQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCrmQuery("");
                        setCrmResults([]);
                      }}
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-auto border rounded">
                  {(crmResults || []).length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No results</div>
                  ) : (
                    (crmResults || []).map((r) => (
                      <div
                        key={r.external_id}
                        className="flex items-center justify-between p-3 border-b last:border-0"
                      >
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.external_id}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => saveLink("crm", r.external_id)}
                          disabled={saving}
                        >
                          Link
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="adserver" className="mt-4 space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Search Ad Server Advertisers</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name…"
                        value={adQuery}
                        onChange={(e) => setAdQuery(e.target.value)}
                      />
                      <Button variant="outline" onClick={searchAdServer}>
                        <Search className="w-4 h-4 mr-1" />
                        Search
                      </Button>
                    </div>
                  </div>
                  {adQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setAdQuery("");
                        setAdResults([]);
                      }}
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-auto border rounded">
                  {(adResults || []).length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No results</div>
                  ) : (
                    (adResults || []).map((r) => (
                      <div
                        key={r.external_id}
                        className="flex items-center justify-between p-3 border-b last:border-0"
                      >
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.external_id}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => saveLink("ad_server", r.external_id)}
                          disabled={saving}
                        >
                          Link
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
