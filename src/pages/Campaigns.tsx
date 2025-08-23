
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, BarChart3, Target, RefreshCw, Loader2, X } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status?: string | null;
};

const CampaignsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"timeline" | "campaigns" | "ad-funnel">("timeline");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selected, setSelected] = useState<TimelineItem | null>(null);

  // load data
  useEffect(() => {
    const run = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) { setLoading(false); return; }
        const { data: prof } = await supabase.from("profiles").select("company_id").eq("user_id", uid).single();
        const cId = prof?.company_id || null;
        setCompanyId(cId);

        const { data: cData } = await supabase.from("campaigns").select("id, name, start_date, end_date, status").order("start_date", { ascending: true });
        setCampaigns((cData as any as Campaign[]) || []);

        if (cId) {
          const { data: gData } = await (supabase as any)
            .from("v_gantt_items_fast")
            .select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status,impressions,clicks,conversions,spend")
            .eq("company_id", cId);
          const rows = (gData as any as TimelineItem[]) || [];
          setItems(rows);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // helpers
  const byStatusColor = (status?: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "bg-green-100 text-green-800";
    if (s === "paused") return "bg-yellow-100 text-yellow-800";
    if (s === "completed") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };
  const fmt = (n?: number | null) => (n == null ? "–" : Intl.NumberFormat().format(n));
  const ctr = (imp?: number | null, clk?: number | null) => (imp && clk ? ((clk/imp)*100).toFixed(1) + "%" : "–");
  const roas = (rev?: number | null, spend?: number | null) => (rev != null && spend ? (spend === 0 ? "–" : (rev/spend).toFixed(2)) : "–");

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
                {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Campaign summary coming soon…</div>
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
          <p className="text-muted-foreground">Manage your advertising campaigns and analyze performance</p>
        </div>
        <Button variant="outline" onClick={syncAll} disabled={syncing}>
          {syncing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing…</>) : (<><RefreshCw className="mr-2 h-4 w-4" /> Sync with Platforms</>)}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Timeline</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2"><Target className="h-4 w-4" /> Campaigns</TabsTrigger>
          <TabsTrigger value="ad-funnel" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Ad Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Campaign & Flight Timeline</CardTitle>
                <CardDescription>Visualização Gantt por campanha com métricas</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Filter:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value || "all")}
                >
                  <option value="all">All campaigns</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {!companyId ? (
                <div className="text-sm text-muted-foreground">A carregar a tua empresa…</div>
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

      {/* Simple modal for flight details */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg shadow-xl w-[680px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm text-muted-foreground">{selected.campaign_name}</div>
                <div className="text-lg font-semibold">{selected.flight_name}</div>
              </div>
              <button className="p-2 rounded hover:bg-muted" onClick={() => setSelected(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Summary</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded border">Impressions<br/><span className="font-medium">{fmt(selected.impressions)}</span></div>
                  <div className="p-2 rounded border">Clicks<br/><span className="font-medium">{fmt(selected.clicks)}</span></div>
                  <div className="p-2 rounded border">CTR<br/><span className="font-medium">{ctr(selected.impressions, selected.clicks)}</span></div>
                  <div className="p-2 rounded border">Conversions<br/><span className="font-medium">{fmt(selected.conversions)}</span></div>
                  <div className="p-2 rounded border">Spend<br/><span className="font-medium">{selected.spend == null ? "–" : `€${(selected.spend as number).toFixed(2)}`}</span></div>
                  <div className="p-2 rounded border">ROAS<br/><span className="font-medium">–</span></div>
                </div>
                <div className="text-xs text-muted-foreground">{selected.start_date} → {selected.end_date}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Timeline</div>
                <div className="border rounded p-3">
                  <FlightsGantt
                    items={[selected]}
                    onSelect={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
