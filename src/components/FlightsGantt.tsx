import React, { useMemo, useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  company_id?: string | null;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  priority?: number | null;
  status?: string | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
};

export type FlightsGanttProps = {
  items: TimelineItem[];
  campaignFilter?: string; // "all" | campaign_id
  onSelect?: (t: TimelineItem) => void;
};

// ---------- date helpers
function parseISO(d: string) {
  const s = d.length > 10 ? d.slice(0, 10) : d;
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function daysBetween(a: Date, b: Date) {
  const ms = 86400000;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / ms));
}
function addDays(d: Date, n: number) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
}

// ----------- colors
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-amber-400",
  draft: "bg-gray-300",
  completed: "bg-blue-500",
};

// ----------- component
const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect }) => {
  const filtered = useMemo(() => {
    const base = campaignFilter === "all" ? items : items.filter(i => i.campaign_id === campaignFilter);
    // group by campaign
    const map = new Map<string, { id: string; name: string; rows: TimelineItem[] }>();
    for (const it of base) {
      const k = it.campaign_id || it.campaign_name;
      if (!map.has(k)) map.set(k, { id: it.campaign_id, name: it.campaign_name, rows: [] });
      map.get(k)!.rows.push(it);
    }
    // stable sort rows per campaign by priority then start_date
    for (const g of map.values()) {
      g.rows.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime());
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, campaignFilter]);

  // timeline range (fit to content with padding)
  const { start, end, totalDays, ticks } = useMemo(() => {
    if (!items.length) {
      const today = new Date();
      return { start: today, end: addDays(today, 7), totalDays: 7, ticks: [fmtDay(today)] };
    }
    const min = new Date(Math.min(...items.map(i => parseISO(i.start_date).getTime())));
    const max = new Date(Math.max(...items.map(i => parseISO(i.end_date).getTime())));
    const pad = 3;
    const s = addDays(min, -pad);
    const e = addDays(max, pad);
    const total = Math.max(1, daysBetween(s, e));
    // place ~12 ticks
    const step = Math.max(1, Math.round(total / 12));
    const labels: { day: Date; leftPct: number }[] = [];
    for (let i = 0; i <= total; i += step) {
      const d = addDays(s, i);
      labels.push({ day: d, leftPct: (i / total) * 100 });
    }
    return { start: s, end: e, totalDays: total, ticks: labels };
  }, [items]);

  // expand/collapse state
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // auto open all by default
  useEffect(() => {
    const o: Record<string, boolean> = {};
    for (const g of filtered) o[g.id] = true;
    setOpen(o);
  }, [filtered]);

  const gridRef = useRef<HTMLDivElement>(null);

  const bar = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const left = (daysBetween(start, s) / totalDays) * 100;
    const w = (Math.max(1, daysBetween(s, e)) / totalDays) * 100;
    const color = STATUS_COLOR[(row.status || "draft").toLowerCase()] || STATUS_COLOR.draft;
    return (
      <div
        className={cn("absolute h-3 rounded cursor-pointer transition-opacity", color)}
        style={{ left: `${left}%`, width: `${w}%`, top: 8 }}
        title={`${row.flight_name} — ${row.start_date} → ${row.end_date}`}
        onClick={() => onSelect?.(row)}
      />
    );
  };

  if (!items.length) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      {/* Header timeline aligned to grid */}
      <div className="relative w-full h-8 select-none">
        {ticks.map((t, idx) => (
          <div
            key={idx}
            className="absolute text-[10px] text-muted-foreground tabular-nums"
            style={{ left: `calc(${t.leftPct}% - 18px)` }}
          >
            {fmtDay(t.day)}
          </div>
        ))}
      </div>

      {/* Campaign groups */}
      <div className="space-y-5">
        {filtered.map((g) => (
          <div key={g.id} className="rounded-lg border">
            {/* Campaign header row */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
              <div className="flex items-center gap-3">
                <button
                  className="text-xs rounded border px-2 py-1 hover:bg-muted"
                  onClick={() => setOpen((prev) => ({ ...prev, [g.id]: !prev[g.id] }))}
                >
                  {open[g.id] ? "▾" : "▸"}
                </button>
                <div className="font-medium">{g.name}</div>
                <Badge variant="outline">{g.rows.length} flights</Badge>
              </div>
              <div className="text-xs text-muted-foreground pr-2">Flight / Impr. / Clicks / Conv. / Spend</div>
            </div>

            {/* Rows */}
            {open[g.id] && (
              <div className="divide-y">
                {g.rows.map((r) => (
                  <div key={r.flight_id} className="grid grid-cols-[minmax(220px,1fr)_90px_80px_80px_120px] gap-3 items-center px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{r.flight_name}</div>
                      {typeof r.priority === "number" && (
                        <Badge variant="outline" className="text-[10px]">prio {r.priority}</Badge>
                      )}
                      {r.status && (
                        <Badge variant="secondary" className="text-[10px] capitalize">{r.status}</Badge>
                      )}
                    </div>

                    <div className="text-xs tabular-nums">{r.impressions?.toLocaleString?.() ?? "0"}</div>
                    <div className="text-xs tabular-nums">{r.clicks?.toLocaleString?.() ?? "0"}</div>
                    <div className="text-xs tabular-nums">{r.conversions?.toLocaleString?.() ?? "0"}</div>
                    <div className="relative h-6" ref={gridRef}>
                      {/* gantt rail */}
                      <div className="absolute inset-0 rounded bg-muted/40" />
                      {bar(r)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;
