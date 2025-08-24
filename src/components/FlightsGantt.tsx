import React, { useMemo, useState } from "react";

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
  campaignFilter?: string; // "all" or campaign_id
  onSelect?: (t: TimelineItem) => void;
};

// utils
function parseISO(d: string) {
  const [y, m, day] = (d.length === 10 ? d : d.slice(0, 10)).split("-").map(Number);
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
  active: "bg-green-500",
  paused: "bg-amber-400",
  draft: "bg-gray-300",
  completed: "bg-blue-500",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect }) => {
  // filter by campaign if needed
  const filtered = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return campaignFilter === "all" ? items : items.filter(i => i.campaign_id === campaignFilter);
  }, [items, campaignFilter]);

  // campaign -> rows
  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[]; open: boolean }>();
    for (const it of filtered) {
      if (!m.has(it.campaign_id)) m.set(it.campaign_id, { name: it.campaign_name, rows: [], open: false });
      m.get(it.campaign_id)!.rows.push(it);
    }
    return Array.from(m.entries()).map(([id, g]) => ({ id, ...g }));
  }, [filtered]);

  // viewport: min start to max end across filtered
  const { start, end, totalDays, ticks } = useMemo(() => {
    const s = filtered.map(i => parseISO(i.start_date));
    const e = filtered.map(i => parseISO(i.end_date));
    const min = s.length ? new Date(Math.min(...s.map(d => d.getTime()))) : new Date();
    const max = e.length ? new Date(Math.max(...e.map(d => d.getTime()))) : new Date(min.getTime() + 7 * 86400000);
    const total = Math.max(1, daysBetween(min, max));
    const labels: string[] = [];
    // pick ~14 evenly spaced ticks
    const step = Math.max(1, Math.floor(total / 14));
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime()); d.setDate(d.getDate() + i);
      labels.push(`${d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}`);
    }
    return { start: min, end: max, totalDays: total, ticks: labels };
  }, [filtered]);

  const Bar: React.FC<{ row: TimelineItem }> = ({ row }) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(start, s), 0, totalDays);
    const widthDays = clamp(daysBetween(s, e), 0, totalDays);
    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = Math.max(1, (widthDays / totalDays) * 100);
    const color = STATUS_COLOR[(row.status || "").toLowerCase()] || STATUS_COLOR["draft"];
    return (
      <div className="relative h-6">
        <div
          className={`absolute top-1 h-3 rounded ${color}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
      </div>
    );
  };

  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setOpen((p) => ({ ...p, [id]: !p[id] }));

  if (!filtered.length) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      {/* timeline ticks */}
      <div className="mb-3 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
        {ticks.map((t, i) => (
          <span key={i} className="tabular-nums">{t}</span>
        ))}
      </div>

      <div className="space-y-6">
        {grouped.sort((a,b) => a.name.localeCompare(b.name)).map(g => (
          <div key={g.id} className="rounded-lg border">
            <div className="flex items-center justify-between p-4">
              <div className="font-medium">{g.name}</div>
              <button
                onClick={() => toggle(g.id)}
                className="text-sm text-primary hover:underline focus:outline-none"
              >
                {open[g.id] ? "Collapse" : "Expand"}
              </button>
            </div>

            {open[g.id] && (
              <div className="px-4 pb-4">
                {/* header row */}
                <div className="grid grid-cols-[minmax(180px,1fr)_90px_90px_90px_140px_minmax(220px,1.5fr)] items-center px-2 py-2 text-xs text-muted-foreground">
                  <div>Flight</div>
                  <div className="text-right">Impr.</div>
                  <div className="text-right">Clicks</div>
                  <div className="text-right">Conv.</div>
                  <div className="text-right">Spend</div>
                  <div>Timeline</div>
                </div>

                <div className="divide-y">
                  {g.rows
                    .slice()
                    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                    .map(row => (
                      <button
                        key={row.flight_id}
                        onClick={() => onSelect?.(row)}
                        className="w-full text-left hover:bg-muted/40 focus:bg-muted/40 rounded transition"
                      >
                        <div className="grid grid-cols-[minmax(180px,1fr)_90px_90px_90px_140px_minmax(220px,1.5fr)] items-center px-2 py-3">
                          <div>
                            <div className="font-medium">{row.flight_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {row.start_date} → {row.end_date}
                            </div>
                          </div>
                          <div className="text-right tabular-nums">{row.impressions?.toLocaleString?.() ?? "0"}</div>
                          <div className="text-right tabular-nums">{row.clicks?.toLocaleString?.() ?? "0"}</div>
                          <div className="text-right tabular-nums">{row.conversions?.toLocaleString?.() ?? "0"}</div>
                          <div className="text-right tabular-nums">
                            {typeof row.spend === "number"
                              ? row.spend.toLocaleString(undefined, { style: "currency", currency: "EUR" })
                              : "€0"}
                          </div>
                          <div><Bar row={row} /></div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;