
import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Dependency-free Gantt built with CSS grid + Tailwind
 * ----------------------------------------------------
 * Props:
 *  - items: array of rows (one per flight)
 *  - from / to: Date boundaries (inclusive)
 *
 * Each item minimally needs:
 *  {
 *    campaign_id: string;
 *    campaign_name: string;
 *    flight_id: string;
 *    flight_name: string;
 *    start_date: string; // ISO yyyy-mm-dd
 *    end_date: string;   // ISO yyyy-mm-dd
 *    priority?: number;
 *    status?: string;
 *    ad_server?: string;
 *  }
 */

export type GanttRow = {
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  priority?: number;
  status?: string;
  ad_server?: string;
};

export type GanttItem = GanttRow;

type Props = {
  items: GanttItem[];
  from: Date;
  to: Date;
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function clampDate(d: Date, min: Date, max: Date) {
  if (d < min) return new Date(min);
  if (d > max) return new Date(max);
  return d;
}

function parseDate(s: string) {
  // s expected yyyy-mm-dd
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

const dayLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });

const groupByCampaign = (rows: GanttItem[]) => {
  const map = new Map<string, { name: string; flights: GanttItem[] }>();
  rows.forEach((r) => {
    const g = map.get(r.campaign_id) || { name: r.campaign_name, flights: [] };
    g.flights.push(r);
    map.set(r.campaign_id, g);
  });
  return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
};

const statusColor = (s?: string) => {
  switch ((s || "").toLowerCase()) {
    case "active":
      return "bg-green-500/80";
    case "paused":
      return "bg-yellow-500/80";
    case "completed":
      return "bg-blue-500/80";
    case "draft":
      return "bg-gray-400/70";
    default:
      return "bg-slate-500/70";
  }
};

/** Header timeline grid */
const TimelineHeader: React.FC<{ from: Date; to: Date }> = ({ from, to }) => {
  const days = daysBetween(from, to) + 1;
  const cols = `repeat(${days}, minmax(28px, 1fr))`;

  const labels: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    labels.push(d);
  }

  return (
    <div className="pl-2">
      <div
        className="grid text-[10px] text-muted-foreground"
        style={{ gridTemplateColumns: cols }}
      >
        {labels.map((d) => (
          <div
            key={toISODate(d)}
            className="h-6 border-r last:border-r-0 border-border/50 flex items-center justify-center"
          >
            {dayLabel(d)}
          </div>
        ))}
      </div>
    </div>
  );
};

const FlightBar: React.FC<{
  flight: GanttItem;
  from: Date;
  to: Date;
}> = ({ flight, from, to }) => {
  const start = clampDate(parseDate(flight.start_date), from, to);
  const end = clampDate(parseDate(flight.end_date), from, to);
  const offset = daysBetween(from, start);
  const span = daysBetween(start, end) + 1;

  return (
    <div className="pl-2">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${daysBetween(from, to) + 1}, minmax(28px, 1fr))` }}>
        <div
          style={{ gridColumn: `${offset + 1} / span ${span}` }}
          className={`h-6 rounded border border-white/30 shadow-sm ${statusColor(
            flight.status
          )}`}
          title={`${flight.flight_name} • ${flight.start_date} → ${flight.end_date}`}
        />
      </div>
    </div>
  );
};

const FlightsGantt: React.FC<Props> = ({ items, from, to }) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupByCampaign(items), [items]);
  const totalDays = daysBetween(from, to) + 1;

  return (
    <Card className="p-4 w-full overflow-x-auto">
      {/* Header */}
      <div className="min-w-[720px]">
        <div className="flex items-center px-2 pb-2 text-xs font-medium text-muted-foreground">
          <div className="w-80">Campaign / Flight</div>
          <div className="flex-1">
            <TimelineHeader from={from} to={to} />
          </div>
        </div>

        {/* Body */}
        <div className="divide-y divide-border">
          {groups.map((g) => {
            const isOpen = openGroups[g.id] ?? true;
            return (
              <div key={g.id} className="py-2">
                <div className="flex items-center gap-2 px-2">
                  <button
                    onClick={() =>
                      setOpenGroups((s) => ({ ...s, [g.id]: !isOpen }))
                    }
                    className="p-1 rounded hover:bg-muted"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div className="w-80 pr-4">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {g.flights.length} flight{g.flights.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex-1">
                    {/* Campaign envelope = min start to max end */}
                    <div className="pl-2">
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${totalDays}, minmax(28px, 1fr))`,
                        }}
                      >
                        {(() => {
                          const starts = g.flights.map((f) =>
                            clampDate(parseDate(f.start_date), from, to)
                          );
                          const ends = g.flights.map((f) =>
                            clampDate(parseDate(f.end_date), from, to)
                          );
                          const minStart = starts.sort((a, b) => +a - +b)[0] || from;
                          const maxEnd = ends.sort((a, b) => +b - +a)[0] || to;
                          const off = daysBetween(from, minStart);
                          const span = daysBetween(minStart, maxEnd) + 1;
                          return (
                            <div
                              style={{ gridColumn: `${off + 1} / span ${span}` }}
                              className="h-2 rounded bg-primary/20"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flights rows */}
                {isOpen && (
                  <div className="mt-2 space-y-1">
                    {g.flights
                      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
                      .map((f) => (
                        <div
                          key={f.flight_id}
                          className="flex items-center px-2 text-sm"
                        >
                          <div className="w-80 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{f.flight_name}</span>
                              {typeof f.priority === "number" && (
                                <Badge variant="secondary" className="text-[10px]">
                                  prio {f.priority}
                                </Badge>
                              )}
                              {f.status && (
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {f.status}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {f.start_date} → {f.end_date}
                            </div>
                          </div>
                          <div className="flex-1">
                            <FlightBar flight={f} from={from} to={to} />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default FlightsGantt;
