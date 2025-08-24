import React, { useMemo, useState } from "react";

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
  campaignFilter?: string;
  onSelect?: (t: TimelineItem) => void;
};

/** Utils */
function parseISO(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function ymd(date: Date) {
  return date.toISOString().slice(0,10);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(0,0,0,0);
  return x;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function daysBetween(a: Date, b: Date) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / (1000*60*60*24)));
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type Level = "month" | "week" | "day";
type Viewport = { level: Level; start: Date; end: Date };

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-amber-500",
  completed: "bg-blue-500",
  draft: "bg-gray-300",
};

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, campaignFilter = "all", onSelect }) => {
  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rows: TimelineItem[] }>();
    for (const it of items) {
      if (campaignFilter !== "all" && it.campaign_id !== campaignFilter) continue;
      const key = it.campaign_id;
      if (!map.has(key)) map.set(key, { id: key, name: it.campaign_name, rows: [] });
      map.get(key)!.rows.push(it);
    }
    return Array.from(map.values());
  }, [items, campaignFilter]);

  const { globalStart, globalEnd } = useMemo(() => {
    if (items.length === 0) {
      const today = new Date();
      return { globalStart: addDays(today,-14), globalEnd: addDays(today,14) };
    }
    const starts = items.map(i=>parseISO(i.start_date).getTime());
    const ends = items.map(i=>parseISO(i.end_date).getTime());
    return { globalStart: new Date(Math.min(...starts)), globalEnd: new Date(Math.max(...ends)) };
  }, [items]);

  const [viewport, setViewport] = useState<Viewport>({
    level: "month",
    start: startOfMonth(globalStart),
    end: endOfMonth(globalEnd),
  });

  const ticks = useMemo(()=>{
    const out: {label:string,date:Date}[]=[];
    if(viewport.level==="month"){
      let d = startOfMonth(viewport.start);
      while(d<=viewport.end){ out.push({label:d.toLocaleString("default",{month:"short"}), date:new Date(d)}); d=new Date(d.getFullYear(),d.getMonth()+1,1); }
    } else if(viewport.level==="week"){
      let d=startOfWeek(viewport.start);
      while(d<=viewport.end){ out.push({label:`${d.getDate()}/${d.getMonth()+1}`, date:new Date(d)}); d=addDays(d,7); }
    } else {
      let d=new Date(viewport.start);
      while(d<=viewport.end){ out.push({label:`${d.getDate()}/${d.getMonth()+1}`, date:new Date(d)}); d=addDays(d,1); }
    }
    return out;
  },[viewport]);

  const totalDays = Math.max(1,daysBetween(viewport.start,viewport.end));

  function barStyle(row:TimelineItem){
    const s=parseISO(row.start_date); const e=parseISO(row.end_date);
    const left=clamp(daysBetween(viewport.start,s),0,totalDays);
    const width=clamp(daysBetween(s,e),0,totalDays);
    return {left:`${(left/totalDays)*100}%`,width:`${Math.max(0.5,(width/totalDays)*100)}%`};
  }

  function handleTickClick(date:Date){
    if(viewport.level==="month"){ setViewport({level:"week",start:startOfWeek(startOfMonth(date)),end:endOfWeek(endOfMonth(date))}); }
    else if(viewport.level==="week"){ setViewport({level:"day",start:startOfWeek(date),end:endOfWeek(date)}); }
  }
  function goUp(){
    if(viewport.level==="day"){ setViewport({level:"week",start:startOfWeek(viewport.start),end:endOfWeek(viewport.end)}); }
    else if(viewport.level==="week"){ setViewport({level:"month",start:startOfMonth(globalStart),end:endOfMonth(globalEnd)}); }
  }

  return <div className="w-full">
    <div className="flex justify-between mb-2 text-xs">
      <span>View: {viewport.level}</span>
      {viewport.level!=="month" && <button onClick={goUp} className="underline">Back</button>}
    </div>
    <div className="flex gap-2 mb-2 text-[11px]">
      {ticks.map((t,i)=><button key={i} onClick={()=>handleTickClick(t.date)} className="px-1">{t.label}</button>)}
    </div>
    <div className="space-y-4">
      {grouped.map(g=><div key={g.id} className="border rounded">
        <div className="px-2 py-1 border-b font-medium">{g.name}</div>
        <div className="p-2 space-y-2">
          {g.rows.map(r=>
            <div key={r.flight_id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3 cursor-pointer truncate" onClick={()=>onSelect&&onSelect(r)}>{r.flight_name}</div>
              <div className="col-span-2 text-right text-xs">{r.impressions??0}</div>
              <div className="col-span-1 text-right text-xs">{r.clicks??0}</div>
              <div className="col-span-1 text-right text-xs">{r.conversions??0}</div>
              <div className="col-span-1 text-right text-xs">{r.spend??0}</div>
              <div className="col-span-4">
                <div className="relative h-4 bg-gray-200 rounded">
                  <div className={`absolute h-2 ${STATUS_COLOR[(r.status||"draft").toLowerCase()]}`} style={{top:"2px",...barStyle(r)}}/>
                </div>
              </div>
            </div>)}
        </div>
      </div>)}
    </div>
  </div>;
};
export default FlightsGantt;
