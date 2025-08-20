import React from "react";

export type GanttItem = {
  id: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  priority?: number | null;
};

type Props = {
  items: GanttItem[];
  from: Date; // início do eixo temporal (por ex. hoje - 7d)
  to: Date;   // fim do eixo temporal (por ex. hoje + 60d)
};

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const rowHeight = 36;
const leftColWidth = 260;

const FlightsGantt: React.FC<Props> = ({ items, from, to }) => {
  const totalDays = Math.max(1, Math.ceil(daysBetween(from, to)));
  const gridCols = totalDays;

  // calcula posição e largura de cada barra
  const bars = items.map((it) => {
    const s = new Date(it.start_date);
    const e = new Date(it.end_date);
    const startOffset = clamp(Math.floor(daysBetween(from, s)), 0, totalDays);
    const endOffset = clamp(Math.ceil(daysBetween(from, e)), 0, totalDays);
    const widthDays = Math.max(1, endOffset - startOffset);
    return { ...it, startOffset, widthDays };
  });

  // construir linhas por campanha
  const byCampaign = new Map<string, { name: string; flights: typeof bars }>();
  for (const b of bars) {
    const key = b.campaign_id;
    if (!byCampaign.has(key)) {
      byCampaign.set(key, { name: b.campaign_name, flights: [] as any });
    }
    byCampaign.get(key)!.flights.push(b);
  }

  const headerDays = Array.from({ length: totalDays }).map((_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const dd = d.toLocaleDateString(undefined, { day: "2-digit" });
    return dd;
  });

  return (
    <div className="w-full border rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-stretch border-b bg-muted/40 text-xs">
        <div className="shrink-0" style={{ width: leftColWidth }}>
          <div className="px-3 py-2 font-medium">Campaign / Flight</div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(24px, 1fr))` }}
          >
            {headerDays.map((d, i) => (
              <div
                key={i}
                className="px-2 py-2 text-center text-muted-foreground border-l"
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      {[...byCampaign.entries()].map(([id, row]) => (
        <div key={id} className="border-b">
          {/* campaign row */}
          <div className="flex items-stretch">
            <div
              className="shrink-0 flex items-center"
              style={{ width: leftColWidth, height: rowHeight }}
            >
              <div className="px-3 text-sm font-medium">{row.name}</div>
            </div>
            <div className="flex-1 relative" style={{ height: rowHeight }}>
              {/* grid de fundo */}
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(24px, 1fr))`,
                }}
              >
                {headerDays.map((_, i) => (
                  <div key={i} className="border-l" />
                ))}
              </div>
            </div>
          </div>

          {/* flights */}
          {row.flights.map((f) => (
            <div key={f.flight_id} className="flex items-stretch">
              <div
                className="shrink-0 flex items-center"
                style={{ width: leftColWidth, height: rowHeight }}
              >
                <div className="px-6 text-sm text-muted-foreground">
                  {f.flight_name}{" "}
                  {f.priority != null && (
                    <span className="text-xs">prio {f.priority}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 relative" style={{ height: rowHeight }}>
                {/* grid de fundo */}
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${gridCols}, minmax(24px, 1fr))`,
                  }}
                >
                  {headerDays.map((_, i) => (
                    <div key={i} className="border-l" />
                  ))}
                </div>

                {/* barra */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 rounded bg-emerald-500"
                  style={{
                    left: `calc(${(f.startOffset / totalDays) * 100}% + 2px)`,
                    width: `calc(${(f.widthDays / totalDays) * 100}% - 4px)`,
                  }}
                  title={`${f.flight_name} • ${new Date(
                    f.start_date
                  ).toLocaleDateString()} – ${new Date(
                    f.end_date
                  ).toLocaleDateString()}`}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default FlightsGantt;
