
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
  // Performance (optional)
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
};

export type FlightsGanttProps = {
  items: TimelineItem[];
  from?: Date;
  to?: Date;
  onSelect?: (t: TimelineItem) => void;
  campaignFilter?: string;
};

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
const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  paused: "#f59e0b",
  draft: "#94a3b8",
  completed: "#3b82f6",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({
  items,
  from,
  to,
  onSelect,
  campaignFilter,
}) => {
  const filtered = useMemo(
    () =>
      campaignFilter
        ? items.filter((i) => i.campaign_id === campaignFilter)
        : items,
    [items, campaignFilter]
  );

  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[]; open: boolean }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [], open: true });
      m.get(key)!.rows.push(it);
    }
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v }));
  }, [filtered]);

  const { start, end, totalDays, ticks } = useMemo(() => {
    if (filtered.length === 0) {
      const today = new Date();
      const end = new Date(today.getTime() + 6 * 86400000);
      const t: string[] = [];
      for (let i = 0; i <= 6; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        t.push(`${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`);
      }
      return { start: today, end, totalDays: 6, ticks: t };
    }
    const starts = filtered.map((i) => parseISO(i.start_date).getTime());
    const ends = filtered.map((i) => parseISO(i.end_date).getTime());
    const min = from ?? new Date(Math.min(...starts));
    const max = to ?? new Date(Math.max(...ends));
    const total = Math.max(1, daysBetween(min, max));
    const step = Math.max(1, Math.floor(total / 14));
    const t: string[] = [];
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime() + i * 86400000);
      t.push(`${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`);
    }
    return { start: min, end: max, totalDays: total, ticks: t };
  }, [filtered, from, to]);

  const barStyle = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const left = (daysBetween(start, s) / totalDays) * 100;
    const width = Math.max(0.8, (daysBetween(s, e) / totalDays) * 100);
    const color = STATUS_COLORS[(row.status || "draft").toLowerCase()] || STATUS_COLORS.draft;
    return { left: `${left}%`, width: `${width}%`, backgroundColor: color };
  };

  return (
    <div className="w-full">
      {/* Header timeline ticks */}
      <div className="sticky top-0 z-10 mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {ticks.map((t, i) => (
          <span key={i} className="tabular-nums">{t}</span>
        ))}
      </div>

      {/* Table-like layout */}
      <div className="space-y-4">
        {grouped.map((g) => (
          <div key={g.id} className="rounded-lg border">
            <div className="flex items-center justify-between border-b p-3">
              <div className="font-medium">{g.name}</div>
              <div className="text-xs text-muted-foreground">
                {g.rows.length} flights
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 p-3">
              {/* Left columns (names + metrics) */}
              <div className="col-span-4">
                <div className="grid grid-cols-5 gap-2 text-[11px] font-medium text-muted-foreground px-1 pb-2">
                  <div className="col-span-2">Flight</div>
                  <div>Impr.</div>
                  <div>Clicks</div>
                  <div>Spend</div>
                </div>
                <div className="space-y-2">
                  {g.rows
                    .slice()
                    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
                    .map((r) => (
                      <div key={r.flight_id} className="grid grid-cols-5 gap-2 items-center px-1">
                        <div className="col-span-2 truncate text-sm">{r.flight_name}</div>
                        <div className="text-right tabular-nums text-xs">{r.impressions ?? 0}</div>
                        <div className="text-right tabular-nums text-xs">{r.clicks ?? 0}</div>
                        <div className="text-right tabular-nums text-xs">{(r.spend ?? 0).toFixed(2)}</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Gantt */}
              <div className="relative col-span-8">
                <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(to_right,#e5e7eb_0,#e5e7eb_1px,transparent_1px,transparent_32px)] rounded-md" />
                <div className="space-y-3 relative">
                  {g.rows
                    .slice()
                    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
                    .map((r) => (
                      <div key={r.flight_id} className="relative h-8">
                        <button
                          className="absolute h-3 rounded opacity-90 hover:opacity-100 transition-[opacity]"
                          style={{ ...barStyle(r), top: "10px" }}
                          title={`${r.flight_name} (${r.start_date} → ${r.end_date})`}
                          onClick={() => onSelect?.(r)}
                        />
                        <div className="text-[11px] text-muted-foreground">
                          {r.start_date} → {r.end_date}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;
