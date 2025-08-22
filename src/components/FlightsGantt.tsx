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
  from?: Date; // optional viewport start
  to?: Date;   // optional viewport end
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

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, from, to }) => {
  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of items) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    return Array.from(m.values());
  }, [items]);

  const { start, end, totalDays, ticks } = useMemo(() => {
    const starts = items.map((i) => parseISO(i.start_date));
    const ends = items.map((i) => parseISO(i.end_date));
    const min =
      from ??
      (starts.length
        ? new Date(Math.min(...starts.map((d) => d.getTime())))
        : new Date());
    const max =
      to ??
      (ends.length
        ? new Date(Math.max(...ends.map((d) => d.getTime())))
        : new Date(min.getTime() + 7 * 86400000));
    const total = Math.max(1, daysBetween(min, max));
    const tickLabels: string[] = [];
    const step = Math.max(1, Math.floor(total / 14));
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime());
      d.setDate(d.getDate() + i);
      tickLabels.push(
        `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
          .getDate()
          .toString()
          .padStart(2, "0")}`
      );
    }
    return { start: min, end: max, totalDays: total, ticks: tickLabels };
  }, [items, from, to]);

  const barFor = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(start, s), 0, totalDays);
    const widthDays = clamp(daysBetween(s, e), 0, totalDays);
    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = Math.max(0.5, (widthDays / totalDays) * 100);
    const color =
      STATUS_COLORS[(row.status || "").toLowerCase()] ||
      STATUS_COLORS["draft"];

    return (
      <div className="relative h-8">
        <div
          className={`absolute h-3 rounded ${color}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "10px" }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
        <div className="text-xs text-muted-foreground truncate">
          {row.flight_name}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {row.start_date} → {row.end_date}
        </div>
      </div>
    );
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
        {ticks.map((t, i) => (
          <span key={i} className="tabular-nums">
            {t}
          </span>
        ))}
      </div>

      <div className="space-y-6">
        {grouped.map((g, gi) => (
          <div key={gi} className="rounded-lg border p-3">
            <div className="mb-2 font-medium">{g.name}</div>
            <div className="space-y-2">
              {g.rows
                .slice()
                .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                .map((row) => (
                  <div key={row.flight_id}>{barFor(row)}</div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;
