import React, { useMemo } from "react";

/**
 * Minimal Gantt renderer (no external libs)
 * - Left: flight + metrics
 * - Right: bars by date
 */

export type TimelineItem = {
  company_id?: string | null;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status?: string | null;
  priority?: number | null;

  // Optional metrics
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
  revenue?: number | null;
};

export type FlightsGanttProps = {
  items: TimelineItem[];
  from?: Date;
  to?: Date;
  campaignFilter?: string; // 'all' or campaign_id
  onSelect?: (t: TimelineItem) => void;
};

function parseISO(d: string) {
  const onlyDate = d.length === 10 ? d : d.slice(0, 10);
  const [y, m, day] = onlyDate.split("-").map(Number);
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

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-amber-400",
  draft: "bg-gray-300",
  completed: "bg-blue-500",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({
  items,
  from,
  to,
  campaignFilter = "all",
  onSelect,
}) => {
  const filtered = useMemo(() => {
    return campaignFilter === "all"
      ? items
      : items.filter((i) => i.campaign_id === campaignFilter);
  }, [items, campaignFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, { id: string; name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { id: it.campaign_id, name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    // sort rows by priority then start date
    for (const g of m.values()) {
      g.rows.sort((a, b) => {
        const pa = a.priority ?? 999;
        const pb = b.priority ?? 999;
        if (pa !== pb) return pa - pb;
        return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
      });
    }
    return Array.from(m.values());
  }, [filtered]);

  const { start, end, totalDays, ticks } = useMemo(() => {
    const starts = filtered.map((i) => parseISO(i.start_date));
    const ends = filtered.map((i) => parseISO(i.end_date));
    const min = from ?? (starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : new Date());
    const max = to ?? (ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : new Date(min.getTime() + 7 * 86400000));
    const total = Math.max(1, daysBetween(min, max));
    const tickLabels: string[] = [];
    const step = Math.max(1, Math.floor(total / 14));
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime());
      d.setDate(d.getDate() + i);
      tickLabels.push(
        `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`
      );
    }
    return { start: min, end: max, totalDays: total, ticks: tickLabels };
  }, [filtered, from, to]);

  const barFor = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(start, s), 0, totalDays);
    const widthDays = clamp(daysBetween(s, e), 0, totalDays);
    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = Math.max(0.75, (widthDays / totalDays) * 100);
    const color = STATUS_COLORS[(row.status || "").toLowerCase()] || STATUS_COLORS["draft"];
    return (
      <div className="relative h-8">
        <div
          className={`absolute h-3 rounded ${color} cursor-pointer`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "10px" }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
          onClick={() => onSelect?.(row)}
        />
      </div>
    );
  };

  if (!filtered.length) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      {/* header ticks */}
      <div className="mb-2 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
        {ticks.map((t, i) => (
          <span key={i} className="tabular-nums">{t}</span>
        ))}
      </div>

      <div className="space-y-6">
        {grouped.map((g, gi) => (
          <div key={gi} className="rounded-lg border p-0 overflow-hidden">
            {/* campaign header */}
            <div className="px-3 py-2 border-b bg-muted/40 font-medium">{g.name}</div>

            {/* grid */}
            <div className="grid grid-cols-12 gap-0">
              {/* left pane (metrics) */}
              <div className="col-span-4">
                <div className="grid grid-cols-5 text-[11px] px-3 py-2 text-muted-foreground border-b">
                  <div className="col-span-2">Flight</div>
                  <div className="text-right">Imp</div>
                  <div className="text-right">Clicks</div>
                  <div className="text-right">ROAS</div>
                </div>
                {g.rows.map((r) => {
                  const imp = r.impressions ?? null;
                  const clk = r.clicks ?? null;
                  const spend = r.spend ?? 0;
                  const rev = r.revenue ?? 0;
                  const roas = spend > 0 ? rev / spend : null;
                  return (
                    <div key={r.flight_id} className="grid grid-cols-5 items-center px-3 py-1 border-b">
                      <div className="col-span-2">
                        <div className="text-sm">{r.flight_name}</div>
                        <div className="text-[10px] text-muted-foreground">{r.start_date} → {r.end_date}</div>
                      </div>
                      <div className="text-right text-sm tabular-nums">{imp ?? "-"}</div>
                      <div className="text-right text-sm tabular-nums">{clk ?? "-"}</div>
                      <div className="text-right text-sm tabular-nums">{roas === null ? "-" : roas.toFixed(2)}x</div>
                    </div>
                  );
                })}
              </div>

              {/* right pane (bars) */}
              <div className="col-span-8 border-l px-2 py-2">
                {g.rows.map((r) => (
                  <div key={r.flight_id} className="border-b py-1">{barFor(r)}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;
