
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FlightsGantt, { GanttItem } from "@/components/FlightsGantt";
import { useToast } from "@/hooks/use-toast";

type VRow = {
  company_id: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string | null;
  end_date: string | null;
  priority: number | null;
  status: string | null;
  ad_server: string | null;
};

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<"timeline" | "campaigns" | "ad-funnel">("timeline");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      // Resolve current user's companyId
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        console.error(error);
      }
      const cid = profile?.company_id ?? null;
      setCompanyId(cid);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      // Prefer the fast view if present; fallback to v_gantt_items
      let rows: VRow[] = [];
      // Try fast view
      const { data: fast, error: e1 } = await supabase
        .from("v_gantt_items_fast")
        .select("*")
        .eq("company_id", companyId);
      if (!e1 && fast) {
        rows = fast as unknown as VRow[];
      } else {
        const { data: slow, error: e2 } = await supabase
          .from("v_gantt_items")
          .select("*")
          .eq("company_id", companyId);
        if (e2) {
          console.error("Fetch error:", e1 ?? e2);
        }
        rows = (slow ?? []) as unknown as VRow[];
      }

      const mapped: GanttItem[] = rows.map((r) => ({
        campaign_id: r.campaign_id,
        campaign_name: r.campaign_name,
        flight_id: r.flight_id,
        flight_name: r.flight_name,
        start_date: r.start_date ?? "",
        end_date: r.end_date ?? "",
        priority: r.priority ?? 0,
        status: r.status ?? "active",
        ad_server: r.ad_server ?? "unknown",
      }));

      setItems(mapped);
      setLoading(false);
    })();
  }, [companyId]);

  const range = useMemo(() => {
    if (!items.length) return { from: undefined as Date | undefined, to: undefined as Date | undefined };
    const toDate = (s: string) => {
      // Accept 'YYYY-MM-DD' or ISO. If parse fails, return today to avoid NaN.
      if (!s) return new Date();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        return new Date(y, mo, d);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? new Date() : d;
    };
    let min = toDate(items[0].start_date);
    let max = toDate(items[0].end_date);
    for (const it of items) {
      const s = toDate(it.start_date);
      const e = toDate(it.end_date);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    // pad a bit
    const pad = 3 * 24 * 60 * 60 * 1000;
    return { from: new Date(min.getTime() - pad), to: new Date(max.getTime() + pad) };
  }, [items]);

  const syncAll = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("auto-sync-kevel");
      if (error) throw error;
      toast({ title: "Sync requested", description: "Background sync with ad platforms started." });
      // Refresh
      if (companyId) {
        const { data, error: e } = await supabase
          .from("v_gantt_items_fast")
          .select("*")
          .eq("company_id", companyId);
        if (!e && data) {
          const mapped: GanttItem[] = (data as VRow[]).map((r) => ({
            campaign_id: r.campaign_id,
            campaign_name: r.campaign_name,
            flight_id: r.flight_id,
            flight_name: r.flight_name,
            start_date: r.start_date ?? "",
            end_date: r.end_date ?? "",
            priority: r.priority ?? 0,
            status: r.status ?? "active",
            ad_server: r.ad_server ?? "unknown",
          }));
          setItems(mapped);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Sync failed", description: err?.message ?? "Unknown error", variant: "destructive" });
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
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Sync with Platforms
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
            <CardHeader>
              <CardTitle>Campaign & Flight Timeline</CardTitle>
              <CardDescription>Visual timeline (Gantt) grouped by campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading timeline…</div>
              ) : !items.length ? (
                <div className="text-sm text-muted-foreground">No flights found for your company.</div>
              ) : (
                <FlightsGantt items={items} from={range.from} to={range.to} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>Simple list of campaigns (coming soon)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This section will list and manage campaigns.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ad-funnel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Funnel</CardTitle>
              <CardDescription>Funnel and KPIs (coming soon)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This section will show funnel metrics.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
