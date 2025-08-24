import React, { useMemo } from "react";

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

export type FlightsGanttProps = {
  items: TimelineItem[];
  campaignFilter?: string; // "all" or campaign_id
  onSelect?: (it: TimelineItem) => void;
};

function parseISO(d: string) {
  const only = d.length === 10 ? d : d.slice(0,10);
  const [y,m,day] = only.split("-").map(Number);
  return new Date(y, (m||1)-1, day||1);
}
function sod(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function daysBetween(a: Date, b: Date) {
  const ms = 1000*60*60*24;
  return Math.max(0, Math.round((sod(b).getTime() - sod(a).getTime())/ms));
}
function clamp(n:number,min:number,max:number){ return Math.min(max, Math.max(min,n)); }

const STATUS = (s?: string|null) => {
  const v = (s||"").toLowerCase();
  if (v==="active") return "bg-emerald-500";
  if (v==="paused") return "bg-amber-500";
  if (v==="completed") return "bg-blue-500";
  return "bg-slate-400";
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter="all", onSelect }) => {
  const filtered = useMemo(() => {
    return (campaignFilter === "all") ? items.slice() : items.filter(i => i.campaign_id === campaignFilter);
  }, [items, campaignFilter]);

  // group by campaign
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; rows: TimelineItem[] }>();
    for (const it of filtered) {
      const key = it.campaign_id || it.campaign_name;
      if (!m.has(key)) m.set(key, { name: it.campaign_name, rows: [] });
      m.get(key)!.rows.push(it);
    }
    const arr = Array.from(m.entries()).map(([id,g])=>({id, ...g}));
    for (const g of arr) g.rows.sort((a,b)=>parseISO(a.start_date).getTime()-parseISO(b.start_date).getTime());
    arr.sort((a,b)=>a.name.localeCompare(b.name));
    return arr;
  }, [filtered]);

  // global range for axis + bars
  const { min, max, totalDays, monthTicks } = useMemo(() => {
    if (!filtered.length){
      const today = sod(new Date());
      const weekAfter = new Date(today.getTime()+6*86400000);
      return { min: today, max: weekAfter, totalDays: 7, monthTicks: [] as {label:string, posPct:number}[] };
    }
    const starts = filtered.map(r=>parseISO(r.start_date));
    const ends   = filtered.map(r=>parseISO(r.end_date));
    const minD = new Date(Math.min(...starts.map(d=>d.getTime())));
    const maxD = new Date(Math.max(...ends.map(d=>d.getTime())));
    const total = Math.max(1, daysBetween(minD, maxD));
    // month ticks positioned across full range
    const ticks: {label:string, posPct:number}[] = [];
    const d = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const last = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
    while (d <= last) {
      const offset = daysBetween(minD, d);
      ticks.push({
        label: d.toLocaleDateString(undefined,{ month: "short", year: "2-digit" }),
        posPct: clamp((offset/total)*100, 0, 100)
      });
      d.setMonth(d.getMonth()+1);
    }
    return { min: minD, max: maxD, totalDays: total, monthTicks: ticks };
  }, [filtered]);

  // Axis & bars are aligned by rendering them inside the SAME grid column container width
  const HeaderRow = () => (
    <div className="grid grid-cols-[minmax(260px,1fr)_100px_90px_90px_120px_minmax(520px,2fr)] gap-3 px-3 py-2 text-xs text-muted-foreground border-b">
      <div className="font-medium">Campaign / Flight</div>
      <div className="text-right">Impr.</div>
      <div className="text-right">Clicks</div>
      <div className="text-right">Conv.</div>
      <div className="text-right">Spend</div>
      <div className="relative h-5">
        {/* month ticks in the same container as bars */}
        {monthTicks.map((t,i)=>(
          <span key={i} className="absolute -top-0.5 translate-x-[-50%] text-[10px] tabular-nums whitespace-nowrap"
            style={{ left: `${t.posPct}%` }}>{t.label}</span>
        ))}
        {/* baseline */}
        <div className="absolute left-0 right-0 top-4 h-px bg-border" />
      </div>
    </div>
  );

  const BarCell: React.FC<{ row: TimelineItem }> = ({ row }) => {
    const s = parseISO(row.start_date);
    const e = parseISO(row.end_date);
    const leftDays = clamp(daysBetween(min, s), 0, totalDays);
    const widthDays = Math.max(1, clamp(daysBetween(s, e), 0, totalDays));
    const leftPct = (leftDays / (totalDays||1)) * 100;
    const widthPct = Math.max(0.8, (widthDays / (totalDays||1)) * 100);
    const color = STATUS(row.status);
    return (
      <div className="relative h-6 w-full bg-muted/50 rounded">
        <button
          className={`absolute top-1 h-3 rounded ${color} hover:opacity-90 transition`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          title={`${row.flight_name} — ${row.start_date} → ${row.end_date}`}
          onClick={()=>onSelect?.(row)}
        />
      </div>
    );
  };

  return (
    <div className="w-full">
      <HeaderRow />
      <div className="divide-y">
        {groups.map(g => (
          <details key={g.id} className="group">
            <summary className="list-none">
              <div className="grid grid-cols-[minmax(260px,1fr)_100px_90px_90px_120px_minmax(520px,2fr)] gap-3 px-3 py-3 hover:bg-muted/50 cursor-pointer">
                <div className="font-medium flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-primary/60 group-open:rotate-90 transition"></span>
                  {g.name}
                </div>
                <div className="text-right text-muted-foreground">—</div>
                <div className="text-right text-muted-foreground">—</div>
                <div className="text-right text-muted-foreground">—</div>
                <div className="text-right text-muted-foreground">—</div>
                <div className="relative"><div className="h-1" /></div>
              </div>
            </summary>

            {/* flights of this campaign */}
            <div className="space-y-0">
              {g.rows.map(r => (
                <div key={r.flight_id} className="grid grid-cols-[minmax(260px,1fr)_100px_90px_90px_120px_minmax(520px,2fr)] gap-3 px-3 py-2 items-center">
                  <div className="truncate">
                    <div className="text-sm">{r.flight_name}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">{r.start_date} → {r.end_date}</div>
                  </div>
                  <div className="text-right tabular-nums">{r.impressions?.toLocaleString?.() ?? 0}</div>
                  <div className="text-right tabular-nums">{r.clicks?.toLocaleString?.() ?? 0}</div>
                  <div className="text-right tabular-nums">{r.conversions?.toLocaleString?.() ?? 0}</div>
                  <div className="text-right tabular-nums">{typeof r.spend === "number" ? r.spend.toLocaleString(undefined,{style:"currency",currency:"EUR"}) : "€0"}</div>
                  <BarCell row={r} />
                </div>
              ))}
            </div>
          </details>
        ))}
        {!groups.length && (
          <div className="text-sm text-muted-foreground px-3 py-6">No flights for this selection.</div>
        )}
      </div>
    </div>
  );
};

export default FlightsGantt;
