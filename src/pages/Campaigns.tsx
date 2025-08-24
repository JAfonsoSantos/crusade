import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";

type GanttRow = TimelineItem;

const CampaignsPage: React.FC = () => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [selected, setSelected] = useState<TimelineItem | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) { setItems([]); setLoading(false); return; }

        const { data: prof } = await supabase.from("profiles").select("company_id").eq("user_id", uid).single();
        const cId = (prof as any)?.company_id;
        if (!cId) { setItems([]); setLoading(false); return; }

        const { data, error } = await (supabase as any)
          .from("v_gantt_items_fast")
          .select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status,impressions,clicks,conversions,spend,revenue")
          .eq("company_id", cId);

        if (error) console.error(error);
        const rows: GanttRow[] = (data as any) || [];
        setItems(rows.map(r => ({ ...r })));
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Campaign & Flight Timeline</CardTitle>
            <CardDescription>Gantt view by campaign</CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
              onSelect={(t) => setSelected(t)}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.flight_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Campaign</div>
                <div className="font-medium">{selected.campaign_name}</div>
                <div className="text-sm text-muted-foreground mt-4">Dates</div>
                <div className="font-medium">{selected.start_date} → {selected.end_date}</div>
                <div className="flex gap-2 mt-4">
                  {typeof selected.priority === "number" && <span className="text-xs rounded border px-2 py-0.5">prio {selected.priority}</span>}
                  {selected.status && <span className="text-xs rounded bg-muted px-2 py-0.5 capitalize">{selected.status}</span>}
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Impr.</div><div className="text-right tabular-nums">{selected.impressions ?? 0}</div>
                  <div className="text-muted-foreground">Clicks</div><div className="text-right tabular-nums">{selected.clicks ?? 0}</div>
                  <div className="text-muted-foreground">Conv.</div><div className="text-right tabular-nums">{selected.conversions ?? 0}</div>
                  <div className="text-muted-foreground">Spend</div><div className="text-right tabular-nums">{typeof selected.spend === "number" ? selected.spend.toLocaleString(undefined, { style: "currency", currency: "EUR" }) : "€0"}</div>
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
