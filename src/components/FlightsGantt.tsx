import React, { useMemo, useState } from "react";

export type TimelineItem = {
  company_id?: string;
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

function monthTicks(min: Date, max: Date) {
  const labels: { key: string; label: string }[] = [];
  const d = new Date(min.getFullYear(), min.getMonth(), 1);
  while (d <= max) {
    labels.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(-2)}`,
    });
    d.setMonth(d.getMonth() + 1);
  }
  return labels;
}

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, from, to, onSelect }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const m = new Map<string, { id: string; name: string; rows: TimelineItem[] }>();
    for (const it of items) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { id: key, name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    // stable sort by earliest start
    const list = Array.from(m.values());
    list.sort((a, b) => {
      const aMin = Math.min(...a.rows.map(r => parseISO(r.start_date).getTime()));
      const bMin = Math.min(...b.rows.map(r => parseISO(r.start_date).getTime()));
      return aMin - bMin;
    });
    return list;
  }, [items]);

  const { start, end, totalDays, ticks } = useMemo(() => {
    const starts = items.map((i) => parseISO(i.start_date));
    const ends = items.map((i) => parseISO(i.end_date));
    const min = from ?? (starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : new Date());
    const max = to ?? (ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : new Date(min.getTime() + 30 * 86400000));
    const total = Math.max(1, daysBetween(min, max));
    return { start: min, end: max, totalDays: total, ticks: monthTicks(min, max) };
  }, [items, from, to]);

  const barFor = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(start, s), 0, totalDays);
    const widthDays = clamp(daysBetween(s, e), 0, totalDays);
    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = Math.max(0.8, (widthDays / totalDays) * 100);
    const color = STATUS_COLORS[(row.status || "").toLowerCase()] || STATUS_COLORS["draft"];
    return (
      <div className="relative h-7">
        <div
          role="button"
          onClick={() => onSelect?.(row)}
          className={`absolute h-3 rounded cursor-pointer ${color} hover:brightness-110 transition`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "12px" }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
        <div className="text-xs tabular-nums text-muted-foreground truncate">{row.flight_name}</div>
      </div>
    );
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-6 text-[11px] text-muted-foreground">
        {ticks.map((t) => (
          <span key={t.key} className="tabular-nums">{t.label}</span>
        ))}
      </div>

      <div className="space-y-6">
        {grouped.map((g) => {
          const isOpen = open[g.id] ?? true;
          return (
            <div key={g.id} className="rounded-lg border">
              <button
                onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50"
              >
                <span className="font-medium">{g.name}</span>
                <span className="text-xs text-muted-foreground">{isOpen ? "Hide flights" : "Show flights"}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {g.rows
                    .slice()
                    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                    .map((row) => (
                      <div key={row.flight_id}>{barFor(row)}</div>
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
