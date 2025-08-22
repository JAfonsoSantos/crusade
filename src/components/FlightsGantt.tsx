import React, { useMemo, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

type PrimitiveDate = string | number | Date;

export type GanttItem = {
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: PrimitiveDate;
  end_date: PrimitiveDate;
  priority?: number;
  status?: string;
  ad_server?: string;
};

type Props = {
  items: GanttItem[];
  /**
   * Optional start & end window for the chart.
   * If omitted we compute it from the items.
   */
  from?: PrimitiveDate;
  to?: PrimitiveDate;
  /**
   * Compact mode uses smaller column width and hides toolbars
   */
  compact?: boolean;
};

function toDate(value?: PrimitiveDate): Date {
  if (!value && value !== 0) return new Date(NaN);
  if (value instanceof Date) return value;
  // Try to parse ISO or yyyy-mm-dd safely
  const asString = String(value).trim();
  // If it's a plain date like 2025-12-01 ensure it's treated as local midnight
  // rather than parsed with timezone quirks.
  const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(asString)
    ? `${asString}T00:00:00`
    : asString;
  const dt = new Date(isoLike);
  return dt;
}

function clampDates(start: Date, end: Date): { start: Date; end: Date } {
  if (isNaN(+start) || isNaN(+end) || start > end) {
    const now = new Date();
    const later = new Date(now);
    later.setDate(now.getDate() + 7);
    return { start: now, end: later };
  }
  return { start, end };
}

const FlightsGantt: React.FC<Props> = ({ items, from, to, compact }) => {
  const [view, setView] = useState<ViewMode>("Day");

  const { tasks, startBound, endBound } = useMemo(() => {
    const tasks: Task[] = items.map((it) => {
      const start = toDate(it.start_date);
      const end = toDate(it.end_date);

      // choose a colour by status/priority
      const status = (it.status || "").toLowerCase();
      let progressColor = "#22c55e"; // green
      if (status === "paused") progressColor = "#f59e0b"; // amber
      if (status === "draft") progressColor = "#9ca3af"; // gray
      if (status === "completed") progressColor = "#3b82f6"; // blue

      const progress =
        status === "completed" ? 100 : status === "active" ? 100 : 60;

      // Title shown on hover
      const displayName = `${it.flight_name} ${it.priority ? `(prio ${it.priority})` : ""}`.trim();

      return {
        id: it.flight_id,
        name: displayName,
        start,
        end,
        type: "task",
        progress,
        styles: {
          progressColor,
          progressSelectedColor: progressColor,
          backgroundColor: "#e5e7eb",
          backgroundSelectedColor: "#e5e7eb",
        },
      } as Task;
    });

    // Add "project" rows per campaign (optional nice grouping)
    const byCampaign = new Map<string, { name: string; min: Date; max: Date }>();
    items.forEach((it) => {
      const start = toDate(it.start_date);
      const end = toDate(it.end_date);
      const curr = byCampaign.get(it.campaign_id);
      if (!curr) {
        byCampaign.set(it.campaign_id, {
          name: it.campaign_name,
          min: start,
          max: end,
        });
      } else {
        if (start < curr.min) curr.min = start;
        if (end > curr.max) curr.max = end;
      }
    });

    byCampaign.forEach((agg, campId) => {
      tasks.unshift({
        id: `campaign-${campId}`,
        name: agg.name,
        start: agg.min,
        end: agg.max,
        type: "project",
        progress: 0,
        hideChildren: false,
      } as Task);
    });

    const allStarts = tasks.map((t) => t.start);
    const allEnds = tasks.map((t) => t.end);
    const min = new Date(Math.min(...allStarts.map((d) => +d)));
    const max = new Date(Math.max(...allEnds.map((d) => +d)));
    const { start, end } = clampDates(from ? toDate(from) : min, to ? toDate(to) : max);

    return { tasks, startBound: start, endBound: end };
  }, [items, from, to]);

  // Column width & locale tweaks so the header looks clean
  const columnWidth = compact ? 52 : 64;

  return (
    <div className="w-full">
      {!compact && (
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="flex gap-2">
            <button
              className="px-2 py-1 rounded border text-sm"
              onClick={() => setView("Day")}
            >
              Dia
            </button>
            <button
              className="px-2 py-1 rounded border text-sm"
              onClick={() => setView("Week")}
            >
              Semana
            </button>
            <button
              className="px-2 py-1 rounded border text-sm"
              onClick={() => setView("Month")}
            >
              Mês
            </button>
          </div>
          <div className="text-xs text-gray-500">
            {startBound.toLocaleDateString("pt-PT")} →{" "}
            {endBound.toLocaleDateString("pt-PT")}
          </div>
        </div>
      )}

      <Gantt
        tasks={tasks}
        viewMode={view}
        columnWidth={columnWidth}
        locale="pt-PT"
        preStepsCount={2}
        ganttHeight={compact ? 320 : 460}
        listCellWidth={compact ? "200px" : "260px"}
        barCornerRadius={2}
        todayColor="#d1fae5"
        TooltipContent={({ task }) => (
          <div className="p-2 text-xs">
            <div className="font-medium">{task.name}</div>
            <div>
              {task.start.toLocaleDateString("pt-PT")} →{" "}
              {task.end.toLocaleDateString("pt-PT")}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default FlightsGantt;
