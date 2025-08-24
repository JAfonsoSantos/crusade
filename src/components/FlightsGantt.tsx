import React, { useMemo, useState } from "react";

/** Timeline row coming from the DB view */
export type TimelineItem = {
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
  /** Optional filter by campaign_id ("all" shows every campaign) */
  campaignFilter?: string;
  /** Optional callback when a bar is clicked */
  onSelect?: (t: TimelineItem) => void;
};

/** --- Small date helpers --- */
function parseISO(d: string) {
  // tolerate YYYY-MM-DD or full ISO
  const only = d.length >= 10 ? d.slice(0, 10) : d;
  const [y, m, day] = only.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function daysBetween(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / ms));
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const STATUS_COLOR: Record<string, string> = {
  active: "#16a34a",     // green-600
  paused: "#f59e0b",     // amber-500
  completed: "#3b82f6",  // blue-500
  draft: "#a3a3a3",      // neutral-400
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({
  items,
  campaignFilter = "all",
  onSelect,
}) => {
  // ---- group rows by campaign ----
  const grouped = useMemo(() => {
    const selected = campaignFilter === "all"
      ? items
      : items.filter(i => i.campaign_id === campaignFilter);

    const by = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of selected) {
      const key = it.campaign_id || it.campaign_name;
      if (!by.has(key)) by.set(key, { name: it.campaign_name, rows: [] });
      by.get(key)!.rows.push(it);
    }
    // sort rows within each campaign by start date + priority
    for (const g of by.values()) {
      g.rows.sort((a, b) => {
        const ad = parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
        if (ad !== 0) return ad;
        return (a.priority || 99) - (b.priority || 99);
      });
    }
    // natural sort campaigns by name
    return Array.from(by.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, g]) => ({ id, ...g }));
  }, [items, campaignFilter]);

  // ---- global time window for header scale ----
  const { minDate, maxDate, totalDays, headerTicks } = useMemo(() => {
    if (items.length === 0) {
      const today = new Date();
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
      return {
        minDate: today,
        maxDate: nextWeek,
        totalDays: daysBetween(today, nextWeek),
        headerTicks: [] as string[],
      };
    }
    const starts = items.map(i => parseISO(i.start_date).getTime());
    const ends = items.map(i => parseISO(i.end_date).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));

    const total = Math.max(1, daysBetween(min, max));
    // build header ticks similar to the reference UI (weekly-ish / sparse)
    const ticks: string[] = [];
    const approx = 24; // around 24 labels
    const step = Math.max(1, Math.round(total / approx));
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime());
      d.setDate(d.getDate() + i);
      const day = d.getDate().toString().padStart(2, "0");
      const mon = (d.getMonth() + 1).toString().padStart(2, "0");
      ticks.push(`${day}/${mon}`);
    }
    return { minDate: min, maxDate: max, totalDays: total, headerTicks: ticks };
  }, [items]);

  // track expand/collapse per-campaign
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const renderBar = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(minDate, s), 0, totalDays);
    const widthDays = clamp(daysBetween(s, e), 0, totalDays);
    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = Math.max(1.5, (widthDays / totalDays) * 100);
    const color = STATUS_COLOR[(row.status || "").toLowerCase()] ?? STATUS_COLOR["draft"];
    return (
      <div className="relative w-full h-7">
        <div
          onClick={() => onSelect?.(row)}
          className="absolute top-2 h-3 rounded-full cursor-pointer transition-opacity hover:opacity-85"
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
      </div>
    );
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      {/* Header axis */}
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mb-4">
        {headerTicks.map((t, i) => (
          <span key={i} className="tabular-nums">{t}</span>
        ))}
      </div>

      {/* Campaign groups */}
      <div className="space-y-6">
        {grouped.map(g => {
          const isOpen = open[g.id] ?? true;
          return (
            <div key={g.id} className="rounded-xl border">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="font-medium">{g.name}</div>
                <button
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                  onClick={() => setOpen(o => ({ ...o, [g.id]: !isOpen }))}
                >
                  {isOpen ? "Collapse" : "Expand"}
                </button>
              </div>

              {isOpen && (
                <div className="px-4 pb-4">
                  {/* header row */}
                  <div className="grid grid-cols-[minmax(180px,1fr)_100px_100px_100px_140px_minmax(240px,1fr)] gap-3 px-2 py-2 text-xs text-muted-foreground">
                    <div>Flight</div>
                    <div className="text-right">Impr.</div>
                    <div className="text-right">Clicks</div>
                    <div className="text-right">Conv.</div>
                    <div className="text-right">Spend</div>
                    <div>Timeline</div>
                  </div>

                  {g.rows.map(r => (
                    <div
                      key={r.flight_id}
                      className="grid grid-cols-[minmax(180px,1fr)_100px_100px_100px_140px_minmax(240px,1fr)] gap-3 items-center rounded-md px-2 py-3 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="truncate">{r.flight_name}</div>
                        <div className="text-[11px] text-muted-foreground">{r.start_date} → {r.end_date}</div>
                      </div>
                      <div className="text-right tabular-nums">{r.impressions?.toLocaleString?.() ?? 0}</div>
                      <div className="text-right tabular-nums">{r.clicks?.toLocaleString?.() ?? 0}</div>
                      <div className="text-right tabular-nums">{r.conversions?.toLocaleString?.() ?? 0}</div>
                      <div className="text-right tabular-nums">
                        {typeof r.spend === "number"
                          ? r.spend.toLocaleString(undefined, { style: "currency", currency: "EUR" })
                          : "€0.00"}
                      </div>
                      <div>{renderBar(r)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlightsGantt;