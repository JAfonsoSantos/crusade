import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";

type GanttRow={company_id:string;campaign_id:string;campaign_name:string;flight_id:string;flight_name:string;start_date:string;end_date:string;priority:number|null;status:string|null;impressions:number|null;clicks:number|null;conversions:number|null;spend:number|null;};

const CampaignsPage:React.FC=()=>{
 const [items,setItems]=useState<TimelineItem[]>([]);
 const [campaignFilter,setCampaignFilter]=useState("all");
 const [loading,setLoading]=useState(true);
 const [syncing,setSyncing]=useState(false);
 const [selected,setSelected]=useState<TimelineItem|null>(null);

 useEffect(()=>{(async()=>{
  setLoading(true);
  try{
   const {data:userRes}=await supabase.auth.getUser();
   const uid=userRes.user?.id;
   if(!uid){setItems([]);setLoading(false);return;}
   const {data:prof}=await supabase.from("profiles").select("company_id").eq("user_id",uid).single();
   const cId=prof?.company_id;
   if(!cId){setItems([]);setLoading(false);return;}
   const {data,error}=await(supabase as any).from("v_gantt_items_fast").select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status,impressions,clicks,conversions,spend").eq("company_id",cId);
   if(error)console.error(error);
   const rows:GanttRow[]=(data as any)||[];
   setItems(rows.map(r=>({...r})));
  }finally{setLoading(false);}
 })();},[]);

 const campaigns=useMemo(()=>{const m=new Map<string,string>();for(const it of items)m.set(it.campaign_id,it.campaign_name);return Array.from(m.entries()).map(([id,name])=>({id,name}));},[items]);

 const syncAll=async()=>{setSyncing(true);try{const {error}=await supabase.functions.invoke("auto-sync-kevel");if(error)throw error;}catch(e){console.error(e);}finally{setSyncing(false);}};

 return<div className="space-y-6">
  <div className="flex justify-between">
   <div><h2 className="text-3xl font-bold">Campaigns & Flights</h2><p className="text-muted-foreground">Manage campaigns and analyze performance</p></div>
   <Button variant="outline" onClick={syncAll} disabled={syncing}>{syncing?(<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Syncing…</>):(<><RefreshCw className="mr-2 h-4 w-4"/>Sync</>)}</Button>
  </div>
  <Card>
   <CardHeader className="flex justify-between"><div><CardTitle>Timeline</CardTitle><CardDescription>Gantt by campaign</CardDescription></div><div className="flex gap-2"><Badge>{items.length} rows</Badge><Select value={campaignFilter} onValueChange={setCampaignFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder="All"/></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{campaigns.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div></CardHeader>
   <CardContent>{loading?(<div className="text-sm flex gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div>):(<FlightsGantt items={items} campaignFilter={campaignFilter} onSelect={t=>setSelected(t)}/>)}</CardContent>
  </Card>
  <Dialog open={!!selected} onOpenChange={v=>!v&&setSelected(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{selected?.flight_name}</DialogTitle></DialogHeader>{selected&&(<div className="grid grid-cols-2 gap-4"><div><div className="text-sm">Campaign</div><div>{selected.campaign_name}</div><div className="mt-2 text-sm">Dates</div><div>{selected.start_date}→{selected.end_date}</div></div><div className="text-sm grid grid-cols-2 gap-1"><div>Impr.</div><div className="text-right">{selected.impressions??0}</div><div>Clicks</div><div className="text-right">{selected.clicks??0}</div><div>Conv.</div><div className="text-right">{selected.conversions??0}</div><div>Spend</div><div className="text-right">{selected.spend??0}</div></div></div>)}</DialogContent></Dialog>
 </div>;
};
export default CampaignsPage;
