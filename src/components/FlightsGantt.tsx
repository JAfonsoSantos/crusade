import React, { useMemo } from "react";

/** Tipos de dados usados no Gantt */
export type TimelineItem = {
  company_id: string;
  campaign_id: string;
  campaign_name: string;

  flight_id: string;
  flight_name: string;

  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"

  priority?: number | null;
  status?: string | null;

  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;

  spend?: number | null;
  revenue?: number | null;
};

export type FlightsGanttProps = {
  /** Linhas (todas da MESMA campanha quando usado pela página) */
  items: TimelineItem[];
  /** Intervalo global (o mesmo para todas as campanhas) */
  from: Date;
  to: Date;
  /** Callback ao clicar numa barra/linha */
  onSelect?: (t: TimelineItem) => void;
};

/** Utilitários */
function parseISODay(d: string) {
  // tolera "YYYY-MM-DD" e iso longos
  const iso = d.length > 10 ? d.slice(0, 10) : d;
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function diffDays(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / ms));
}

/** Cores por status */
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  draft: "bg-slate-300",
  completed: "bg-blue-500",
};

const numberOrDash = (n?: number | null) =>
  typeof n === "number" ? n.toLocaleString() : "–";

const moneyOrDash = (n?: number | null) =>
  typeof n === "number" ? n.toLocaleString(undefined, { style: "currency", currency: "EUR" }) : "–";

/** Componente: renderiza as LINHAS (grid) para um conjunto de flights */
const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, from, to, onSelect }) => {
  const totalDays = useMemo(() => Math.max(1, diffDays(from, to)), [from, to]);

  const Row: React.FC<{ row: TimelineItem }> = ({ row }) => {
    const s = parseISODay(row.start_date);
    const e = parseISODay(row.end_date);

    const leftDays = clamp(diffDays(from, s), 0, totalDays);
    const widthDays = Math.max(1, clamp(diffDays(s, e), 0, totalDays)); // pelo menos 1 dia para barra visível

    const leftPct = (leftDays / totalDays) * 100;
    const widthPct = (widthDays / totalDays) * 100;

    const color =
      STATUS_COLORS[(row.status || "").toLowerCase()] ?? STATUS_COLORS["draft"];

    return (
      <div
        className="grid items-center py-3 border-t first:border-t-0"
        style={{
          gridTemplateColumns:
            "minmax(160px, 1fr) 110px 100px 90px 130px minmax(260px, 3fr)",
          columnGap: "12px",
        }}
      >
        {/* Nome do flight + meta */}
        <div className="min-w-0">
          <div className="truncate font-medium">{row.flight_name}</div>
          <div className="text-xs text-muted-foreground">
            {row.start_date} → {row.end_date}
          </div>
        </div>

        {/* Métricas */}
        <div className="tabular-nums text-right">{numberOrDash(row.impressions)}</div>
        <div className="tabular-nums text-right">{numberOrDash(row.clicks)}</div>
        <div className="tabular-nums text-right">{numberOrDash(row.conversions)}</div>
        <div className="tabular-nums text-right">{moneyOrDash(row.spend)}</div>

        {/* Timeline */}
        <div className="relative h-6 rounded bg-slate-100 overflow-hidden">
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-2 rounded ${color} cursor-pointer`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
            onClick={() => onSelect?.(row)}
          />
        </div>
      </div>
    );
  };

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No flights.</div>;
  }

  return (
    <div className="w-full">
      {/* Cabeçalho das colunas */}
      <div
        className="grid text-xs text-muted-foreground pb-2"
        style={{
          gridTemplateColumns:
            "minmax(160px, 1fr) 110px 100px 90px 130px minmax(260px, 3fr)",
          columnGap: "12px",
        }}
      >
        <div>Flight</div>
        <div className="text-right">Impr.</div>
        <div className="text-right">Clicks</div>
        <div className="text-right">Conv.</div>
        <div className="text-right">Spend</div>
        <div className="text-right pr-1">Timeline</div>
      </div>

      {/* Linhas */}
      <div className="divide-y rounded-md border bg-white">
        {items.map((it) => (
          <Row key={it.flight_id} row={it} />
        ))}
      </div>
    </div>
  );
};

export default FlightsGantt;
