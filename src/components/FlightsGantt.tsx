
import React, { useMemo, useState } from "react";

export type TimelineItem = {
  company_id: string;
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
  campaignFilter?: string; // "all" or campaign_id
  onSelect?: (t: TimelineItem) => void;
};

function parseISO(d: string) {
  const only = d.length >= 10 ? d.slice(0, 10) : d;
  const [y, m, day] = only.split("-").map((n) => Number(n));
  return new Date(y, (m || 1) - 1, day || 1);
}

function daysBetween(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / ms));
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  draft: "bg-slate-300",
  completed: "bg-sky-500",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect }) => {
  // Group by campaign
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of items) {
      if (campaignFilter !== "all" && it.campaign_id !== campaignFilter) continue;
      const key = it.campaign_id;
      if (!map.has(key)) map.set(key, { name: it.campaign_name, rows: [] });
      map.get(key)!.rows.push(it);
    }
    return Array.from(map.entries()).map(([id, g]) => ({
      id, name: g.name, rows: g.rows.sort((a, b) => (a.priority || 99) - (b.priority || 99)),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, campaignFilter]);

  // Global range for header ticks
  const { start, end, ticks, total } = useMemo(() => {
    if (items.length === 0) {
      const today = new Date();
      const end = new Date(today.getTime() + 7 * 86400000);
      return { start: today, end, total: 7, ticks: [] as string[] };
    }
    const min = new Date(Math.min(...items.map((i) => parseISO(i.start_date).getTime())));
    const max = new Date(Math.max(...items.map((i) => parseISO(i.end_date).getTime())));
    const totalDays = Math.max(1, daysBetween(min, max));
    const labels: string[] = [];
    const step = Math.max(1, Math.floor(totalDays / 14)); // up to 14 ticks
    for (let i = 0; i <= totalDays; i += step) {
      const d = new Date(min.getTime());
      d.setDate(d.getDate() + i);
      labels.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return { start: min, end: max, ticks: labels, total: totalDays };
  }, [items]);

  // Collapsed state by campaign id
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const bar = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = Math.max(0, daysBetween(start, s));
    const widthDays = Math.max(1, daysBetween(s, e));
    const leftPct = (leftDays / (total || 1)) * 100;
    const widthPct = (widthDays / (total || 1)) * 100;
    const color = STATUS_COLOR[(row.status || "draft").toLowerCase()] || STATUS_COLOR["draft"];
    return (
      <div className="relative h-6">
        <div
          className={`absolute h-3 rounded ${color}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "6px" }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
          onClick={() => onSelect && onSelect(row)}
          role={onSelect ? "button" : undefined}
        />
      </div>
    );
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* header ticks */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
        {ticks.map((t, i) => (
          <span key={i} className="tabular-nums">{t}</span>
        ))}
      </div>

      {/* groups */}
      {groups.map((g) => {
        const isOpen = open[g.id] ?? false;
        return (
          <div key={g.id} className="rounded-lg border">
            <div className="flex items-center justify-between p-3">
              <div className="font-medium">{g.name}</div>
              <button
                className="text-xs underline text-muted-foreground"
                onClick={() => setOpen((p) => ({ ...p, [g.id]: !isOpen }))}
              >
                {isOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            {isOpen && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2 py-1">
                  <div className="col-span-4">Flight</div>
                  <div className="col-span-1 text-right">Impr.</div>
                  <div className="col-span-1 text-right">Clicks</div>
                  <div className="col-span-1 text-right">Conv.</div>
                  <div className="col-span-2 text-right">Spend</div>
                  <div className="col-span-3">Timeline</div>
                </div>
                <div className="divide-y">
                  {g.rows.map((r) => (
                    <div key={r.flight_id} className="grid grid-cols-12 gap-2 items-center px-2 py-2">
                      <div className="col-span-4">
                        <div className="font-medium truncate">{r.flight_name}</div>
                        <div className="text-[10px] text-muted-foreground">{r.start_date} → {r.end_date}</div>
                      </div>
                      <div className="col-span-1 text-right tabular-nums">{r.impressions ?? 0}</div>
                      <div className="col-span-1 text-right tabular-nums">{r.clicks ?? 0}</div>
                      <div className="col-span-1 text-right tabular-nums">{r.conversions ?? 0}</div>
                      <div className="col-span-2 text-right tabular-nums">
                        {typeof r.spend === "number" ? r.spend.toLocaleString(undefined, { style: "currency", currency: "EUR" }) : "€0"}
                      </div>
                      <div className="col-span-3">{bar(r)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FlightsGantt;
