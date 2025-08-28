import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Eye, RefreshCw, Database, Link as LinkIcon } from "lucide-react";

type UUID = string;

type Advertiser = {
  id: UUID;
  name: string;
  // Pode não existir na tabela — manter como opcional
  website?: string | null;
  created_at?: string | null;
};

type PipelineRow = {
  advertiser_id: UUID;
  brands?: number | null;
  flights_active?: number | null;
  flights_total?: number | null;
  spend_30d?: number | null;
  impressions_30d?: number | null;
  opp_open?: number | null;
  opp_value?: number | null;
};

type CountsRow = {
  advertiser_id: UUID;
  accounts?: number | null;
  contacts?: number | null;
  opportunities?: number | null;
  leads?: number | null;
};

type CrmLink = {
  advertiser_id: UUID;
  crm_id?: string | null;
  crm_external_id?: string | null;
  crm_name?: string | null;
  website?: string | null;
  industry?: string | null;
};

const number = (v: any) => (typeof v === "number" && isFinite(v) ? v : 0);
const money = (v: any) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(number(v));
const compact = (v: any) =>
  new Intl.NumberFormat(undefined, { notation: "compact" }).format(number(v));

export default function AdvertisersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [pipeline, setPipeline] = useState<Record<UUID, PipelineRow>>({});
  const [crmCounts, setCrmCounts] = useState<Record<UUID, CountsRow>>({});
  const [crmLinks, setCrmLinks] = useState<Record<UUID, CrmLink[]>>({});
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Advertiser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      // ⚠️ Selecionar apenas colunas que existem de certeza
      const { data: adv, error: e1 } = await supabase
        .from("advertisers")
        .select("id,name,created_at")
        .order("name", { ascending: true });
      if (e1) throw e1;
      setAdvertisers((adv || []) as Advertiser[]);

      const ids = (adv || []).map((a: any) => a.id as UUID);
      if (ids.length === 0) return;

      // helper para in()
      const inList = (col: string) =>
        `${col}.in.(${ids.map((id) => `"${id}"`).join(",")})`;

      const trySelect = async (from: string, columns = "*") => {
        try {
          const { data, error } = await supabase
            .from(from as any)
            .select(columns)
            .or(inList("advertiser_id"));
          if (error) throw error;
          return data ?? [];
        } catch (err) {
          console.warn("[Advertisers] Optional view/table not found:", from, err);
          return [];
        }
      };

      const [pipeRows, countRows, linkRows] = await Promise.all([
        trySelect("v_advertiser_pipeline"),
        trySelect("v_advertiser_crm_counts"),
        trySelect("v_crm_account_advertiser"),
      ]);

      const pipeMap: Record<UUID, PipelineRow> = {};
      (pipeRows as any[]).forEach((r) => {
        pipeMap[r.advertiser_id] = r as PipelineRow;
      });
      setPipeline(pipeMap);

      const countMap: Record<UUID, CountsRow> = {};
      (countRows as any[]).forEach((r) => {
        countMap[r.advertiser_id] = r as CountsRow;
      });
      setCrmCounts(countMap);

      const linkMap: Record<UUID, CrmLink[]> = {};
      (linkRows as any[]).forEach((r) => {
        const id = r.advertiser_id as UUID;
        (linkMap[id] ||= []).push(r as CrmLink);
      });
      setCrmLinks(linkMap);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to load advertisers",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return advertisers.filter((a) => !q || a.name.toLowerCase().includes(q));
  }, [advertisers, filter]);

  async function openDetails(a: Advertiser) {
    setSelected(a);
    setDetailsOpen(true);
  }

  async function doRefresh() {
    setRefreshing(true);
    try {
      await load();
      toast({ title: "Refreshed" });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advertisers</h1>
          <p className="text-muted-foreground">
            Merged view of CRM + Ad Server for each advertiser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-[280px]"
          />
          <Button variant="outline" onClick={doRefresh} disabled={refreshing}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
          <CardDescription>
            Basic KPIs per advertiser; counts come from optional views (if present).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No advertisers found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((a) => {
                const p = pipeline[a.id];
                const c = crmCounts[a.id];
                return (
                  <Card key={a.id} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{a.name}</CardTitle>
                          {/* website só se existir (pode vir via futuras colunas/views) */}
                          {a.website && (
                            <CardDescription className="truncate">
                              {a.website}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {number(p?.flights_active) > 0 && (
                            <Badge variant="secondary">
                              {number(p?.flights_active)} active flights
                            </Badge>
                          )}
                          <Badge>
                            <Database className="w-3 h-3 mr-1" />
                            {number(c?.opportunities)} opps
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Brands</span>
                        <span>{number(p?.brands)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Flights (active / total)
                        </span>
                        <span>
                          {number(p?.flights_active)} / {number(p?.flights_total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spend (30d)</span>
                        <span>{money(p?.spend_30d)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Impressions (30d)
                        </span>
                        <span>{compact(p?.impressions_30d)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          CRM: Accounts / Contacts
                        </span>
                        <span>
                          {number(c?.accounts)} / {number(c?.contacts)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          CRM: Opps
                        </span>
                        <span>{number(c?.opportunities)}</span>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetails(a)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          See Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Advertiser Details{selected ? ` — ${selected.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {!selected ? (
            <div className="text-sm text-muted-foreground">No advertiser selected.</div>
          ) : (
            <Tabs defaultValue="crm">
              <TabsList>
                <TabsTrigger value="crm">CRM</TabsTrigger>
                <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              </TabsList>

              <TabsContent value="crm" className="space-y-4 pt-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Linked CRM Accounts</CardTitle>
                    <CardDescription>
                      Rows from <code>v_crm_account_advertiser</code> (if available).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(crmLinks[selected.id] ?? []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No CRM links found.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(crmLinks[selected.id] ?? []).map((l, i) => (
                          <Card key={i} className="border">
                            <CardContent className="p-3 text-sm">
                              <div className="font-medium">
                                {l.crm_name || l.crm_external_id}
                              </div>
                              {l.website && (
                                <div className="truncate text-muted-foreground">
                                  {l.website}
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <LinkIcon className="w-3 h-3" />
                                <span className="truncate">
                                  CRM ID: {l.crm_external_id || l.crm_id}
                                </span>
                              </div>
                              {l.industry && (
                                <div className="text-muted-foreground mt-1">
                                  Industry: {l.industry}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pipeline" className="space-y-4 pt-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Performance (last 30d)</CardTitle>
                    <CardDescription>
                      Data from <code>v_advertiser_pipeline</code> (if available).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {(() => {
                      const p = pipeline[selected.id];
                      if (!p) {
                        return (
                          <div className="text-muted-foreground">No pipeline data.</div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Brands</span>
                            <span>{number(p.brands)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Flights active / total
                            </span>
                            <span>
                              {number(p.flights_active)} / {number(p.flights_total)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Spend (30d)</span>
                            <span>{money(p.spend_30d)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Impr. (30d)</span>
                            <span>{compact(p.impressions_30d)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Open Opps</span>
                            <span>{number(p.opp_open)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Opp. Value</span>
                            <span>{money(p.opp_value)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}