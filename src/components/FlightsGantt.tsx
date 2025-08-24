
import React, { useMemo } from "react";

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

  // optional performance fields
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
};

export type FlightsGanttProps = {
  items: TimelineItem[];
  /** Filter to a single campaign id (or "all") */
  campaignFilter?: string;
  /** Called when a bar (flight) is clicked */
  onSelect?: (t: TimelineItem) => void;
  /** View granularity affects the top ticks only */
  view?: "month" | "week" | "day";
};

/** utils */
function parseISO(d: string) {
  const [y, m, day] = (d.length === 10 ? d : d.slice(0, 10)).split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function daysBetween(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / ms));
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const STATUS_COLOR: Record<string, string> = {
  active: "#16a34a",
  paused: "#f59e0b",
  draft: "#94a3b8",
  completed: "#3b82f6",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect, view = "month" }) => {
  const filtered = useMemo(() => {
    return (campaignFilter && campaignFilter !== "all")
      ? items.filter(i => i.campaign_id === campaignFilter)
      : items.slice();
  }, [items, campaignFilter]);

  const groups = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    for (const [, g] of m) {
      g.rows.sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime());
    }
    return Array.from(m.entries()).map(([id, g]) => ({ id, ...g }));
  }, [filtered]);

  // Calculate shared viewport across filtered
  const { min, max, totalDays, ticks } = useMemo(() => {
    if (filtered.length === 0) {
      const today = startOfDay(new Date());
      const weekAfter = new Date(today.getTime() + 7 * 86400000);
      return { min: today, max: weekAfter, totalDays: 7, ticks: [] as string[] };
    }
    const starts = filtered.map(r => parseISO(r.start_date));
    const ends = filtered.map(r => parseISO(r.end_date));
    const minD = new Date(Math.min(...starts.map(d => d.getTime())));
    const maxD = new Date(Math.max(...ends.map(d => d.getTime())));
    const total = Math.max(1, daysBetween(minD, maxD));
    // build ticks depending on view
    const tl: string[] = [];
    if (view === "month") {
      // label each month within range
      const d = new Date(minD.getFullYear(), minD.getMonth(), 1);
      while (d <= maxD) {
        tl.push(d.toLocaleDateString(undefined, { month: "short" }));
        d.setMonth(d.getMonth() + 1);
      }
    } else if (view === "week") {
      // every week (Mon)
      const d = startOfDay(minD);
      while (d <= maxD) {
        tl.push(d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }));
        d.setDate(d.getDate() + 7);
      }
    } else {
      // day
      const d = startOfDay(minD);
      while (d <= maxD) {
        tl.push(d.toLocaleDateString(undefined, { day: "2-digit" }));
        d.setDate(d.getDate() + 1);
      }
    }
    return { min: minD, max: maxD, totalDays: total, ticks: tl };
  }, [filtered, view]);

  const bar = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(min, s), 0, totalDays);
    const widthDays = clamp(daysBetween(s, e), 0, totalDays);
    const leftPct = (leftDays / (totalDays || 1)) * 100;
    const widthPct = Math.max(0.8, (widthDays / (totalDays || 1)) * 100);
    const color = STATUS_COLOR[(row.status || "").toLowerCase()] || STATUS_COLOR["draft"];
    return (
      <div className="relative h-6 w-full" onClick={() => onSelect?.(row)}>
        <div
          className="absolute top-2 h-2 rounded"
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color, opacity: 0.9 }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Axis aligned to bars: same container width */}
      <div className="mb-2 text-xs text-muted-foreground">
        <div className="relative h-4 w-full">
          {ticks.map((t, i) => (
            <span key={i} className="absolute text-[10px]" style={{ left: `${(i / Math.max(1, ticks.length - 1)) * 100}%`, transform: "translateX(-50%)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(g => (
          <div key={g.id} className="rounded-lg border">
            <div className="px-4 py-3 font-medium">{g.name}</div>
            <div className="grid grid-cols-[minmax(140px,1fr)_80px_80px_80px_minmax(100px,1fr)] gap-2 px-4 pb-4">
              <div className="text-xs text-muted-foreground">Flight</div>
              <div className="text-xs text-muted-foreground text-right">Impr.</div>
              <div className="text-xs text-muted-foreground text-right">Clicks</div>
              <div className="text-xs text-muted-foreground text-right">Conv.</div>
              <div className="text-xs text-muted-foreground">Timeline</div>
              {g.rows.map(r => (
                <React.Fragment key={r.flight_id}>
                  <div className="truncate">
                    <div className="text-sm">{r.flight_name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.start_date} → {r.end_date}</div>
                  </div>
                  <div className="text-right tabular-nums">{r.impressions?.toLocaleString?.() ?? "0"}</div>
                  <div className="text-right tabular-nums">{r.clicks?.toLocaleString?.() ?? "0"}</div>
                  <div className="text-right tabular-nums">{r.conversions?.toLocaleString?.() ?? "0"}</div>
                  <div>{bar(r)}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;
