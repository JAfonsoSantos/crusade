import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

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
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
  revenue?: number | null;
};

export type FlightsGanttProps = {
  /** All items to render (possibly from multiple campaigns) */
  items: TimelineItem[];
  /** Optional viewport */
  from?: Date;
  to?: Date;
  /** When a flight row is clicked */
  onSelect?: (t: TimelineItem) => void;
  /** Optional filter by campaign id */
  campaignFilter?: string;
};

// ------------- utils -------------
function parseISO(d: string) {
  const s = d?.slice?.(0, 10) ?? "";
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
const dayDiff = (a: Date, b: Date) => {
  const ms = 1000 * 60 * 60 * 24;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / ms));
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-400",
  draft: "bg-slate-300",
  completed: "bg-blue-500",
};

// Nice value formatter
const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const money = (v?: number | null, currency = "€") =>
  v == null ? "-" : `${currency}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v)}`;

// ------------- component -------------
const FlightsGantt: React.FC<FlightsGanttProps> = (props) => {
  const {
    items: rawItems,
    from,
    to,
    onSelect = () => {},
    campaignFilter = "",
  } = props;

  const items = Array.isArray(rawItems) ? rawItems : [];

  // Filter by campaign
  const filtered = useMemo(
    () => (campaignFilter ? items.filter(i => i.campaign_id === campaignFilter) : items),
    [items, campaignFilter]
  );

  // Group by campaign
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    // order rows by start date then priority
    for (const g of m.values()) {
      g.rows.sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime() || (a.priority || 99) - (b.priority || 99));
    }
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v }));
  }, [filtered]);

  // Compute viewport (always returns [Date, Date])
  const [start, end] = useMemo<[Date, Date]>(() => {
    if (from instanceof Date && to instanceof Date) return [from, to];
    const all = filtered;
    if (all.length) {
      const s = new Date(Math.min(...all.map(r => parseISO(r.start_date).getTime())));
      const e = new Date(Math.max(...all.map(r => parseISO(r.end_date).getTime())));
      return [s, e];
    }
    const today = new Date();
    return [today, new Date(today.getTime() + 7 * 86400000)];
  }, [from, to, filtered]);

  const totalDays = Math.max(1, dayDiff(start, end) || 1);
  const ticks = useMemo(() => {
    const out: string[] = [];
    const step = Math.max(1, Math.floor(totalDays / 12));
    for (let i = 0; i <= totalDays; i += step) {
      const d = new Date(start.getTime());
      d.setDate(d.getDate() + i);
      out.push(`${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`);
    }
    return out;
  }, [start, totalDays]);

  if (!filtered.length) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
        {ticks.map((t, i) => <span key={i} className="tabular-nums">{t}</span>)}
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.id} className="rounded-lg border">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium">{g.name}</div>
              <div className="text-xs text-muted-foreground">{g.rows.length} flights</div>
            </div>

            {/* header bar with metric columns */}
            <div className="grid grid-cols-[220px,90px,90px,90px,110px,1fr] px-4 py-2 text-[11px] text-muted-foreground">
              <div>Flight</div>
              <div className="text-right">Impr.</div>
              <div className="text-right">Clicks</div>
              <div className="text-right">Conv.</div>
              <div className="text-right">Spend</div>
              <div className="pl-4">Timeline</div>
            </div>

            <div className="divide-y">
              {g.rows.map((r) => {
                const s = parseISO(r.start_date);
                const e = parseISO(r.end_date);
                const leftDays = clamp(dayDiff(start, s), 0, totalDays);
                const barDays = Math.max(1, clamp(dayDiff(s, e), 0, totalDays));
                const leftPct = (leftDays / totalDays) * 100;
                const widthPct = (barDays / totalDays) * 100;
                const color = STATUS_COLORS[(r.status || "").toLowerCase()] || STATUS_COLORS["draft"];
                return (
                  <div key={r.flight_id} className="grid grid-cols-[220px,90px,90px,90px,110px,1fr] items-center px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm">{r.flight_name}</div>
                      {!!r.priority && <Badge variant="outline" className="text-[10px]">prio {r.priority}</Badge>}
                      {r.status && <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>}
                    </div>
                    <div className="text-right tabular-nums">{r.impressions == null ? "-" : fmt.format(r.impressions)}</div>
                    <div className="text-right tabular-nums">{r.clicks == null ? "-" : fmt.format(r.clicks)}</div>
                    <div className="text-right tabular-nums">{r.conversions == null ? "-" : fmt.format(r.conversions)}</div>
                    <div className="text-right tabular-nums">{r.spend == null ? "-" : money(r.spend)}</div>
                    <div className="relative h-8">
                      <div
                        className={`absolute h-3 rounded ${color} cursor-pointer`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "10px" }}
                        title={`${r.flight_name} (${r.start_date} → ${r.end_date})`}
                        onClick={() => onSelect(r)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;
