import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, BarChart3, Target, RefreshCw, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const CampaignsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"timeline" | "campaigns" | "ad-funnel">("timeline");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selected, setSelected] = useState<TimelineItem | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) {
          setLoading(false);
          return;
        }
        const { data: prof } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", uid)
          .single();
        const cId = prof?.company_id || null;
        setCompanyId(cId);

        const { data: cData } = await supabase
          .from("campaigns")
          .select("*")
          .order("start_date", { ascending: true });
        setCampaigns((cData as any as Campaign[]) || []);

        if (cId) {
          const { data: gData } = await (supabase as any)
            .from("v_gantt_items_fast")
            .select(
              "company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status,impressions,clicks,conversions,spend,revenue"
            )
            .eq("company_id", cId);
          const rows = (gData as any as TimelineItem[]) || [];
          setItems(rows);
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

  const from = useMemo(() => {
    if (items.length === 0) return undefined;
    return new Date(Math.min(...items.map((i) => new Date(i.start_date).getTime())));
  }, [items]);
  const to = useMemo(() => {
    if (items.length === 0) return undefined;
    return new Date(Math.max(...items.map((i) => new Date(i.end_date).getTime())));
  }, [items]);

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
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing…
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Sync with Platforms
            </>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Campaign & Flight Timeline</CardTitle>
                <CardDescription>Gantt view by campaign</CardDescription>
              </div>
              <div className="w-56">
                <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All campaigns</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
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
                  items={items}
                  from={from}
                  to={to}
                  campaignFilter={campaignFilter}
                  onSelect={(t) => setSelected(t)}
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

      {/* Details modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.flight_name}</DialogTitle>
            <DialogDescription>
              {selected?.start_date} → {selected?.end_date}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Performance</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Impressions</div>
                  <div className="text-right tabular-nums">
                    {selected.impressions?.toLocaleString?.() ?? selected.impressions ?? "-"}
                  </div>
                  <div>Clicks</div>
                  <div className="text-right tabular-nums">
                    {selected.clicks?.toLocaleString?.() ?? selected.clicks ?? "-"}
                  </div>
                  <div>Conversions</div>
                  <div className="text-right tabular-nums">
                    {selected.conversions?.toLocaleString?.() ?? selected.conversions ?? "-"}
                  </div>
                  <div>Spend</div>
                  <div className="text-right tabular-nums">
                    {selected.spend != null ? `€${selected.spend.toFixed?.(2) ?? selected.spend}` : "-"}
                  </div>
                  <div>Revenue</div>
                  <div className="text-right tabular-nums">
                    {selected.revenue != null
                      ? `€${selected.revenue.toFixed?.(2) ?? selected.revenue}`
                      : "-"}
                  </div>
                  <div>ROAS</div>
                  <div className="text-right tabular-nums">
                    {selected.spend && selected.revenue
                      ? (selected.revenue / selected.spend).toFixed(2)
                      : "-"}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Timeline</div>
                <div className="border rounded p-3">
                  <div className="text-xs text-muted-foreground">
                    From {selected.start_date} to {selected.end_date}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsPage;