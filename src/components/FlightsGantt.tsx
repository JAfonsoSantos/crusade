
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
  revenue?: number | null;
};

export type FlightsGanttProps = {
  items: TimelineItem[];
  campaignFilter?: string; // "all" or campaign_id
  onSelect?: (t: TimelineItem) => void;
};

function parseISO(d: string) {
  const only = d.length >= 10 ? d.slice(0, 10) : d;
  const [y, m, day] = only.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, day || 1);
}

function daysBetween(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / ms));
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  draft: "bg-gray-300",
  completed: "bg-blue-500",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect }) => {
  // Filter by campaign if requested
  const filtered = useMemo(
    () => (campaignFilter && campaignFilter !== "all"
      ? items.filter(i => i.campaign_id === campaignFilter)
      : items),
    [items, campaignFilter]
  );

  // Group by campaign
  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!map.has(key)) map.set(key, { id: key, name: it.campaign_name, rows: [] });
      map.get(key)!.rows.push(it);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Timeline bounds
  const { start, end, totalDays, ticks } = useMemo(() => {
    if (filtered.length === 0) {
      const today = new Date();
      const end = new Date(today.getTime() + 7 * 86400000);
      return { start: today, end, totalDays: daysBetween(today, end) || 1, ticks: [] as string[] };
    }
    const starts = filtered.map(i => parseISO(i.start_date));
    const ends = filtered.map(i => parseISO(i.end_date));
    const min = new Date(Math.min(...starts.map(d => d.getTime())));
    const max = new Date(Math.max(...ends.map(d => d.getTime())));
    // add 1 day buffer
    const paddedEnd = new Date(max.getTime() + 86400000);
    const total = Math.max(1, daysBetween(min, paddedEnd));
    const tickLabels: string[] = [];
    const step = Math.max(1, Math.floor(total / 14));
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime());
      d.setDate(d.getDate() + i);
      // show DD/MM
      tickLabels.push(`${(d.getDate()).toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}`);
    }
    return { start: min, end: paddedEnd, totalDays: total, ticks: tickLabels };
  }, [filtered]);

  // expand/collapse campaigns
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const header = (
    <div className="grid grid-cols-[minmax(140px,2fr)_80px_80px_80px_120px_minmax(320px,5fr)] px-3 py-2 text-xs font-medium text-muted-foreground">
      <div>Flight</div>
      <div className="text-right">Impr.</div>
      <div className="text-right">Clicks</div>
      <div className="text-right">Conv.</div>
      <div className="text-right">Spend</div>
      <div>Timeline</div>
    </div>
  );

  const barFor = (row: TimelineItem) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = Math.max(0, daysBetween(start, s));
    const widthDays = Math.max(1, daysBetween(s, e));
    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = (widthDays / totalDays) * 100;
    const color = STATUS_COLORS[(row.status || "draft").toLowerCase()] || STATUS_COLORS["draft"];
    return (
      <div className="relative h-8 w-full">
        <div
          className={`absolute top-2 h-3 rounded ${color}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
        />
      </div>
    );
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* timeline ticks */}
      <div className="px-3 text-[10px] text-muted-foreground flex gap-3 flex-wrap">
        {ticks.map((t, i) => (<span key={i} className="tabular-nums">{t}</span>))}
      </div>

      {groups.map(g => {
        const isOpen = open[g.id] ?? false;
        return (
          <div key={g.id} className="rounded-lg border">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="font-medium">{g.name}</div>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setOpen(o => ({ ...o, [g.id]: !isOpen }))}
              >
                {isOpen ? "Collapse" : "Expand"}
              </button>
            </div>

            {isOpen && (
              <div className="border-t">
                {header}
                {g.rows
                  .slice()
                  .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                  .map(row => (
                  <div key={row.flight_id} className="grid grid-cols-[minmax(140px,2fr)_80px_80px_80px_120px_minmax(320px,5fr)] items-center px-3 py-2 text-sm">
                    <div className="truncate">
                      <button
                        className="text-left hover:underline"
                        onClick={() => onSelect && onSelect(row)}
                      >
                        {row.flight_name}
                      </button>
                      <div className="text-[10px] text-muted-foreground">
                        {row.start_date} → {row.end_date}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">{row.impressions ?? 0}</div>
                    <div className="text-right tabular-nums">{row.clicks ?? 0}</div>
                    <div className="text-right tabular-nums">{row.conversions ?? 0}</div>
                    <div className="text-right tabular-nums">
                      {typeof row.spend === "number" ? row.spend.toLocaleString(undefined, { style: "currency", currency: "EUR" }) : "€0"}
                    </div>
                    <div>{barFor(row)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FlightsGantt;
