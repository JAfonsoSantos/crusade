import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";

type Campaign = { id: string; name: string };

type GanttRow = TimelineItem & { revenue?: number | null };

const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<GanttRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: cData, error: cErr } = await supabase
          .from("campaigns")
          .select("id,name,start_date,end_date")
          .order("start_date", { ascending: true });
        if (cErr) console.error(cErr);
        setCampaigns((cData as any as Campaign[]) || []);

        const { data: gData, error: gErr } = await (supabase as any)
          .from("v_gantt_items_fast")
          .select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status,impressions,clicks,conversions,spend,revenue");
        if (gErr) console.error(gErr);
        setItems(((gData as any) || []) as GanttRow[]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; rows: GanttRow[] }>();
    for (const it of (Array.isArray(items) ? items : [])) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    return Array.from(m.values());
  }, [items]);

  const toggle = (id: string) => setOpen((p) => ({ ...p, [id]: !p[id] }));

  const onSelect = (t: GanttRow) => {
    console.log("Selected flight:", t);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Campaign & Flight Timeline</h2>
        <p className="text-muted-foreground">Gantt view by campaign</p>
      </div>

      <div className="space-y-4">
        {grouped.map((g, i) => (
          <Card key={i}>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{g.name}</CardTitle>
              <button className="text-sm text-blue-600 hover:underline" onClick={() => toggle(g.name)}>
                {open[g.name] ? "Collapse" : "Expand"}
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2 text-sm text-muted-foreground px-1">
                  <span>Flight</span>
                  <span>Impr.</span>
                  <span>Clicks</span>
                  <span>Conv.</span>
                  <span>Spend</span>
                  <span>Revenue</span>
                  <span>Timeline</span>
                </div>
                {(open[g.name] ? g.rows : g.rows.slice(0, 1)).map((r) => (
                  <div key={r.flight_id} className="grid grid-cols-7 gap-2 items-center text-sm px-1">
                    <div className="truncate">{r.flight_name}</div>
                    <div className="tabular-nums">{r.impressions ?? 0}</div>
                    <div className="tabular-nums">{r.clicks ?? 0}</div>
                    <div className="tabular-nums">{r.conversions ?? 0}</div>
                    <div className="tabular-nums">{r.spend ?? 0}</div>
                    <div className="tabular-nums">{r.revenue ?? 0}</div>
                    <div className="px-2">
                      <FlightsGantt items={[r]} onSelect={onSelect} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CampaignsPage;
