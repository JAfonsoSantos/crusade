import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

export type GanttItem = {
  flight_id: string;
  flight_name: string;
  campaign_id: string;
  campaign_name: string;
  start_date: string; // ISO yyyy-mm-dd
  end_date: string;   // ISO yyyy-mm-dd
  status: "active" | "paused" | "draft" | "completed" | string;
  priority: number | null;
  ad_server: string | null;
};

type Props = {
  items: GanttItem[];
  from: Date;
  to: Date;
};

const statusColorMap: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  draft: "bg-gray-400",
  completed: "bg-blue-500",
};

function daysBetween(a: Date, b: Date) {
  const MS = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / MS));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Render “barras” numa régua [from..to].
 * Agrupa por campanha.
 */
const FlightsGantt: React.FC<Props> = ({ items, from, to }) => {
  const totalDays = useMemo(() => daysBetween(from, to), [from, to]);

  const byCampaign = useMemo(() => {
    const m = new Map<string, GanttItem[]>();
    items.forEach((it) => {
      const key = `${it.campaign_id}__${it.campaign_name}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    });
    return Array.from(m.entries()).map(([k, rows]) => {
      const [, name] = k.split("__");
      return { name, rows };
    });
  }, [items]);

  const dayTicks = useMemo(() => {
    const ticks: string[] = [];
    const d = new Date(from);
    for (let i = 0; i < totalDays; i++) {
      ticks.push(
        d.toLocaleDateString("en-GB", {
          month: "2-digit",
          day: "2-digit",
        })
      );
      d.setDate(d.getDate() + 1);
    }
    return ticks;
  }, [from, totalDays]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-[260px_1fr] text-xs text-muted-foreground mb-2">
        <div className="font-medium">Campaign / Flight</div>
        <div className="relative">
          <div className="flex justify-between pr-6">
            {dayTicks.map((t, i) => (
              <div key={i} className="w-[1px] h-4 translate-x-1/2" />
            ))}
          </div>
          <div className="flex justify-between text-[10px] mt-1 pr-6">
            {dayTicks.filter((_, i) => i % Math.ceil(totalDays / 5) === 0).map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {byCampaign.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No flights found.
          </div>
        )}

        {byCampaign.map((grp) => (
          <div key={grp.name} className="grid grid-cols-[260px_1fr]">
            <div className="pr-4 py-2 font-medium">{grp.name}</div>
            <div className="py-2">
              {grp.rows.map((r) => {
                const s = new Date(r.start_date);
                const e = new Date(r.end_date);

                // posição relativa dentro do intervalo [from..to]
                const offsetDays = clamp(
                  Math.floor((s.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
                  0,
                  totalDays
                );
                const barDays = clamp(
                  daysBetween(new Date(Math.max(from.getTime(), s.getTime())), new Date(Math.min(to.getTime(), e.getTime()))),
                  1,
                  totalDays
                );

                const leftPct = (offsetDays / totalDays) * 100;
                const widthPct = (barDays / totalDays) * 100;

                const color =
                  statusColorMap[r.status?.toLowerCase()] ?? "bg-slate-500";

                return (
                  <div key={r.flight_id} className="relative h-10 mb-2">
                    <div className="absolute inset-0 rounded-md bg-muted/50" />
                    <div
                      className={`absolute top-1 left-0 h-8 rounded-md ${color} shadow-sm`}
                      style={{ width: `${widthPct}%`, transform: `translateX(${leftPct}%)` }}
                      title={`${r.flight_name} • ${r.start_date} → ${r.end_date}`}
                    />
                    <div className="absolute inset-0 flex items-center px-3 justify-between pointer-events-none">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[13px]">{r.flight_name}</span>
                        {r.priority != null && (
                          <span className="text-[11px] text-muted-foreground">prio {r.priority}</span>
                        )}
                        {r.ad_server && (
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {r.ad_server}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px]">
                        {r.start_date} → {r.end_date}
                      </span>
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
