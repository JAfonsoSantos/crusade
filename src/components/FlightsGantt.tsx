import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * ========= Types =========
 */
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
};

type ZoomLevel = "day" | "week" | "month";

type FlightsGanttProps = {
  items: TimelineItem[];
  campaignFilter?: string | null;
  onSelect?: (row: TimelineItem) => void;
};

/**
 * ========= Date utils (sem dependências externas) =========
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(iso: string): Date {
  // Força para meia-noite local — suficiente para alinhamento de grelha
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}
function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

function startOfWeek(d: Date): Date {
  // Segunda-feira como início (PT)
  const out = new Date(d);
  const dow = out.getDay(); // 0=Dom, 1=Seg, ...
  const diff = (dow + 6) % 7; // Seg=0
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfMonth(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), 1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * ========= Formatadores =========
 */
const fmtMonth = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
const fmtWeek = new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" });
const fmtDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" });

/**
 * ========= Cores por estado =========
 */
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-600",
  running: "bg-emerald-600",
  paused: "bg-amber-500",
  draft: "bg-slate-400",
  planned: "bg-sky-600",
  completed: "bg-zinc-500",
  default: "bg-primary",
};

/**
 * ========= Componente =========
 */
export default function FlightsGantt({
  items,
  campaignFilter,
  onSelect,
}: FlightsGanttProps) {
  // Zoom + janela manual (para drill-down clicável)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("month");
  const [manualRange, setManualRange] = useState<{ min: Date; max: Date } | null>(null);

  // Expand/collapse por campanha — persistido
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    const raw = localStorage.getItem("crusade.gantt.expanded");
    if (raw) {
      try {
        setExpanded(new Set(JSON.parse(raw)));
      } catch {
        /* ignore */
      }
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("crusade.gantt.expanded", JSON.stringify([...expanded]));
  }, [expanded]);

  // Filtro por campanha
  const filtered = useMemo(() => {
    const base = campaignFilter
      ? items.filter((it) => it.campaign_name === campaignFilter)
      : items.slice();
    // Ordenação estável: campanha, depois início do flight
    base.sort((a, b) => {
      const c = (a.campaign_name || "").localeCompare(b.campaign_name || "");
      if (c !== 0) return c;
      return toDate(a.start_date).getTime() - toDate(b.start_date).getTime();
    });
    return base;
  }, [items, campaignFilter]);

  // Extensão dos dados (min start, max end) — com fim inclusivo (end + 1 dia)
  const dataExtent = useMemo(() => {
    if (!filtered.length) return null;
    let min = toDate(filtered[0].start_date);
    let max = toDate(filtered[0].end_date);
    for (const r of filtered) {
      const s = toDate(r.start_date);
      const e = toDate(r.end_date);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    // fim inclusivo: garante que o último dia “conta” na largura
    max = new Date(max.getTime() + DAY_MS);
    return { min, max };
  }, [filtered]);

  // Faixa de visualização resultante (manualRange > default range por zoom)
  const viewRange = useMemo(() => {
    if (!dataExtent) {
      const now = new Date();
      return { min: now, max: addWeeks(now, 1) };
    }
    if (manualRange) return manualRange;

    let { min, max } = dataExtent;

    if (zoomLevel === "day") {
      const mid = new Date((min.getTime() + max.getTime()) / 2);
      return { min: addDays(mid, -7), max: addDays(mid, 7) };
    }

    if (zoomLevel === "week") {
      min = startOfWeek(min);
      // garante no mínimo 8 semanas visíveis
      const minWeeks = 8;
      const candidateMax = addWeeks(startOfWeek(max), 2);
      const neededWeeks = Math.max(
        minWeeks,
        Math.ceil((candidateMax.getTime() - min.getTime()) / (7 * DAY_MS))
      );
      return { min, max: addWeeks(min, neededWeeks) };
    }

    // month
    {
      min = startOfMonth(min);
      const minMonths = 6;
      const candidateMax = addMonths(startOfMonth(max), 2);
      const approxMonths = Math.max(
        minMonths,
        Math.ceil((candidateMax.getTime() - min.getTime()) / (30 * DAY_MS))
      );
      return { min, max: addMonths(min, approxMonths) };
    }
  }, [dataExtent, manualRange, zoomLevel]);

  const totalMs = Math.max(1, viewRange.max.getTime() - viewRange.min.getTime());

  // Ticks de cabeçalho/grelha (com onClick para drill-down)
  const ticks = useMemo(() => {
    const out: {
      key: string;
      label: string;
      leftPct: number;
      isMainTick?: boolean;
      onClick?: () => void;
    }[] = [];

    const min = viewRange.min;
    const max = viewRange.max;

    if (zoomLevel === "day") {
      for (let d = new Date(min); d < max; d = addDays(d, 1)) {
        const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
        const isMain = d.getDay() === 1 || d.getDate() === 1; // Segundas/1º do mês
        out.push({
          key: d.toISOString(),
          label: fmtDay.format(d),
          leftPct: left,
          isMainTick: isMain,
        });
      }
    } else if (zoomLevel === "week") {
      for (let d = startOfWeek(min); d < max; d = addWeeks(d, 1)) {
        const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
        out.push({
          key: d.toISOString(),
          label: fmtWeek.format(d), // "05 Aug"
          leftPct: left,
          isMainTick: d.getDate() <= 7, // primeira semana do mês
          onClick: () => {
            const wStart = startOfWeek(d);
            setZoomLevel("day");
            setManualRange({ min: wStart, max: addWeeks(wStart, 1) });
          },
        });
      }
    } else {
      for (let d = startOfMonth(min); d < max; d = addMonths(d, 1)) {
        const left = ((d.getTime() - min.getTime()) / totalMs) * 100;
        out.push({
          key: d.toISOString(),
          label: fmtMonth.format(d), // "Aug 2025"
          leftPct: left,
          isMainTick: true,
          onClick: () => {
            const mStart = startOfMonth(d);
            setZoomLevel("week");
            setManualRange({ min: mStart, max: addMonths(mStart, 1) });
          },
        });
      }
    }

    return out;
  }, [viewRange, totalMs, zoomLevel]);

  // Agrupamento por campanha
  const groups = useMemo(() => {
    const m = new Map<string, { id: string; name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const k = it.campaign_id || it.campaign_name;
      if (!m.has(k)) m.set(k, { id: k, name: it.campaign_name, rows: [] });
      m.get(k)!.rows.push(it);
    }
    for (const g of m.values()) {
      g.rows.sort(
        (a, b) => toDate(a.start_date).getTime() - toDate(b.start_date).getTime()
      );
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // Helpers para barras
  function barFor(row: TimelineItem) {
    const s = toDate(row.start_date);
    const e = toDate(row.end_date);
    const sMs = clamp(s.getTime(), viewRange.min.getTime(), viewRange.max.getTime());
    // Inclusivo: +1 dia garante que "um dia" é visível e que o último dia conta
    const eInclusiveMs = clamp(
      addDays(e, 1).getTime(),
      viewRange.min.getTime(),
      viewRange.max.getTime()
    );

    const leftPct = ((sMs - viewRange.min.getTime()) / totalMs) * 100;
    const widthPct = Math.max(
      zoomLevel === "day" ? 2 : zoomLevel === "week" ? 1 : 0.5,
      ((eInclusiveMs - sMs) / totalMs) * 100
    );

    const color =
      STATUS_COLORS[(row.status || "default").toLowerCase()] || STATUS_COLORS.default;

    return { leftPct, widthPct, color };
  }

  function campaignBarFor(group: { id: string; name: string; rows: TimelineItem[] }) {
    if (!group.rows.length) return null;

    const allDates = group.rows.flatMap((r) => [toDate(r.start_date), toDate(r.end_date)]);
    let s = new Date(Math.min(...allDates.map((d) => d.getTime())));
    let e = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const sMs = clamp(s.getTime(), viewRange.min.getTime(), viewRange.max.getTime());
    const eInclusiveMs = clamp(
      addDays(e, 1).getTime(),
      viewRange.min.getTime(),
      viewRange.max.getTime()
    );

    const leftPct = ((sMs - viewRange.min.getTime()) / totalMs) * 100;
    const widthPct = Math.max(
      zoomLevel === "day" ? 2 : zoomLevel === "week" ? 1 : 0.5,
      ((eInclusiveMs - sMs) / totalMs) * 100
    );

    const totalImpressions = group.rows.reduce((sum, r) => sum + (r.impressions || 0), 0);
    const totalClicks = group.rows.reduce((sum, r) => sum + (r.clicks || 0), 0);
    const totalSpend = group.rows.reduce((sum, r) => sum + (r.spend || 0), 0);

    return (
      <div
        className="absolute h-4 rounded-sm bg-primary cursor-pointer hover:opacity-80 transition-opacity flex items-center px-1"
        style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "4px" }}
        title={`${group.name} (${s.toISOString().split("T")[0]} → ${e
          .toISOString()
          .split("T")[0]})`}
      >
        {widthPct > (zoomLevel === "day" ? 5 : zoomLevel === "week" ? 3 : 8) && (
          <span className="text-white text-xs font-medium truncate">
            {group.name} · {totalImpressions.toLocaleString()} imp ·{" "}
            {totalClicks.toLocaleString()} clicks ·{" "}
            {totalSpend.toLocaleString(undefined, { style: "currency", currency: "EUR" })}
          </span>
        )}
      </div>
    );
  }

  function handleZoomCycle() {
    // Reset da janela manual ao mudar zoom
    setManualRange(null);
    setZoomLevel((z) => (z === "month" ? "week" : z === "week" ? "day" : "month"));
  }

  function resetView() {
    setManualRange(null);
    setZoomLevel("month");
  }

  function toggleCampaign(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!filtered.length) {
    return (
      <div className="border border-dashed rounded-lg p-6 text-sm text-muted-foreground">
        No flights to display for the current filter.
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      {/* Header com controlos */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Campaign Timeline</h3>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomCycle}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Zoom: {zoomLevel}
          </button>

          <button
            onClick={resetView}
            className="px-3 py-1 text-sm border rounded hover:bg-muted"
            title="Reset view to default month range"
          >
            Reset view
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {/* Cabeçalho da timeline */}
        <div className="flex bg-muted">
          <div className="w-80 p-3 border-r border-border">
            <div className="text-sm font-medium">Campaign / Flight</div>
          </div>

          <div className="flex-1 relative h-16">
            {/* Linhas de grelha */}
            {ticks.map((t) => (
              <div
                key={`grid-${t.key}`}
                className={`absolute top-0 bottom-0 ${
                  t.isMainTick ? "border-l-2 border-border" : "border-l border-border/50"
                }`}
                style={{ left: `${t.leftPct}%` }}
              />
            ))}

            {/* Labels de tempo (clicáveis em mês/semana) */}
            {ticks.map((t) => (
              <button
                key={`label-${t.key}`}
                className={`absolute top-2 text-xs ${
                  t.isMainTick ? "font-medium text-foreground" : "text-muted-foreground"
                } hover:underline`}
                style={{ left: `${t.leftPct}%`, transform: "translateX(-50%)" }}
                onClick={t.onClick}
                title={t.onClick ? "Click to drill down" : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corpo: linhas por campanha + flights */}
        <div>
          {groups.map((group) => {
            const isExpanded = expanded.has(group.id);

            return (
              <div key={group.id} className="flex border-t border-border">
                {/* Coluna fixa com nome da campanha */}
                <div className="w-80 p-3 border-r border-border">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCampaign(group.id)}
                      className="p-1 hover:bg-muted/50 rounded"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div className="text-sm font-medium truncate">{group.name}</div>
                  </div>
                </div>

                {/* Coluna timeline */}
                <div className="flex-1">
                  {/* Barra agregada da campanha */}
                  <div className="relative h-12">
                    {/* grelha */}
                    {ticks.map((t) => (
                      <div
                        key={`campaign-grid-${group.id}-${t.key}`}
                        className={`absolute top-0 bottom-0 ${
                          t.isMainTick
                            ? "border-l-2 border-border"
                            : "border-l border-border/50"
                        }`}
                        style={{ left: `${t.leftPct}%` }}
                      />
                    ))}

                    {campaignBarFor(group)}
                  </div>

                  {/* Flight rows (quando expandido) */}
                  {isExpanded &&
                    group.rows.map((row) => {
                      const b = barFor(row);
                      return (
                        <div key={row.flight_id} className="relative h-10 border-t">
                          {/* grelha */}
                          {ticks.map((t) => (
                            <div
                              key={`flight-grid-${row.flight_id}-${t.key}`}
                              className={`absolute top-0 bottom-0 ${
                                t.isMainTick
                                  ? "border-l-2 border-border"
                                  : "border-l border-border/50"
                              }`}
                              style={{ left: `${t.leftPct}%` }}
                            />
                          ))}

                          {/* Barra do flight */}
                          <div
                            className={`absolute h-3 rounded-sm ${b.color} cursor-pointer hover:opacity-90 transition-opacity flex items-center px-1`}
                            style={{
                              left: `${b.leftPct}%`,
                              width: `${b.widthPct}%`,
                              top: "6px",
                            }}
                            onClick={() => onSelect?.(row)}
                            title={`${row.flight_name} (${row.start_date} → ${row.end_date})`}
                          >
                            {b.widthPct >
                              (zoomLevel === "day" ? 5 : zoomLevel === "week" ? 3 : 8) && (
                              <span className="text-white text-[10px] font-medium truncate">
                                {row.flight_name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}