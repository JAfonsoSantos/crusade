
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
  campaignFilter?: string;               // optional: "all" or campaign_id
  onSelect?: (t: TimelineItem) => void;  // optional click handler for a row
};

/** Utilities **/
const DAY_MS = 86_400_000;
function parseISO(d: string) {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function daysBetween(a: Date, b: Date) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / DAY_MS));
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function formatEUR(n?: number | null) {
  if (typeof n !== "number") return "€0";
  try { return n.toLocaleString(undefined, { style: "currency", currency: "EUR" }); }
  catch { return `€${n.toFixed(0)}`; }
}

/** Color by status **/
const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  completed: "bg-sky-500",
  draft: "bg-zinc-300",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect }) => {
  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return campaignFilter && campaignFilter !== "all"
      ? list.filter((i) => i.campaign_id === campaignFilter)
      : list;
  }, [items, campaignFilter]);

  // group by campaign
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    // stable order by campaign name
    return Array.from(m.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([, v]) => v);
  }, [filtered]);

  // viewport (min start, max end)
  const { start, totalDays, ticks } = useMemo(() => {
    if (filtered.length === 0) {
      const today = new Date();
      const end = new Date(today.getTime() + 7 * DAY_MS);
      const total = daysBetween(today, end) || 7;
      const ts: string[] = [];
      for (let i = 0; i <= total; i += Math.max(1, Math.floor(total / 12))) {
        const d = new Date(today.getTime() + i * DAY_MS);
        ts.push(d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }));
      }
      return { start: today, totalDays: total, ticks: ts };
    }
    const starts = filtered.map((r) => parseISO(r.start_date));
    const ends = filtered.map((r) => parseISO(r.end_date));
    const min = new Date(Math.min(...starts.map((d) => d.getTime())));
    const max = new Date(Math.max(...ends.map((d) => d.getTime())));
    // add 1 day padding so bars ending today still show
    const paddedEnd = new Date(max.getTime() + DAY_MS);
    const total = Math.max(1, daysBetween(min, paddedEnd));
    const ts: string[] = [];
    const step = Math.max(1, Math.floor(total / 12));
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime() + i * DAY_MS);
      ts.push(d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }));
    }
    return { start: min, totalDays: total, ticks: ts };
  }, [filtered]);

  // local expand/collapse state per campaign
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // grid constants
  const DAY_COL_WIDTH_PX = 24; // visual width per day
  const metricCols = 5; // Impr, Clicks, Conv, Spend + spacer (Name column sits before them)
  const metricGrid = "minmax(180px, 1.2fr) 100px 90px 90px 120px"; // name + four metrics

  // helpers to position a bar within the time grid
  const barPlacement = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const left = clamp(daysBetween(start, s), 0, totalDays);
    const width = clamp(daysBetween(s, e) || 1, 1, totalDays);
    // grid columns are 1-based, and we place timeline after metric columns (+1 for grid start)
    const gridStart = left + 1;
    const gridEnd = left + width + 1;
    return { gridColumn: `${gridStart} / ${gridEnd}` };
  };

  if (!Array.isArray(items) || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Global timeline ticks (aligned to day columns using same width) */}
      <div className="flex gap-2 pl-44 pb-2 text-[10px] text-muted-foreground flex-wrap">
        {ticks.map((t, i) => (
          <span key={i} style={{ width: DAY_COL_WIDTH_PX * Math.max(1, Math.floor(totalDays / ticks.length)) }} className="tabular-nums text-center">
            {t}
          </span>
        ))}
      </div>

      {groups.map((g, gi) => {
        const isOpen = open[g.name] ?? true;
        return (
          <div key={gi} className="rounded-lg border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="font-medium">{g.name}</div>
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => setOpen((o) => ({ ...o, [g.name]: !isOpen }))}
              >
                {isOpen ? "Collapse" : "Expand"}
              </button>
            </div>

            {isOpen && (
              <div className="border-t">
                {/* Header row */}
                <div
                  className="grid items-center px-4 py-2 text-xs text-muted-foreground"
                  style={{
                    gridTemplateColumns: `${metricGrid} ${" ".join([])}`,
                  }}
                >
                  {/* We fake the header with two layers: metrics on left, timeline label on right */}
                  <div className="grid" style={{ gridTemplateColumns: metricGrid }}>
                    <div className="uppercase tracking-wide">Flight</div>
                    <div className="uppercase tracking-wide text-right">Impr.</div>
                    <div className="uppercase tracking-wide text-right">Clicks</div>
                    <div className="uppercase tracking-wide text-right">Conv.</div>
                    <div className="uppercase tracking-wide text-right">Spend</div>
                  </div>
                  <div className="hidden" />
                </div>

                {/* Rows */}
                <div className="divide-y">
                  {g.rows
                    .slice()
                    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
                    .map((row) => {
                      const dot = STATUS_DOT[(row.status || "draft").toLowerCase()] || STATUS_DOT["draft"];
                      return (
                        <div key={row.flight_id} className="px-4 py-3">
                          {/* Two-layer grid: left metrics grid + right timeline grid */}
                          <div className="grid gap-3">
                            <div className="grid items-center" style={{ gridTemplateColumns: metricGrid }}>
                              <div className="flex items-center gap-3">
                                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                                <button
                                  className="text-left hover:underline"
                                  onClick={() => onSelect && onSelect(row)}
                                  title={`${row.start_date} → ${row.end_date}`}
                                >
                                  <div className="font-medium">{row.flight_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {row.start_date} → {row.end_date}
                                  </div>
                                </button>
                              </div>
                              <div className="text-right tabular-nums">{row.impressions?.toLocaleString?.() ?? "0"}</div>
                              <div className="text-right tabular-nums">{row.clicks?.toLocaleString?.() ?? "0"}</div>
                              <div className="text-right tabular-nums">{row.conversions?.toLocaleString?.() ?? "0"}</div>
                              <div className="text-right tabular-nums">{formatEUR(row.spend)}</div>
                            </div>

                            {/* Timeline grid */}
                            <div
                              className="relative mt-2 grid h-6"
                              style={{
                                gridTemplateColumns: `repeat(${totalDays}, ${DAY_COL_WIDTH_PX}px)`,
                                overflowX: "auto",
                              }}
                            >
                              {/* background guides */}
                              {Array.from({ length: totalDays }).map((_, i) => (
                                <div key={i} className="border-r last:border-r-0 border-zinc-100/70" />
                              ))}
                              {/* bar */}
                              <div
                                className="absolute top-1 h-3 rounded bg-emerald-500/90"
                                style={{
                                  left: `${DAY_COL_WIDTH_PX * clamp(daysBetween(start, parseISO(row.start_date)), 0, totalDays)}px`,
                                  width: `${DAY_COL_WIDTH_PX * Math.max(1, daysBetween(parseISO(row.start_date), parseISO(row.end_date)))}px`,
                                }}
                                title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
