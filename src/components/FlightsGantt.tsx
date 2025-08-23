
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
  revenue?: number | null; // for ROAS if available
};

export type FlightsGanttProps = {
  items: TimelineItem[];
  from?: Date;
  to?: Date;
  onSelect?: (t: TimelineItem) => void;
  campaignFilter?: string | "all";
};

// ---------------- utils ----------------
function parseISO(d: string) {
  const s = d.length === 10 ? `${d}T00:00:00` : d;
  const dt = new Date(s);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
function daysBetween(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / ms));
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  paused: "#f59e0b",
  draft: "#9ca3af",
  completed: "#3b82f6",
};

// ---------------- Component ----------------
const FlightsGantt: React.FC<FlightsGanttProps> = ({
  items, from, to, onSelect, campaignFilter = "all"
}) => {
  // group by campaign
  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rows: TimelineItem[] }>();
    for (const it of items) {
      if (campaignFilter !== "all" && it.campaign_id !== campaignFilter) continue;
      const key = it.campaign_id || it.campaign_name;
      if (!map.has(key)) map.set(key, { id: it.campaign_id, name: it.campaign_name, rows: [] });
      map.get(key)!.rows.push(it);
    }
    const arr = Array.from(map.values());
    for (const g of arr) {
      g.rows.sort((a, b) => {
        const d = parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
        if (d !== 0) return d;
        return (a.priority ?? 99) - (b.priority ?? 99);
      });
    }
    arr.sort((a,b) => {
      const sa = Math.min(...a.rows.map(r => parseISO(r.start_date).getTime()));
      const sb = Math.min(...b.rows.map(r => parseISO(r.start_date).getTime()));
      return sa - sb;
    });
    return arr;
  }, [items, campaignFilter]);

  // time window
  const { start, end, totalDays, ticks } = useMemo(() => {
    const allStarts = items.map(i => parseISO(i.start_date));
    const allEnds = items.map(i => parseISO(i.end_date));
    const min = from ?? (allStarts.length ? new Date(Math.min(...allStarts.map(d => d.getTime()))) : new Date());
    const max = to ?? (allEnds.length ? new Date(Math.max(...allEnds.map(d => d.getTime()))) : new Date(min.getTime() + 30*86400000));
    const total = Math.max(1, daysBetween(min, max));
    const step = total > 90 ? 14 : total > 60 ? 7 : total > 30 ? 3 : 1;
    const labels: { day:number; label:string }[] = [];
    for (let i=0; i<=total; i+=step) {
      const dd = new Date(min.getTime()); dd.setDate(dd.getDate()+i);
      labels.push({
        day: i,
        label: `${(dd.getMonth()+1).toString().padStart(2,"0")}/${dd.getDate().toString().padStart(2,"0")}`
      });
    }
    return { start:min, end:max, totalDays: total, ticks: labels };
  }, [items, from, to]);

  // collapsible campaigns
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen(o => ({...o, [id]: !o[id]}));

  // layout sizes
  const leftW = 520;  // wider to host performance columns
  const rowH = 30;
  const headerH = 40;

  // columns config for the left grid
  const cols = [
    { key: "name", label: "Flight", width: 220 },
    { key: "status", label: "Status", width: 70 },
    { key: "priority", label: "Prio", width: 45 },
    { key: "impressions", label: "Imp", width: 70 },
    { key: "clicks", label: "Clicks", width: 60 },
    { key: "ctr", label: "CTR", width: 55 },
    { key: "conversions", label: "Conv", width: 60 },
    { key: "roas", label: "ROAS", width: 70 },
    { key: "spend", label: "Spend", width: 70 },
  ];
  const leftTotal = cols.reduce((a, c) => a + c.width, 0);
  const leftWidth = Math.max(leftW, leftTotal);

  // helpers for metrics
  const formatNumber = (n?: number | null) =>
    n == null ? "–" : Intl.NumberFormat().format(n);
  const formatPct = (n?: number | null) =>
    n == null ? "–" : `${(n*100).toFixed(1)}%`;
  const computeCTR = (imp?: number|null, clk?: number|null) =>
    imp && clk ? clk/imp : null;
  const computeROAS = (rev?: number|null, spend?: number|null) =>
    (rev != null && spend) ? (spend === 0 ? null : rev/spend) : null;

  const barStyle = (row: TimelineItem): React.CSSProperties => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(start, s), 0, totalDays);
    const widthDays = clamp(daysBetween(s, e), 0, totalDays) + 1;
    const left = (leftDays / totalDays) * 100;
    const width = (widthDays / totalDays) * 100;
    return {
      left: `${left}%`,
      width: `${width}%`,
      background: STATUS_COLOR[(row.status || "draft").toLowerCase()] || STATUS_COLOR["draft"],
    };
  };

  // render
  return (
    <div className="w-full rounded-lg border bg-background">
      {/* header: left columns + time ticks */}
      <div className="flex border-b" style={{ height: headerH }}>
        <div className="shrink-0 flex items-center text-xs text-muted-foreground" style={{ width: leftWidth }}>
          <div className="px-3 font-medium" style={{ width: cols[0].width }}>Campaign / Flight</div>
          {cols.slice(1).map((c) => (
            <div key={c.key} className="px-2" style={{ width: c.width }}>{c.label}</div>
          ))}
        </div>
        <div className="relative grow">
          <div className="absolute inset-0">
            {ticks.map((t, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-l" style={{ left: `${(t.day/totalDays)*100}%` }}>
                <div className="absolute -translate-x-1/2 top-1 left-0 text-[11px] text-muted-foreground whitespace-nowrap">{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="relative" style={{ maxHeight: 620, overflow: "auto" }}>
        <div className="flex relative">
          {/* LEFT GRID */}
          <div className="shrink-0" style={{ width: leftWidth }}>
            {grouped.map((g) => {
              const isOpen = open[g.id] ?? true;
              return (
                <div key={g.id}>
                  <div
                    className="flex items-center gap-2 h-9 border-b bg-muted/40 px-3 cursor-pointer"
                    onClick={() => toggle(g.id)}
                  >
                    <span className="text-xs font-semibold">{isOpen ? "▾" : "▸"}</span>
                    <span className="text-sm font-medium truncate">{g.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{g.rows.length} flights</span>
                  </div>
                  {isOpen && g.rows.map((r) => {
                    const ctr = computeCTR(r.impressions ?? null, r.clicks ?? null);
                    const roas = computeROAS(r.revenue ?? null, r.spend ?? null);
                    return (
                      <div key={r.flight_id} className="flex items-center h-8 border-b text-sm">
                        <button
                          className="px-3 text-left hover:underline truncate"
                          style={{ width: cols[0].width }}
                          onClick={() => onSelect?.(r)}
                          title="Open details"
                        >
                          {r.flight_name}
                        </button>
                        <div style={{ width: cols[1].width }} className="px-2 text-[12px]">{(r.status || "draft")}</div>
                        <div style={{ width: cols[2].width }} className="px-2 text-[12px]">{r.priority ?? "–"}</div>
                        <div style={{ width: cols[3].width }} className="px-2 text-[12px]">{formatNumber(r.impressions)}</div>
                        <div style={{ width: cols[4].width }} className="px-2 text-[12px]">{formatNumber(r.clicks)}</div>
                        <div style={{ width: cols[5].width }} className="px-2 text-[12px]">{formatPct(ctr)}</div>
                        <div style={{ width: cols[6].width }} className="px-2 text-[12px]">{formatNumber(r.conversions)}</div>
                        <div style={{ width: cols[7].width }} className="px-2 text-[12px]">{roas == null ? "–" : roas.toFixed(2)}</div>
                        <div style={{ width: cols[8].width }} className="px-2 text-[12px]">{r.spend == null ? "–" : `€${(r.spend as number).toFixed(2)}`}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* RIGHT GANTT */}
          <div className="relative grow">
            {/* vertical lines */}
            <div className="absolute inset-0">
              {Array.from({ length: totalDays + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l"
                  style={{
                    left: `${(i/totalDays)*100}%`,
                    borderColor: i % 7 === 0 ? "rgba(148,163,184,0.35)" : "rgba(226,232,240,0.6)",
                  }}
                />
              ))}
            </div>

            {/* rows + bars */}
            <div className="relative">
              {/* collect row offset */}
              {grouped.map((g, gi) => {
                const isOpen = open[g.id] ?? true;
                // count rows before
                let before = 0;
                for (let k=0;k<gi;k++) {
                  const gg = grouped[k];
                  before += 1 + ((open[gg.id] ?? true) ? gg.rows.length : 0);
                }
                const rowBase = before + 1;
                return (
                  <div key={g.id}>
                    {/* campaign separator row */}
                    <div className="absolute left-0 right-0" style={{ top: before*rowH, height: rowH }} />
                    {/* bars */}
                    {isOpen && g.rows.map((r, i) => {
                      const idx = rowBase + i;
                      return (
                        <div
                          key={r.flight_id}
                          className="absolute left-0 right-0 px-2"
                          style={{ top: idx*rowH + 8, height: rowH - 16 }}
                        >
                          <button
                            className="h-3 w-full rounded opacity-90 hover:opacity-100 transition-shadow shadow"
                            style={barStyle(r)}
                            onClick={() => onSelect?.(r)}
                            title={`${r.flight_name} • ${r.start_date} → ${r.end_date}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* dynamic container height spacer */}
              <div style={{ height: (grouped.reduce((acc, g) => acc + 1 + ((open[g.id] ?? true) ? g.rows.length : 0), 0) + 1) * rowH }} />
            </div>
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="flex gap-4 px-3 py-2 text-xs border-t text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{background: STATUS_COLOR.active}}></span>Active</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{background: STATUS_COLOR.paused}}></span>Paused</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{background: STATUS_COLOR.completed}}></span>Completed</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{background: STATUS_COLOR.draft}}></span>Draft</span>
      </div>
    </div>
  );
};

export default FlightsGantt;
