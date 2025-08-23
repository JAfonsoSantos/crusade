import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, BarChart3, Target, RefreshCw, Loader2 } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  budget?: number | null;
  currency?: string | null;
  status?: string | null;
};

type GanttRow = {
  company_id: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string;
  end_date: string;
  priority: number | null;
  status: string | null;
};

type Perf = {
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  revenue?: number | null;
  spend?: number | null;
  roas?: number | null;
};

const CampaignsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"timeline" | "campaigns" | "ad-funnel">("timeline");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) { setLoading(false); return; }

        const { data: prof } = await supabase.from("profiles").select("company_id").eq("user_id", uid).single();
        const cId = prof?.company_id || null;
        setCompanyId(cId);

        const { data: cData } = await supabase.from("campaigns").select("*").order("start_date", { ascending: true });
        setCampaigns((cData as any as Campaign[]) || []);

        if (cId) {
          const { data: gData } = await (supabase as any)
            .from("v_gantt_items_fast")
            .select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status")
            .eq("company_id", cId);
          const rows = (gData as any as GanttRow[]) || [];
          setItems(rows.map((r) => ({
            company_id: r.company_id,
            campaign_id: r.campaign_id,
            campaign_name: r.campaign_name,
            flight_id: r.flight_id,
            flight_name: r.flight_name,
            start_date: r.start_date,
            end_date: r.end_date,
            priority: r.priority,
            status: r.status,
          })));
        } else {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // flight modal loader
  useEffect(() => {
    const load = async () => {
      if (!selected) { setPerf(null); return; }
      try {
        // Try a performance view if available
        const { data } = await (supabase as any)
          .from("v_flight_performance")
          .select("impressions,clicks,conversions,revenue,spend,roas")
          .eq("flight_id", selected.flight_id)
          .limit(1)
          .maybeSingle?.() ?? { data: null };
        setPerf((data as any as Perf) || null);
      } catch {
        setPerf(null);
      }
    };
    load();
  }, [selected]);

  const byStatusColor = (status?: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "bg-green-100 text-green-800";
    if (s === "paused") return "bg-yellow-100 text-yellow-800";
    if (s === "completed") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const filteredItems = useMemo(() => {
    if (selectedCampaign === "all") return items;
    return items.filter(i => i.campaign_id === selectedCampaign);
  }, [items, selectedCampaign]);

  const campaignsForFilter = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) map.set(it.campaign_id, it.campaign_name);
    return Array.from(map.entries());
  }, [items]);

  const CampaignsList = useMemo(
    () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{c.name}</CardTitle>
                <Badge className={byStatusColor(c.status)} variant="outline">
                  {c.status || "draft"}
                </Badge>
              </div>
              <CardDescription>
                {new Date(c.start_date).toLocaleDateString()} →{" "}
                {new Date(c.end_date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    ),
    [campaigns]
  );

  const AdFunnel = (
    <Card>
      <CardHeader>
        <CardTitle>Ad Funnel</CardTitle>
        <CardDescription>Demo metrics</CardDescription>
      </CardHeader>
      <CardContent>Coming soon…</CardContent>
    </Card>
  );

  const syncAll = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("auto-sync-kevel");
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns & Flights</h2>
          <p className="text-muted-foreground">
            Manage your advertising campaigns and analyze performance
          </p>
        </div>
        <Button variant="outline" onClick={syncAll} disabled={syncing}>
          {syncing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing…</>
          ) : (
            <><RefreshCw className="mr-2 h-4 w-4" /> Sync with Platforms</>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Target className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="ad-funnel" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Ad Funnel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <CardTitle>Campaign & Flight Timeline</CardTitle>
                <CardDescription>Visualização Gantt por campanha</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Filter</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All campaigns</SelectItem>
                    {campaignsForFilter.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!companyId ? (
                <div className="text-sm text-muted-foreground">A carregar a tua empresa…</div>
              ) : (
                <FlightsGantt
                  items={filteredItems}
                  onSelect={(t) => { setSelected(t); setDialogOpen(true); }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          {CampaignsList}
        </TabsContent>

        <TabsContent value="ad-funnel" className="mt-6">
          {AdFunnel}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selected?.flight_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Summary</CardTitle>
                  <CardDescription>{selected?.start_date} → {selected?.end_date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-muted-foreground">Impressions</div><div className="font-medium">{perf?.impressions ?? "—"}</div></div>
                    <div><div className="text-muted-foreground">Clicks</div><div className="font-medium">{perf?.clicks ?? "—"}</div></div>
                    <div><div className="text-muted-foreground">Conversions</div><div className="font-medium">{perf?.conversions ?? "—"}</div></div>
                    <div><div className="text-muted-foreground">Spend</div><div className="font-medium">{perf?.spend ?? "—"}</div></div>
                    <div><div className="text-muted-foreground">Revenue</div><div className="font-medium">{perf?.revenue ?? "—"}</div></div>
                    <div><div className="text-muted-foreground">ROAS</div><div className="font-medium">{perf?.roas ?? "—"}</div></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Flight Context</CardTitle>
                  <CardDescription>Position within the campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  {selected ? (
                    <FlightsGantt
                      items={items.filter(i => i.campaign_id === selected.campaign_id)}
                      from={new Date(new Date(selected.start_date).getTime() - 14 * 86400000)}
                      to={new Date(new Date(selected.end_date).getTime() + 14 * 86400000)}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsPage;
