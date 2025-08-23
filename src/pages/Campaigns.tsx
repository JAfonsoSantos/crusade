import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type Row = {
  company_id: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string;
  end_date: string;
  priority: number | null;
  status: string | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
  revenue?: number | null;
};

const CampaignsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"timeline" | "campaigns" | "ad-funnel">("timeline");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<string>("");

  // Load company and data
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
            .select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status,impressions,clicks,conversions,spend,revenue")
            .eq("company_id", cId);

          const rows = (gData as any as Row[]) || [];
          const mapped: TimelineItem[] = rows.map(r => ({
            company_id: r.company_id,
            campaign_id: r.campaign_id,
            campaign_name: r.campaign_name,
            flight_id: r.flight_id,
            flight_name: r.flight_name,
            start_date: r.start_date,
            end_date: r.end_date,
            priority: r.priority,
            status: r.status,
            impressions: r.impressions,
            clicks: r.clicks,
            conversions: r.conversions,
            spend: r.spend,
            revenue: r.revenue,
          }));
          setItems(mapped);
        } else {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const byStatusColor = (status?: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "bg-green-100 text-green-800";
    if (s === "paused") return "bg-yellow-100 text-yellow-800";
    if (s === "completed") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

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
      <div className="flex items-center justify-between">
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
            <CardHeader className="pb-2">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <CardTitle>Campaign & Flight Timeline</CardTitle>
                  <CardDescription>Gantt view by campaign</CardDescription>
                </div>
                {/* Simple campaign filter */}
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                >
                  <option value="">All campaigns</option>
                  {[...new Map(items.map(i => [i.campaign_id, i.campaign_name])).entries()].map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {!companyId ? (
                <div className="text-sm text-muted-foreground">A carregar a tua empresa…</div>
              ) : loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <FlightsGantt
                  items={items}
                  onSelect={(t) => setSelected(t)}
                  campaignFilter={campaignFilter}
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

      {/* Modal de detalhe do flight */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected?.flight_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{selected.campaign_name}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Start:</span> {selected.start_date}</div>
                <div><span className="text-muted-foreground">End:</span> {selected.end_date}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status || "-"}</div>
                <div><span className="text-muted-foreground">Priority:</span> {selected.priority ?? "-"}</div>
                <div><span className="text-muted-foreground">Impressions:</span> {selected.impressions ?? "-"}</div>
                <div><span className="text-muted-foreground">Clicks:</span> {selected.clicks ?? "-"}</div>
                <div><span className="text-muted-foreground">Conversions:</span> {selected.conversions ?? "-"}</div>
                <div><span className="text-muted-foreground">Spend:</span> {selected.spend ?? "-"}</div>
                <div><span className="text-muted-foreground">Revenue:</span> {selected.revenue ?? "-"}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsPage;
