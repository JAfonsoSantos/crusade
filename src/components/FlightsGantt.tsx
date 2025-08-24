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
  /** drilldown: month | week | day */
  view?: "month" | "week" | "day";
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
const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" });
const fmtMonth = new Intl.DateTimeFormat(undefined, { month: "short" });
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
  view = "month",
  onSelect,
}: FlightsGanttProps) {
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

  // viewport (shared for header + bars)
  const { min, max } = useMemo(() => {
    if (!filtered.length) {
      const today = new Date();
      return { min: startOfMonth(today), max: addMonths(startOfMonth(today), 1) };
    }
    const s = Math.min(...filtered.map(r => toDate(r.start_date).getTime()));
    const e = Math.max(...filtered.map(r => toDate(r.end_date).getTime()));
    let minD = new Date(s);
    let maxD = new Date(e);
    if (view === "day") {
      minD = startOfWeek(minD);
      maxD = addWeeks(startOfWeek(maxD), 1);
    } else if (view === "week") {
      minD = startOfWeek(minD);
      maxD = addWeeks(startOfWeek(maxD), 1);
    } else { // month
      minD = startOfMonth(minD);
      maxD = addMonths(startOfMonth(maxD), 1);
    }
    return { min: minD, max: maxD };
  }, [filtered, view]);

  const totalMs = Math.max(1, max.getTime() - min.getTime());

  const ticks = useMemo(() => {
    const out: { key: string; label: string; leftPct: number }[] = [];
    if (view === "day") {
      for (let d = new Date(min); d < max; d = addDays(d, 1)) {
        const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
        out.push({ key: d.toISOString(), label: fmt.format(d), leftPct: left });
      }
    } else if (view === "week") {
      for (let d = new Date(min); d < max; d = addWeeks(d, 1)) {
        const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
        const end = addDays(addWeeks(d,1), -1);
        out.push({ key: d.toISOString(), label: `${fmt.format(d)} – ${fmt.format(end)}`, leftPct: left });
      }
    } else {
      for (let d = new Date(min); d < max; d = addMonths(d, 1)) {
        const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
        out.push({ key: d.toISOString(), label: fmtMonth.format(d), leftPct: left });
      }
    }
    return out;
  }, [min, max, totalMs, view]);

  const barFor = (row: TimelineItem) => {
    const s = toDate(row.start_date);
    const e = toDate(row.end_date);
    const sMs = clamp(s.getTime(), min.getTime(), max.getTime());
    const eMs = clamp(e.getTime(), min.getTime(), max.getTime());
    const leftPct = ((sMs - min.getTime()) / totalMs) * 100;
    const widthPct = Math.max(0.5, ((eMs - sMs) / totalMs) * 100);
    const c = colors[(row.status || "draft").toLowerCase()] || colors["draft"];
    return (
      <div className="relative h-5 w-full">
        <div
          className={`absolute h-2 rounded ${c}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "6px" }}
          role="button"
          aria-label={`${row.flight_name} ${row.start_date} to ${row.end_date}`}
          onClick={() => onSelect?.(row)}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* header scale */}
      <div className="relative mb-3 h-8">
        {ticks.map(t => (
          <div
            key={t.key}
            className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
            style={{ left: `${t.leftPct}%` }}
          >
            {t.label}
          </div>
        ))}
        <div className="absolute bottom-0 left-0 right-0 border-b border-border" />
      </div>

      {/* groups */}
      <div className="space-y-6">
        {groups.map(g => (
          <div key={g.id} className="rounded-lg border">
            <div className="px-3 py-2 text-sm font-medium">{g.name}</div>
            <div className="divide-y">
              {/* header row */}
              <div className="grid grid-cols-7 gap-2 px-3 py-2 text-xs text-muted-foreground">
                <div>Flight</div>
                <div className="text-right">Impr.</div>
                <div className="text-right">Clicks</div>
                <div className="text-right">Conv.</div>
                <div className="text-right">Spend</div>
                <div className="col-span-2">Timeline</div>
              </div>
              {g.rows.map(r => (
                <div key={r.flight_id} className="grid grid-cols-7 gap-2 items-center px-3 py-2">
                  <div className="truncate">{r.flight_name}</div>
                  <div className="text-right tabular-nums">{r.impressions?.toLocaleString?.() ?? "—"}</div>
                  <div className="text-right tabular-nums">{r.clicks?.toLocaleString?.() ?? "—"}</div>
                  <div className="text-right tabular-nums">{r.conversions?.toLocaleString?.() ?? "—"}</div>
                  <div className="text-right tabular-nums">
                    {typeof r.spend === "number"
                      ? r.spend.toLocaleString(undefined, { style: "currency", currency: "EUR" })
                      : "—"}
                  </div>
                  <div className="col-span-2">{barFor(r)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
