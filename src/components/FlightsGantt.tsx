import React, { useMemo } from "react";

export type TimelineItem = {
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  priority?: number | null;
  status?: string | null;
};

export type FlightsGanttProps = {
  items: TimelineItem[];
  from?: Date;
  to?: Date;
};

/** Parse "YYYY-MM-DD" or ISO to a UTC-midrnight Date (timezone-safe). */
function parseUTC(dateStr: string): Date {
  const s = dateStr.length === 10 ? dateStr : dateStr.slice(0, 10);
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  // UTC midnight to avoid local TZ shifting the day
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0));
}

function daysBetweenUTC(a: Date, b: Date): number {
  const msDay = 24 * 60 * 60 * 1000;
  const aUTC = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUTC = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.max(0, Math.round((bUTC - aUTC) / msDay));
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

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, from, to }) => {
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of items) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    // Sort rows inside each campaign by priority then date
    for (const g of m.values()) {
      g.rows.sort((a, b) => (a.priority || 99) - (b.priority || 99) || a.start_date.localeCompare(b.start_date));
    }
    return Array.from(m.values());
  }, [items]);

  const viewport = useMemo(() => {
    if (!items.length) {
      const today = new Date();
      return { start: today, end: new Date(today.getTime() + 7 * 86400000), totalDays: 7, ticks: ["Today"] };
    }
    const starts = items.map((i) => parseUTC(i.start_date));
    const ends = items.map((i) => parseUTC(i.end_date));
    const minStart = starts.reduce((a, b) => (a < b ? a : b));
    const maxEnd = ends.reduce((a, b) => (a > b ? a : b));
    const pad = 2; // a little breathing room
    const start = from ?? new Date(minStart.getTime() - pad * 86400000);
    const end = to ?? new Date(maxEnd.getTime() + pad * 86400000);
    const totalDays = Math.max(1, daysBetweenUTC(start, end));

    // Build ~12 evenly spaced tick labels
    const tickCount = Math.min(12, totalDays + 1);
    const step = totalDays / (tickCount - 1 || 1);
    const ticks: string[] = [];
    for (let i = 0; i < tickCount; i++) {
      const d = new Date(start.getTime() + Math.round(i * step) * 86400000);
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      ticks.push(`${mm}/${dd}`);
    }
    return { start, end, totalDays, ticks };
  }, [items, from, to]);

  const { start, totalDays, ticks } = viewport;

  const Bar: React.FC<{ row: TimelineItem }> = ({ row }) => {
    const s = parseUTC(row.start_date);
    const e = parseUTC(row.end_date);
    const leftDays = clamp(daysBetweenUTC(start, s), 0, totalDays);
    const widthDays = clamp(daysBetweenUTC(s, e), 0, totalDays);
    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = Math.max(1, (widthDays / totalDays) * 100); // ensure visible
    const color = STATUS_COLORS[(row.status || "").toLowerCase()] || STATUS_COLORS["draft"];

    return (
      <div className="relative h-8">
        <div
          className={`absolute h-3 rounded ${color}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "10px" }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
        <div className="text-xs text-muted-foreground truncate">{row.flight_name}</div>
        <div className="text-[10px] text-muted-foreground">{row.start_date} → {row.end_date}</div>
      </div>
    );
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      {/* Header ticks */}
      <div className="mb-2 grid" style={{ gridTemplateColumns: `repeat(${ticks.length}, minmax(0, 1fr))` }}>
        {ticks.map((t, i) => (
          <div key={i} className="text-[10px] text-muted-foreground tabular-nums text-center">{t}</div>
        ))}
      </div>

      {/* Background grid */}
      <div
        className="relative w-full rounded border p-3"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(0,0,0,0.04) 0 1px, transparent 1px 8.333%)",
          backgroundSize: `${100 / ticks.length}% 100%`,
        }}
      >
        <div className="space-y-6">
          {groups.map((g, gi) => (
            <div key={gi} className="rounded-md border p-3 bg-background/50">
              <div className="mb-2 font-medium">{g.name}</div>
              <div className="space-y-2">
                {g.rows.map((row) => (
                  <Bar key={row.flight_id} row={row} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlightsGantt;
