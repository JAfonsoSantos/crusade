import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, BarChart3, Target, RefreshCw, Loader2 } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  budget?: number | null;
  currency?: string | null;
  status?: string | null;
};

type GanttRow = {
  company_id: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string;
  end_date: string;
  priority: number | null;
  status: string | null;
};

type FlightDetail = {
  id: string;
  campaign_id: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  budget?: number | null;
  currency?: string | null;
  status?: string | null;
  priority?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
  ad_server?: string | null;
};

const CampaignsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"timeline" | "campaigns" | "ad-funnel">("timeline");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters & zoom
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [zoom, setZoom] = useState<"week" | "month" | "quarter" | "custom">("month");

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<TimelineItem | null>(null);
  const [flightDetail, setFlightDetail] = useState<FlightDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) {
          setLoading(false);
          return;
        }
        const { data: prof } = await supabase.from("profiles").select("company_id").eq("user_id", uid).single();
        const cId = (prof?.company_id as string) || null;
        setCompanyId(cId);

        const { data: cData } = await supabase.from("campaigns").select("*").order("start_date", { ascending: true });
        setCampaigns((cData as Campaign[]) || []);

        if (cId) {
          const { data: gData } = await (supabase as any)
            .from("v_gantt_items")
            .select("company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status")
            .eq("company_id", cId);
          const rows = (gData as GanttRow[]) || [];
          const mapped: TimelineItem[] = rows.map((r) => ({
            campaign_id: r.campaign_id,
            campaign_name: r.campaign_name,
            flight_id: r.flight_id,
            flight_name: r.flight_name,
            start_date: r.start_date,
            end_date: r.end_date,
            priority: r.priority,
            status: r.status,
          }));
          setItems(mapped);
        } else {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Filtering client-side
  const filteredItems = useMemo(() => {
    let data = [...items];
    if (selectedCampaigns.length > 0) {
      const setIds = new Set(selectedCampaigns);
      data = data.filter((i) => setIds.has(i.campaign_id));
    }
    if (statusFilter !== "all") {
      data = data.filter((i) => (i.status || "draft").toLowerCase() === statusFilter);
    }
    if (fromDate) {
      data = data.filter((i) => i.end_date >= fromDate);
    }
    if (toDate) {
      data = data.filter((i) => i.start_date <= toDate);
    }
    return data;
  }, [items, selectedCampaigns, statusFilter, fromDate, toDate]);

  // Zoom -> compute from/to
  const nowRange = useMemo(() => {
    if (zoom === "custom" && fromDate && toDate) {
      return { from: new Date(fromDate), to: new Date(toDate) };
    }
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    let end = new Date(start);
    if (zoom === "week") {
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (zoom === "month") {
      end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
    } else if (zoom === "quarter") {
      end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 3);
    }
    return { from: start, to: end };
  }, [zoom, fromDate, toDate]);

  const openFlight = async (t: TimelineItem) => {
    setSelectedFlight(t);
    setOpenModal(true);
    setLoadingDetail(true);
    try {
      const { data } = await supabase.from("flights").select("*").eq("id", t.flight_id).single();
      setFlightDetail((data as FlightDetail) || null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const byStatusColor = (status?: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "bg-green-100 text-green-800";
    if (s === "paused") return "bg-yellow-100 text-yellow-800";
    if (s === "completed") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const CampaignsList = useMemo(
    () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{c.name}</CardTitle>
                <Badge className={byStatusColor(c.status)} variant="outline">
                  {c.status || "draft"}
                </Badge>
              </div>
              <CardDescription>
                {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    ),
    [campaigns]
  );

  const AdFunnel = (
    <Card>
      <CardHeader>
        <CardTitle>Ad Funnel</CardTitle>
        <CardDescription>Demo metrics</CardDescription>
      </CardHeader>
      <CardContent>Coming soon…</CardContent>
    </Card>
  );

  const syncAll = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("auto-sync-kevel");
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A carregar…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns & Flights</h2>
          <p className="text-muted-foreground">Manage your advertising campaigns and analyze performance</p>
        </div>
        <Button variant="outline" onClick={syncAll} disabled={syncing}>
          {syncing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing…</>) : (<><RefreshCw className="mr-2 h-4 w-4" /> Sync with Platforms</>)}        </Button>
      </div>

      {/* Filters & zoom */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros & Zoom</CardTitle>
          <CardDescription>Refina o que vês no timeline</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Label>Campaign</Label>
            <Select onValueChange={(v) => setSelectedCampaigns(v ? [v] : [])}>
              <SelectTrigger><SelectValue placeholder="All campaigns" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setZoom("custom"); }} />
          </div>

          <div>
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setZoom("custom"); }} />
          </div>

          <div>
            <Label>Zoom</Label>
            <Select value={zoom} onValueChange={(v: any) => setZoom(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="custom">Custom (by dates)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Timeline</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2"><Target className="h-4 w-4" /> Campaigns</TabsTrigger>
          <TabsTrigger value="ad-funnel" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Ad Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign & Flight Timeline</CardTitle>
              <CardDescription>Visualização Gantt por campanha</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem flights para mostrar.</div>
              ) : (
                <FlightsGantt
                  items={filteredItems}
                  from={zoom === "custom" && fromDate ? new Date(fromDate) : nowRange.from}
                  to={zoom === "custom" && toDate ? new Date(toDate) : nowRange.to}
                  onSelect={openFlight}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">{CampaignsList}</TabsContent>
        <TabsContent value="ad-funnel" className="mt-6">{AdFunnel}</TabsContent>
      </Tabs>

      {/* Flight details modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{selectedFlight?.flight_name || "Flight"}</DialogTitle>
            <DialogDescription>
              {selectedFlight?.campaign_name} • {selectedFlight?.start_date} → {selectedFlight?.end_date}
            </DialogDescription>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading details…
            </div>
          ) : flightDetail ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium">{flightDetail.status || "draft"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Priority</div>
                <div className="font-medium">{flightDetail.priority ?? "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Budget</div>
                <div className="font-medium">{flightDetail.budget ? `${flightDetail.currency || "EUR"} ${flightDetail.budget.toLocaleString()}` : "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Spend</div>
                <div className="font-medium">{flightDetail.spend ? `${flightDetail.currency || "EUR"} ${flightDetail.spend.toLocaleString()}` : "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Impressions</div>
                <div className="font-medium">{(flightDetail.impressions ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Clicks</div>
                <div className="font-medium">{(flightDetail.clicks ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Conversions</div>
                <div className="font-medium">{(flightDetail.conversions ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Ad Server</div>
                <div className="font-medium">{flightDetail.ad_server || "-"}</div>
              </div>
              {flightDetail.description && (
                <div className="col-span-2">
                  <div className="text-muted-foreground">Description</div>
                  <div>{flightDetail.description}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No details found.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsPage;
