import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";

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
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  spend: number | null;
};

const CampaignsPage: React.FC = () => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) { setItems([]); setLoading(false); return; }
        const { data: prof } = await supabase.from("profiles").select("company_id").eq("user_id", uid).single();
        const cId = (prof as any)?.company_id as string | null;
        if (!cId) { setItems([]); setLoading(false); return; }

        const { data, error } = await (supabase as any)
          .from("v_gantt_items_fast")
          .select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status,impressions,clicks,conversions,spend")
          .eq("company_id", cId);

        if (error) console.error(error);
        const rows: GanttRow[] = (data as any) || [];

        // map to component type
        const mapped: TimelineItem[] = rows.map(r => ({
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
        }));
        setItems(mapped);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const campaigns = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) m.set(it.campaign_id, it.campaign_name);
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

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

      <Card>
        <CardHeader className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Campaign & Flight Timeline</CardTitle>
            <CardDescription>Gantt view by campaign</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline">{items.length} rows</Badge>
            <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
            </div>
          ) : (
            <FlightsGantt
              items={items}
              campaignFilter={campaignFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignsPage;