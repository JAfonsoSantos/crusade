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
    /** optional campaign filter (id) */
    campaignFilter?: string;
    /** when a bar (flight) is clicked */
    onSelect?: (t: TimelineItem) => void;
  };

  // ---- utils
  const DAY_MS = 86400000;
  const toDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const fmtMonth = new Intl.DateTimeFormat(undefined, { month: "short" });
  const fmtWeek = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" });
  
  const colors: Record<string, string> = {
    active: "bg-emerald-500",
    paused: "bg-amber-500",
    draft: "bg-slate-400",
    completed: "bg-blue-500",
  };

  function startOfWeek(d: Date) {
    const nd = new Date(d);
    const dow = nd.getDay(); // 0..6
    const diff = (dow + 6) % 7; // make Monday=0
    nd.setDate(nd.getDate() - diff);
    nd.setHours(0,0,0,0);
    return nd;
  }

  function startOfMonth(d: Date) {
    const nd = new Date(d.getFullYear(), d.getMonth(), 1);
    nd.setHours(0,0,0,0);
    return nd;
  }

  function addDays(d: Date, n: number) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + n);
    return nd;
  }

  function addWeeks(d: Date, n: number) {
    return addDays(d, n*7);
  }

  function addMonths(d: Date, n: number) {
    const nd = new Date(d);
    nd.setMonth(nd.getMonth() + n);
    return nd;
  }

  export default function FlightsGantt({
    items,
    campaignFilter,
    onSelect,
  }: FlightsGanttProps) {
    const [zoomLevel, setZoomLevel] = useState<"month" | "week" | "day">("month");
    
    const handleZoomClick = () => {
      if (zoomLevel === "month") setZoomLevel("week");
      else if (zoomLevel === "week") setZoomLevel("day");
      else setZoomLevel("month");
    };

    const filtered = useMemo(() => {
      const arr = campaignFilter && campaignFilter !== "all"
        ? items.filter(i => i.campaign_id === campaignFilter)
        : items.slice();
      return arr.sort((a, b) => (a.campaign_name || "").localeCompare(b.campaign_name || ""));
    }, [items, campaignFilter]);

    // groups by campaign
    const groups = useMemo(() => {
      const m = new Map<string, { name: string; rows: TimelineItem[] }>();
      for (const it of filtered) {
        const k = it.campaign_id || it.campaign_name;
        if (!m.has(k)) m.set(k, { name: it.campaign_name, rows: [] });
        m.get(k)!.rows.push(it);
      }
      // sort rows by start date
      for (const g of m.values()) {
        g.rows.sort((a,b) => toDate(a.start_date).getTime() - toDate(b.start_date).getTime());
      }
      return Array.from(m.entries()).map(([id, g]) => ({ id, ...g }));
    }, [filtered]);

    // viewport calculation
    const { min, max } = useMemo(() => {
      if (!filtered.length) {
        const today = new Date();
        return { min: startOfMonth(today), max: addMonths(startOfMonth(today), 1) };
      }
      const s = Math.min(...filtered.map(r => toDate(r.start_date).getTime()));
      const e = Math.max(...filtered.map(r => toDate(r.end_date).getTime()));
      let minD = new Date(s);
      let maxD = new Date(e);
      
      if (zoomLevel === "day") {
        minD = startOfWeek(minD);
        maxD = addWeeks(startOfWeek(maxD), 2);
      } else if (zoomLevel === "week") {
        minD = startOfWeek(minD);
        maxD = addWeeks(startOfWeek(maxD), 4);
      } else { // month
        minD = startOfMonth(minD);
        maxD = addMonths(startOfMonth(maxD), 2);
      }
      return { min: minD, max: maxD };
    }, [filtered, zoomLevel]);

    const totalMs = Math.max(1, max.getTime() - min.getTime());

    // timeline ticks based on zoom level
    const ticks = useMemo(() => {
      const out: { key: string; label: string; leftPct: number; isMainTick?: boolean }[] = [];
      
      if (zoomLevel === "day") {
        for (let d = new Date(min); d < max; d = addDays(d, 1)) {
          const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
          const isMonday = d.getDay() === 1;
          out.push({ 
            key: d.toISOString(), 
            label: fmtDay.format(d), 
            leftPct: left,
            isMainTick: isMonday
          });
        }
      } else if (zoomLevel === "week") {
        for (let d = new Date(min); d < max; d = addWeeks(d, 1)) {
          const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
          const isFirstOfMonth = d.getDate() <= 7;
          out.push({ 
            key: d.toISOString(), 
            label: fmtWeek.format(d), 
            leftPct: left,
            isMainTick: isFirstOfMonth
          });
        }
      } else {
        for (let d = new Date(min); d < max; d = addMonths(d, 1)) {
          const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
          out.push({ 
            key: d.toISOString(), 
            label: fmtMonth.format(d), 
            leftPct: left,
            isMainTick: true
          });
        }
      }
      return out;
    }, [min, max, totalMs, zoomLevel]);

    const barFor = (row: TimelineItem) => {
      const s = toDate(row.start_date);
      const e = toDate(row.end_date);
      const sMs = clamp(s.getTime(), min.getTime(), max.getTime());
      const eMs = clamp(e.getTime(), min.getTime(), max.getTime());
      const leftPct = ((sMs - min.getTime()) / totalMs) * 100;
      const widthPct = Math.max(0.5, ((eMs - sMs) / totalMs) * 100);
      const c = colors[(row.status || "draft").toLowerCase()] || colors["draft"];
      
      return (
        <div
          className={`absolute h-4 rounded-sm ${c} cursor-pointer hover:opacity-80 transition-opacity flex items-center px-1`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "4px" }}
          onClick={() => onSelect?.(row)}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        >
          {widthPct > 8 && (
            <span className="text-white text-xs font-medium truncate">
              {row.flight_name}
            </span>
          )}
        </div>
      );
    };

    return (
      <div className="w-full bg-background">
        {/* Header with zoom control */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Campaign Timeline</h3>
          <button
            onClick={handleZoomClick}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            {zoomLevel === "month" ? "Monthly View" : zoomLevel === "week" ? "Weekly View" : "Daily View"}
          </button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {/* Timeline header */}
          <div className="flex bg-muted">
            <div className="w-80 p-3 border-r border-border">
              <div className="text-sm font-medium">Campaign / Flight</div>
            </div>
            <div className="flex-1 relative h-16">
              {/* Grid lines */}
              {ticks.map(t => (
                <div
                  key={`grid-${t.key}`}
                  className={`absolute top-0 bottom-0 ${t.isMainTick ? 'border-l-2 border-border' : 'border-l border-border/50'}`}
                  style={{ left: `${t.leftPct}%` }}
                />
              ))}
              
              {/* Timeline labels */}
              {ticks.map(t => (
                <div
                  key={t.key}
                  className={`absolute top-2 text-xs ${t.isMainTick ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                  style={{ left: `${t.leftPct}%`, transform: 'translateX(-50%)' }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline body */}
          <div className="divide-y divide-border">
            {groups.map(group => (
              <div key={group.id}>
                {/* Campaign header */}
                <div className="flex bg-muted/50">
                  <div className="w-80 p-2 border-r border-border font-medium text-sm">
                    {group.name}
                  </div>
                  <div className="flex-1" />
                </div>
                
                {/* Flight rows */}
                {group.rows.map(row => (
                  <div key={row.flight_id} className="flex hover:bg-muted/25 transition-colors">
                    <div className="w-80 p-3 border-r border-border">
                      <div className="text-sm truncate">{row.flight_name}</div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>{row.impressions?.toLocaleString?.() ?? "—"} imp</span>
                        <span>{row.clicks?.toLocaleString?.() ?? "—"} clicks</span>
                        <span>
                          {typeof row.spend === "number"
                            ? row.spend.toLocaleString(undefined, { style: "currency", currency: "EUR" })
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 relative h-12">
                      {/* Grid lines */}
                      {ticks.map(t => (
                        <div
                          key={`row-grid-${t.key}`}
                          className={`absolute top-0 bottom-0 ${t.isMainTick ? 'border-l border-border' : 'border-l border-border/30'}`}
                          style={{ left: `${t.leftPct}%` }}
                        />
                      ))}
                      
                      {/* Flight bar */}
                      {barFor(row)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
