// import React, { useEffect, useMemo, useState } from "react";
import { useEffect, useState, useRef } from 'react';
// import supabase from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  flight_id: string;
  flight_name: string;
  start_date: string;   // ISO date (YYYY-MM-DD)
  end_date: string;     // ISO date (YYYY-MM-DD)
  status: string;       // draft | active | paused | ended
  priority: number | null;
  campaign_id: string;
  campaign_name: string;
  company_id: string;
  campaign_status: string;
};

type Props = {
  companyId: string;
};

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}
function toDate(d: string) { return new Date(d + "T00:00:00"); }

const statusColor: Record<string, string> = {
  draft: "bg-gray-300",
  active: "bg-green-500",
  paused: "bg-yellow-500",
  ended: "bg-gray-500",
};

export default function FlightsGantt({ companyId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_flights_gantt")
        .select("*")
        .eq("company_id", companyId)
        .order("campaign_name", { ascending: true })
        .order("start_date", { ascending: true });
      if (!mounted) return;
      if (error) console.error(error);
      setRows((data || []) as Row[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [companyId]);

  // timeline bounds (min start to max end)
  const { minDate, maxDate, days, campaigns } = useMemo(() => {
    if (rows.length === 0) {
      const today = new Date();
      return { minDate: today, maxDate: new Date(today.getTime() + 7*864e5), days: 7, campaigns: [] as string[] };
    }
    const min = rows.reduce((acc, r) => acc < toDate(r.start_date) ? acc : toDate(r.start_date), toDate(rows[0].start_date));
    const max = rows.reduce((acc, r) => acc > toDate(r.end_date) ? acc : toDate(r.end_date), toDate(rows[0].end_date));
    const ds = daysBetween(min, max);
    const camps = Array.from(new Set(rows.map(r => r.campaign_name)));
    return { minDate: min, maxDate: max, days: ds, campaigns: camps };
  }, [rows]);

  if (loading) return <div className="text-sm text-gray-500">Loading timeline…</div>;
  if (rows.length === 0) return <div className="text-sm text-gray-500">No flights found.</div>;

  return (
    <div className="w-full">
      {/* timeline header (days) */}
      <div className="grid" style={{ gridTemplateColumns: `240px repeat(${days}, minmax(24px,1fr))` }}>
        <div className="text-xs font-semibold p-2">Campaign / Flight</div>
        {Array.from({ length: days }).map((_, i) => {
          const d = new Date(minDate.getTime() + i * 86400000);
          const label = d.toISOString().slice(5, 10); // MM-DD
          return <div key={i} className="text-[10px] text-gray-400 p-1 text-center">{label}</div>;
        })}
      </div>

      {/* per-campaign groups */}
      {campaigns.map((camp) => {
        const rws = rows.filter(r => r.campaign_name === camp);
        return (
          <div key={camp} className="border-t border-gray-200">
            <div className="grid items-stretch" style={{ gridTemplateColumns: `240px repeat(${days}, minmax(24px,1fr))` }}>
              <div className="p-2 text-sm font-medium truncate">{camp}</div>
              {Array.from({ length: days }).map((_, i) => <div key={i} className="border-l border-gray-50" />)}
            </div>

            {/* flights inside campaign */}
            {rws.map((r) => {
              const startOffset = Math.max(0, daysBetween(minDate, toDate(r.start_date)) - 1);
              const span = Math.max(1, daysBetween(toDate(r.start_date), toDate(r.end_date)));
              const bar = (
                <div className={`h-6 rounded ${statusColor[r.status] || "bg-blue-500"} shadow-sm`} title={`${r.flight_name} (${r.start_date} → ${r.end_date})`} />
              );
              return (
                <div key={r.flight_id} className="grid items-center" style={{ gridTemplateColumns: `240px repeat(${days}, minmax(24px,1fr))` }}>
                  <div className="p-2 text-xs text-gray-700 truncate">
                    {r.flight_name}
                    {r.priority !== null && <span className="ml-2 text-[10px] text-gray-400">prio {r.priority}</span>}
                  </div>
                  {/* empty cells before bar */}
                  {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
                  {/* bar spanning */}
                  <div className="col-span-1" style={{ gridColumn: `span ${span} / span ${span}` }}>{bar}</div>
                  {/* fill remaining cells */}
                  {Array.from({ length: Math.max(0, days - startOffset - span) }).map((_, i) => <div key={`f-${i}`} />)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
