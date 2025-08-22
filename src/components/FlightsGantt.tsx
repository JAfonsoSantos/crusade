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
  /** Altura de cada linha (em px) */
  rowHeight?: number;
};

/* ---------- Utils (timezone-safe) ---------- */
const DAY_MS = 24 * 60 * 60 * 1000;

function parseISODate(d: string): Date {
  // aceita "YYYY-MM-DD" e converte para UTC midnight
  const s = d.length >= 10 ? d.slice(0, 10) : d;
  const [yy, mm, dd] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1));
}

function daysBetweenUTC(a: Date, b: Date): number {
  const aa = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bb = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.max(0, Math.round((bb - aa) / DAY_MS));
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function fmtTick(d: Date) {
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${mm}/${dd}`;
}

/* ---------- Cores de estado ---------- */
const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",    // green-500
  paused: "#f59e0b",    // amber-500
  completed: "#3b82f6", // blue-500
  draft: "#9ca3af",     // gray-400
};

const statusToColor = (status?: string | null) =>
  STATUS_COLORS[(status || "draft").toLowerCase()] || STATUS_COLORS.draft;

/* ---------- Componente ---------- */
const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, from, to, rowHeight = 36 }) => {
  /* 1) Agrupar por campanha e ordenar flights por início/priority */
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of items || []) {
      const key = it.campaign_id || it.campaign_name || "unknown";
      if (!map.has(key)) map.set(key, { name: it.campaign_name, rows: [] });
      map.get(key)!.rows.push(it);
    }
    const arr = Array.from(map.values());
    for (const g of arr) {
      g.rows.sort((a, b) => {
        const as = parseISODate(a.start_date).getTime();
        const bs = parseISODate(b.start_date).getTime();
        if (as !== bs) return as - bs;
        return (a.priority ?? 99) - (b.priority ?? 99);
      });
    }
    // ordenar campanhas alfabeticamente
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [items]);

  /* 2) Calcular viewport (start/end + padding) e ticks */
  const { start, end, totalDays, dayStep, ticks } = useMemo(() => {
    if (!items || items.length === 0) {
      const today = new Date();
      const min = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const max = new Date(min.getTime() + 7 * DAY_MS);
      const total = Math.max(1, daysBetweenUTC(min, max));
      const step = 1;
      const labels: string[] = [];
      for (let i = 0; i <= total; i += step) {
        const d = new Date(min.getTime() + i * DAY_MS);
        labels.push(fmtTick(d));
      }
      return { start: min, end: max, totalDays: total, dayStep: step, ticks: labels };
    }

    const starts = items.map((i) => parseISODate(i.start_date).getTime());
    const ends = items.map((i) => parseISODate(i.end_date).getTime());
    let min = new Date(Math.min(...starts));
    let max = new Date(Math.max(...ends));

    // padding de 3 dias para não colar nas bordas
    min = new Date(min.getTime() - 3 * DAY_MS);
    max = new Date(max.getTime() + 3 * DAY_MS);

    // override manual se fornecido
    if (from) {
      const f = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      if (f < min) min = f;
    }
    if (to) {
      const t = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
      if (t > max) max = t;
    }

    const total = Math.max(1, daysBetweenUTC(min, max));

    // Ticks dinâmicos (máx ~ 18)
    const step = Math.max(1, Math.ceil(total / 18));
    const labels: string[] = [];
    for (let i = 0; i <= total; i += step) {
      const d = new Date(min.getTime() + i * DAY_MS);
      labels.push(fmtTick(d));
    }

    return { start: min, end: max, totalDays: total, dayStep: step, ticks: labels };
  }, [items, from, to]);

  /* 3) Helpers de posição/largura */
  const calcLeftPct = (dateStr: string) => {
    const d = parseISODate(dateStr);
    const offset = clamp(daysBetweenUTC(start, d), 0, totalDays);
    return (offset / totalDays) * 100;
  };

  const calcWidthPct = (startStr: string, endStr: string) => {
    const s = parseISODate(startStr);
    const e = parseISODate(endStr);
    // incluir o dia final: +1 dia para mostrar barras "inteiras"
    const w = clamp(daysBetweenUTC(s, e) + 1, 1, totalDays);
    return (w / totalDays) * 100;
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights to display.</div>;
  }

  /* 4) Legenda simples de estado */
  const legend = (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
      {Object.entries(STATUS_COLORS).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: v }}
          />
          {k}
        </span>
      ))}
    </div>
  );

  /* 5) Grid de fundo */
  const gridStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
    backgroundSize: "48px 1px, 1px 32px",
  };

  return (
    <div className="w-full">
      {/* Header: ticks e legenda */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground tabular-nums">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        {legend}
      </div>

      {/* Conteúdo com grid */}
      <div className="rounded-lg border" style={gridStyle}>
        <div className="p-3 space-y-6">
          {groups.map((g, gi) => (
            <div key={gi} className="rounded-md bg-background/80 p-3">
              <div className="mb-2 font-medium">{g.name}</div>

              {/* Linha temporal das flights */}
              <div className="space-y-1">
                {g.rows.map((row) => {
                  const left = calcLeftPct(row.start_date);
                  const width = calcWidthPct(row.start_date, row.end_date);
                  const color = statusToColor(row.status);
                  return (
                    <div key={row.flight_id} className="relative" style={{ height: rowHeight }}>
                      {/* Barra temporal */}
                      <div
                        className="absolute top-2 h-3 rounded"
                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
                        title={`${row.flight_name} • ${row.start_date} → ${row.end_date}`}
                      />
                      {/* Labels */}
                      <div className="absolute left-0 right-0 top-5 flex justify-between px-1">
                        <span className="text-xs truncate">{row.flight_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {row.start_date} → {row.end_date}
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
    </div>
  );
};

export default FlightsGantt;
