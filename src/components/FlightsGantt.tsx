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
  onSelect?: (it: TimelineItem) => void;
};

type ViewMode = "month" | "week" | "day";

function parseISO(d: string) {
  const onlyDate = d.length === 10 ? d : d.slice(0, 10);
  const [y, m, day] = onlyDate.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function addDays(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function iso(d: Date) {
  return d.toISOString().slice(0,10);
}

const STATUS_COLOR = (s?: string | null) => {
  const v = (s || "").toLowerCase();
  if (v === "active") return "bg-emerald-500";
  if (v === "paused") return "bg-amber-500";
  if (v === "completed") return "bg-blue-500";
  return "bg-gray-400";
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect }) => {
  const filtered = useMemo(() => {
    return (items || []).filter(i => campaignFilter === "all" ? true : i.campaign_id === campaignFilter);
  }, [items, campaignFilter]);

  // group by campaign
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    // sort rows by start date / priority
    const arr = Array.from(m.entries()).map(([id, g]) => {
      g.rows.sort((a,b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime() || (a.priority||99) - (b.priority||99));
      return { id, ...g };
    });
    arr.sort((a,b) => a.name.localeCompare(b.name));
    return arr;
  }, [filtered]);

  // determine global range
  const range = useMemo(() => {
    if (!filtered.length) {
      const today = stripTime(new Date());
      return { min: startOfMonth(today), max: endOfMonth(today) };
    }
    const allStarts = filtered.map(r => parseISO(r.start_date).getTime());
    const allEnds = filtered.map(r => parseISO(r.end_date).getTime());
    const min = new Date(Math.min(...allStarts));
    const max = new Date(Math.max(...allEnds));
    return { min: startOfMonth(min), max: endOfMonth(max) };
  }, [filtered]);

  // drilldown state
  const [mode, setMode] = useState<ViewMode>("month");
  const [monthCursor, setMonthCursor] = useState<Date>(range.min);
  const [weekCursor, setWeekCursor] = useState<Date>(range.min); // start of selected week

  // recompute when range changes
  React.useEffect(() => {
    setMonthCursor(range.min);
    setWeekCursor(range.min);
    setMode("month");
  }, [range.min.getTime(), range.max.getTime()]);

  // helpers to build ticks for each mode
  const monthTicks = useMemo(() => {
    const ticks: { label: string; date: Date }[] = [];
    const d = new Date(range.min.getFullYear(), range.min.getMonth(), 1);
    while (d <= range.max) {
      ticks.push({ label: d.toLocaleDateString(undefined, { month: "short" }), date: new Date(d.getTime()) });
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }, [range.min, range.max]);

  function weeksInMonth(base: Date) {
    const start = startOfMonth(base);
    const end = endOfMonth(base);
    const out: { start: Date; label: string }[] = [];
    let cur = start;
    // align to Monday (or Sunday, depending on locale). We'll use Monday.
    const day = cur.getDay(); // 0 Sun .. 6 Sat
    const offset = (day === 0 ? 6 : day - 1); // days since Monday
    cur = addDays(cur, -offset);
    while (cur <= end) {
      const lbl = `${cur.getDate()}/${(cur.getMonth()+1).toString().padStart(2,"0")}`;
      out.push({ start: stripTime(cur), label: lbl });
      cur = addDays(cur, 7);
    }
    return out;
  }

  function daysInWeek(weekStart: Date) {
    return Array.from({length:7}).map((_,i) => {
      const d = addDays(weekStart, i);
      return { date: d, label: `${d.getDate()}/${(d.getMonth()+1).toString().padStart(2,"0")}` };
    });
  }

  // viewport for progress bar computations
  const viewport = useMemo(() => {
    if (mode === "month") {
      const start = startOfMonth(monthCursor);
      const end = endOfMonth(monthCursor);
      return { start, end };
    }
    if (mode === "week") {
      const start = stripTime(weekCursor);
      const end = addDays(start, 6);
      return { start, end };
    }
    // day mode: single day viewport
    const start = stripTime(weekCursor);
    return { start, end: start };
  }, [mode, monthCursor, weekCursor]);

  function overlapPct(startISO: string, endISO: string) {
    const s = stripTime(parseISO(startISO));
    const e = stripTime(parseISO(endISO));
    const vS = viewport.start;
    const vE = viewport.end;
    const total = Math.max(1, (vE.getTime() - vS.getTime()) / 86400000 + 1);
    // if no overlap
    if (e < vS || s > vE) return { left: 0, width: 0 };
    const leftDays = Math.max(0, (Math.max(s.getTime(), vS.getTime()) - vS.getTime()) / 86400000);
    const rightClamp = Math.min(e.getTime(), vE.getTime());
    const widthDays = (rightClamp - Math.max(s.getTime(), vS.getTime())) / 86400000 + 1;
    const leftPct = (leftDays / total) * 100;
    const widthPct = clamp((widthDays / total) * 100, 0, 100);
    return { left: leftPct, width: widthPct };
  }

  const HeaderTicks = () => {
    if (mode === "month") {
      return (
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
          {monthTicks.map((t,i) => (
            <button
              key={i}
              className={`rounded px-2 py-1 ${t.date.getMonth()===monthCursor.getMonth() && t.date.getFullYear()===monthCursor.getFullYear() ? "bg-muted font-medium" : "hover:bg-muted"}`}
              onClick={() => { setMonthCursor(t.date); setMode("week"); setWeekCursor(startOfMonth(t.date)); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      );
    }
    if (mode === "week") {
      const weeks = weeksInMonth(monthCursor);
      return (
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <button className="underline hover:no-underline" onClick={() => setMode("month")}>Back</button>
          {weeks.map((w,i) => (
            <button
              key={i}
              className={`rounded px-2 py-1 ${iso(w.start)===iso(weekCursor) ? "bg-muted font-medium" : "hover:bg-muted"}`}
              onClick={() => { setWeekCursor(w.start); setMode("day"); }}
            >
              {w.label}
            </button>
          ))}
        </div>
      );
    }
    // day
    const days = daysInWeek(weekCursor);
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <button className="underline hover:no-underline" onClick={() => setMode("week")}>Back</button>
        {days.map((d,i) => (
          <button
            key={i}
            className={`rounded px-2 py-1 ${iso(d.date)===iso(viewport.start) ? "bg-muted font-medium" : "hover:bg-muted"}`}
            onClick={() => { setWeekCursor(stripTime(d.date)); }}
          >
            {d.label}
          </button>
        ))}
      </div>
    );
  };

  const Row = ({ r }: { r: TimelineItem }) => {
    const pos = overlapPct(r.start_date, r.end_date);
    const has = pos.width > 0.25;
    const color = STATUS_COLOR(r.status);
    return (
      <div className="grid grid-cols-[minmax(180px,1fr)_100px_90px_90px_120px_minmax(240px,1fr)] items-center py-2 gap-3 text-sm">
        <div className="truncate">
          <button
            className="text-left hover:underline"
            title={`${r.flight_name} — ${r.start_date} → ${r.end_date}`}
            onClick={() => onSelect?.(r)}
          >
            {r.flight_name}
          </button>
          <div className="text-[11px] text-muted-foreground tabular-nums">{r.start_date} → {r.end_date}</div>
        </div>
        <div className="text-right tabular-nums">{r.impressions?.toLocaleString?.() ?? 0}</div>
        <div className="text-right tabular-nums">{r.clicks?.toLocaleString?.() ?? 0}</div>
        <div className="text-right tabular-nums">{r.conversions?.toLocaleString?.() ?? 0}</div>
        <div className="text-right tabular-nums">{typeof r.spend === "number" ? r.spend.toLocaleString(undefined,{style:"currency",currency:"EUR"}) : "€0"}</div>
        <div className="relative h-4 rounded bg-muted">
          {has && (
            <div
              className={`absolute h-4 rounded ${color}`}
              style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
              title={`${r.flight_name} — ${r.start_date} → ${r.end_date}`}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* ticks / drilldown */}
      <div className="mb-3">
        <HeaderTicks />
      </div>

      {/* header row */}
      <div className="grid grid-cols-[minmax(180px,1fr)_100px_90px_90px_120px_minmax(240px,1fr)] gap-3 px-2 py-2 text-xs text-muted-foreground border-b">
        <div>Flight</div>
        <div className="text-right">Impr.</div>
        <div className="text-right">Clicks</div>
        <div className="text-right">Conv.</div>
        <div className="text-right">Spend</div>
        <div>Timeline</div>
      </div>

      {/* groups */}
      <div className="divide-y">
        {groups.map((g) => (
          <div key={g.id} className="py-3">
            <div className="mb-2 font-medium text-base">{g.name}</div>
            <div className="space-y-1">
              {g.rows.map((r) => <Row key={r.flight_id} r={r} />)}
            </div>
          </div>
        ))}
        {!groups.length && (
          <div className="text-sm text-muted-foreground py-8">No flights to display for this selection.</div>
        )}
      </div>
    </div>
  );
};

export default FlightsGantt;
