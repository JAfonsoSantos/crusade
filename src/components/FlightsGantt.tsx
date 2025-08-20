
import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Minimal type shape for the v_flights_gantt view.
 * We avoid relying on generated Supabase types to keep things simple
 * and to prevent "Invalid Relationships" TS errors in Lovable.
 */
type VGanttRow = {
  company_id: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  priority: number | null;
};

/**
 * Utility: date helpers
 */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" });

/**
 * FlightsGantt
 * - self-contained: resolves company_id of the logged user
 * - fetches rows from view v_flights_gantt for that company
 * - renders a very simple gantt-like bar per flight grouped by campaign
 */
const FlightsGantt: React.FC = () => {
  const [rows, setRows] = useState<VGanttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) who is the user?
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          setRows([]);
          setLoading(false);
          return;
        }

        // 2) get company_id from profiles
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", userId)
          .single();

        if (pErr || !profile?.company_id) {
          setError("No company found for this user.");
          setRows([]);
          setLoading(false);
          return;
        }

        // 3) fetch gantt rows
        const { data, error } = await supabase
          .from("v_flights_gantt")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("campaign_name", { ascending: true })
          .order("start_date", { ascending: true });

        if (error) throw error;
        setRows((data as VGanttRow[]) ?? []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to load timeline.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Derive chart boundaries
  const [minDate, maxDate] = useMemo((): [Date | null, Date | null] => {
    if (rows.length === 0) return [null, null];
    const min = rows.reduce((acc, r) => {
      const d = new Date(r.start_date);
      return d < acc ? d : acc;
    }, new Date(rows[0].start_date));
    const max = rows.reduce((acc, r) => {
      const d = new Date(r.end_date);
      return d > acc ? d : acc;
    }, new Date(rows[0].end_date));
    return [startOfDay(min), startOfDay(max)];
  }, [rows]);

  const days = useMemo(() => {
    if (!minDate || !maxDate) return [];
    const count = daysBetween(minDate, maxDate) + 1;
    return Array.from({ length: count }, (_, i) => addDays(minDate, i));
  }, [minDate, maxDate]);

  // Group by campaign
  const byCampaign = useMemo(() => {
    const map = new Map<string, VGanttRow[]>();
    for (const r of rows) {
      const key = `${r.campaign_id}:::${r.campaign_name}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="text-sm text-muted-foreground">No flights found.</div>
      )}

      {!loading && !error && rows.length > 0 && minDate && maxDate && (
        <Card className="overflow-x-auto">
          {/* Header timeline axis */}
          <div className="min-w-[900px]">
            <div className="grid" style={{ gridTemplateColumns: `260px repeat(${days.length}, 1fr)`}}>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">Campaign / Flight</div>
              {days.map((d, i) => (
                <div key={i} className="px-1 py-2 text-[10px] text-center text-muted-foreground border-b">
                  {dayFmt.format(d)}
                </div>
              ))}
            </div>

            {/* Campaign rows */}
            {byCampaign.map(([key, flights], idx) => {
              const [, campaign_name] = key.split(":::");
              return (
                <div key={key} className={`grid items-stretch border-b last:border-b-0`} style={{ gridTemplateColumns: `260px repeat(${days.length}, 1fr)`}}>
                  <div className="px-3 py-2 text-sm font-medium flex items-center">
                    {campaign_name}
                  </div>
                  {/* background grid */}
                  {days.map((_, i) => (
                    <div key={i} className="border-l last:border-r-0" />
                  ))}
                  {/* bars */}
                  <div className="col-span-full col-start-2 px-2 py-2 space-y-2">
                    {flights.map(f => {
                      const s = startOfDay(new Date(f.start_date));
                      const e = startOfDay(new Date(f.end_date));
                      const offset = daysBetween(minDate, s);
                      const span = Math.max(1, daysBetween(s, e) + 1);

                      return (
                        <div key={f.flight_id} className="relative h-7">
                          <div
                            className="absolute h-7 rounded bg-emerald-500/90 text-white text-[11px] flex items-center px-2 shadow"
                            style={{
                              left: `calc(${offset} * (100% / ${days.length}))`,
                              width: `calc(${span} * (100% / ${days.length}))`,
                            }}
                            title={`${f.flight_name} • ${dayFmt.format(s)} → ${dayFmt.format(e)}`}
                          >
                            <span className="truncate">{f.flight_name}</span>
                            {typeof f.priority === "number" && (
                              <span className="ml-2 text-white/80">prio {f.priority}</span>
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
        </Card>
      )}
    </div>
  );
};

export default FlightsGantt;
