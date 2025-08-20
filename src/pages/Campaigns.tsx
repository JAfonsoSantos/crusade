// src/pages/Campaigns.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Plus,
  Edit,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Target,
  Eye,
  MousePointer,
  TrendingUp,
  BarChart3,
  Lightbulb,
} from "lucide-react";

import FlightsGantt from "@/components/FlightsGantt";

/* ---------- Tipos locais ---------- */

interface Flight {
  id: string;
  campaign_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget?: number | null;
  currency: string;
  status: string;
  priority: number;
  targeting_criteria: any;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  external_id?: string | null;
  ad_server: string;
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  budget: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  flights?: Flight[];
}

/** Tipo manual para a VIEW v_flights_gantt (evita erros de TS) */
type VFlightsGanttRow = {
  company_id: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string | null;
  flight_name: string | null;
  start_date: string; // Supabase devolve string
  end_date: string;
  priority: number | null;
  status: string | null;
};

/** Item do Gantt que enviamos para o componente */
type GanttItem = {
  id: string;
  left: string; // label à esquerda (campanha/flight)
  right?: string; // label pequena (prioridade/estado)
  start: Date;
  end: Date;
};

/* ---------- Componente ---------- */

export default function Campaigns() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"campaigns" | "ad-funnel" | "timeline">("campaigns");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  // Dialogs (criar campanha / flight)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flightDialogOpen, setFlightDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  // Forms
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    budget: "",
    currency: "EUR",
  });

  const [flightFormData, setFlightFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    budget: "",
    currency: "EUR",
    priority: "1",
    ad_server: "kevel",
  });

  // Timeline
  const [ganttRows, setGanttRows] = useState<VFlightsGanttRow[]>([]);

  useEffect(() => {
    (async () => {
      await fetchCampaigns();
      await fetchTimeline();
    })();
  }, []);

  /* ---------- Fetchers ---------- */

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      const campaignsWithFlights = await Promise.all(
        (campaignsData ?? []).map(async (campaign) => {
          const { data: flightsData } = await supabase
            .from("flights")
            .select("*")
            .eq("campaign_id", campaign.id)
            .order("priority", { ascending: true });

          return { ...campaign, flights: flightsData ?? [] };
        })
      );

      setCampaigns(campaignsWithFlights);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar campanhas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimeline() {
    try {
      // company_id do utilizador
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data: raw, error } = await supabase
        .from("v_flights_gantt" as any) // 👈 força o TS a aceitar a view
        .select("*")
        .eq("company_id", profile.company_id);

      if (error) throw error;

      setGanttRows((raw ?? []) as VFlightsGanttRow[]);
    } catch (err) {
      console.error(err);
      // Mantemos silêncio para não chatear o utilizador; a tab "Timeline" mostra vazio
    }
  }

  async function syncAllIntegrations() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-sync-kevel");
      if (error) throw error;

      toast({
        title: "Sync concluído",
        description:
          (data as any)?.message ??
          `Sincronização terminada: ${(data as any)?.integrations_processed ?? "—"} integrações`,
      });

      await Promise.all([fetchCampaigns(), fetchTimeline()]);
    } catch (err) {
      console.error(err);
      toast({
        title: "Falha na sincronização",
        description: "Tenta novamente dentro de momentos.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  /* ---------- Helpers ---------- */

  function toggleCampaignExpansion(campaignId: string) {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      next.has(campaignId) ? next.delete(campaignId) : next.add(campaignId);
      return next;
    });
  }

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return (num ?? 0).toString();
  };

  function getStatusColor(status?: string | null) {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "draft":
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US");

  /* ---------- Totais de campanha ---------- */

  const calculateCampaignTotals = (flights: Flight[]) =>
    flights.reduce(
      (t, f) => ({
        impressions: t.impressions + (f.impressions ?? 0),
        clicks: t.clicks + (f.clicks ?? 0),
        conversions: t.conversions + (f.conversions ?? 0),
        spend: t.spend + (f.spend ?? 0),
      }),
      { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    );

  /* ---------- Forms ---------- */

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();

    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.user?.id)
      .single();

    if (!profile?.company_id) {
      toast({
        title: "Erro",
        description: "Perfil/Empresa não encontrado.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("campaigns").insert({
      name: formData.name,
      description: formData.description || null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      currency: formData.currency,
      company_id: profile.company_id,
      created_by: user.user?.id ?? null,
      status: "draft",
    });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível criar a campanha.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Campanha criada." });
      setDialogOpen(false);
      setFormData({ name: "", description: "", start_date: "", end_date: "", budget: "", currency: "EUR" });
      await fetchCampaigns();
      await fetchTimeline();
    }
  }

  async function handleCreateFlight(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from("flights").insert({
      name: flightFormData.name,
      description: flightFormData.description || null,
      start_date: flightFormData.start_date,
      end_date: flightFormData.end_date,
      budget: flightFormData.budget ? parseFloat(flightFormData.budget) : null,
      currency: flightFormData.currency,
      priority: parseInt(flightFormData.priority || "1", 10),
      ad_server: flightFormData.ad_server,
      campaign_id: selectedCampaignId,
      status: "draft",
    });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível criar o flight.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Flight criado." });
      setFlightDialogOpen(false);
      setFlightFormData({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        budget: "",
        currency: "EUR",
        priority: "1",
        ad_server: "kevel",
      });
      await fetchCampaigns();
      await fetchTimeline();
    }
  }

  /* ---------- Ad Funnel (mock) ---------- */

  const funnel = {
    slotsAvailable: 10_000_000,
    slotsFilled: 7_200_000,
    impressions: 6_800_000,
    clicks: 816_000,
    transactions: 40_800,
  };

  const pct = (n: number, d: number) => ((n / d) * 100).toFixed(0);

  /* ---------- Timeline data ---------- */

  const ganttItems: GanttItem[] = useMemo(() => {
    return (ganttRows ?? []).map((r) => ({
      id: r.flight_id ?? r.campaign_id,
      left: r.flight_name ? `${r.campaign_name} · ${r.flight_name}` : r.campaign_name,
      right: r.priority != null ? `prio ${r.priority}` : undefined,
      start: new Date(r.start_date),
      end: new Date(r.end_date),
    }));
  }, [ganttRows]);

  const [timelineFrom, timelineTo] = useMemo(() => {
    if (!ganttItems.length) {
      const today = new Date();
      const in7 = new Date();
      in7.setDate(today.getDate() + 7);
      return [today, in7] as const;
    }
    const min = new Date(Math.min(...ganttItems.map((g) => g.start.getTime())));
    const max = new Date(Math.max(...ganttItems.map((g) => g.end.getTime())));
    return [min, max] as const;
  }, [ganttItems]);

  /* ---------- UI ---------- */

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="space-y-6 p-1 md:p-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns & Flights</h2>
          <p className="text-muted-foreground">Manage your advertising campaigns and analyze performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncAllIntegrations} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync with Platforms
              </>
            )}
          </Button>

          {/* New Campaign */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>Set up a new advertising campaign</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="c_name">Campaign Name</Label>
                  <Input
                    id="c_name"
                    value={formData.name}
                    onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Ex: Summer 2024 Campaign"
                    required
                  />
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="c_desc">Description</Label>
                  <Textarea
                    id="c_desc"
                    value={formData.description}
                    onChange={(e) => setFormData((s) => ({ ...s, description: e.target.value }))}
                    placeholder="Campaign description…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="c_start">Start Date</Label>
                    <Input
                      id="c_start"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData((s) => ({ ...s, start_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="c_end">End Date</Label>
                    <Input
                      id="c_end"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData((s) => ({ ...s, end_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="c_budget">Budget</Label>
                    <Input
                      id="c_budget"
                      type="number"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData((s) => ({ ...s, budget: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid w-full items-center gap-1.5">
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => setFormData((s) => ({ ...s, currency: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Create Campaign
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="ad-funnel" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Ad Funnel
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* CAMPAIGNS ------------------------------------------------------- */}
        <TabsContent value="campaigns" className="mt-6">
          {/* Flight creation dialog */}
          <Dialog open={flightDialogOpen} onOpenChange={setFlightDialogOpen}>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Create New Flight</DialogTitle>
                <DialogDescription>Add a new flight to the campaign</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateFlight} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="f_name">Flight Name</Label>
                  <Input
                    id="f_name"
                    value={flightFormData.name}
                    onChange={(e) => setFlightFormData((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Ex: Homepage Banner Flight"
                    required
                  />
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="f_desc">Description</Label>
                  <Textarea
                    id="f_desc"
                    value={flightFormData.description}
                    onChange={(e) => setFlightFormData((s) => ({ ...s, description: e.target.value }))}
                    placeholder="Flight description…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="f_start">Start Date</Label>
                    <Input
                      id="f_start"
                      type="date"
                      value={flightFormData.start_date}
                      onChange={(e) => setFlightFormData((s) => ({ ...s, start_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="f_end">End Date</Label>
                    <Input
                      id="f_end"
                      type="date"
                      value={flightFormData.end_date}
                      onChange={(e) => setFlightFormData((s) => ({ ...s, end_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="f_budget">Budget</Label>
                    <Input
                      id="f_budget"
                      type="number"
                      step="0.01"
                      value={flightFormData.budget}
                      onChange={(e) => setFlightFormData((s) => ({ ...s, budget: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="f_priority">Priority</Label>
                    <Input
                      id="f_priority"
                      type="number"
                      value={flightFormData.priority}
                      onChange={(e) => setFlightFormData((s) => ({ ...s, priority: e.target.value }))}
                      min={1}
                      max={10}
                    />
                  </div>

                  <div className="grid w-full items-center gap-1.5">
                    <Label>Ad Server</Label>
                    <Select
                      value={flightFormData.ad_server}
                      onValueChange={(v) => setFlightFormData((s) => ({ ...s, ad_server: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kevel">🎯 Kevel</SelectItem>
                        <SelectItem value="koddi">🟩 Koddi</SelectItem>
                        <SelectItem value="topsort">🟦 Topsort</SelectItem>
                        <SelectItem value="google">🟦 Google</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Create Flight
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Lista de campanhas */}
          <div className="space-y-4">
            {campaigns.map((c) => {
              const totals = calculateCampaignTotals(c.flights ?? []);
              const isOpen = expandedCampaigns.has(c.id);

              return (
                <Collapsible key={c.id} open={isOpen} onOpenChange={() => toggleCampaignExpansion(c.id)}>
                  <Card className="w-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 rounded p-1">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </CollapsibleTrigger>
                            <CardTitle className="text-lg font-semibold">{c.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {c.flights?.length ?? 0} flights
                            </Badge>
                          </div>
                          {c.description && <p className="text-muted-foreground mt-1 ml-7">{c.description}</p>}
                        </div>
                        <Badge variant="outline" className={getStatusColor(c.status ?? "draft")}>
                          {c.status ?? "draft"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-medium">
                            {c.budget ? `${c.currency ?? "EUR"} ${c.budget.toLocaleString()}` : "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Campaign Period</p>
                          <p className="font-medium text-xs">
                            {formatDate(c.start_date)} - {formatDate(c.end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Impressions</p>
                          <p className="font-medium">{formatNumber(totals.impressions)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Clicks</p>
                          <p className="font-medium">{formatNumber(totals.clicks)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCampaignId(c.id);
                            setFlightDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Flight
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Campaign
                        </Button>
                      </div>

                      {/* Flights */}
                      <Collapsible open={isOpen}>
                        <CollapsibleContent className="space-y-3">
                          {c.flights && c.flights.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-muted-foreground">Flights</h4>
                              {c.flights.map((f) => (
                                <div
                                  key={f.id}
                                  className="bg-muted/30 rounded-lg p-4 ml-4 border-l-2 border-primary/20"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h5 className="font-medium">{f.name}</h5>
                                      {f.description && (
                                        <p className="text-sm text-muted-foreground">{f.description}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Badge variant="outline" className={getStatusColor(f.status)}>
                                        {f.status}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        Priority {f.priority}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Period:</span>
                                      <p className="text-xs">
                                        {formatDate(f.start_date)} - {formatDate(f.end_date)}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Budget:</span>
                                      <p>{f.budget ? `${f.currency} ${f.budget.toLocaleString()}` : "No budget"}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Ad Server:</span>
                                      <p>{f.ad_server}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Spend:</span>
                                      <p>{f.spend ? `${f.currency} ${f.spend.toLocaleString()}` : "€0"}</p>
                                    </div>
                                  </div>

                                  {(f.impressions > 0 || f.clicks > 0) && (
                                    <div className="mt-3 p-3 bg-background/50 rounded">
                                      <h6 className="text-xs font-medium text-muted-foreground mb-2">Performance</h6>
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                          <Eye className="w-3 h-3 text-blue-600" />
                                          <span>{formatNumber(f.impressions)} impressions</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <MousePointer className="w-3 h-3 text-green-600" />
                                          <span>{formatNumber(f.clicks)} clicks</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <TrendingUp className="w-3 h-3 text-purple-600" />
                                          <span>{formatNumber(f.conversions)} conversions</span>
                                        </div>
                                      </div>
                                      {f.clicks > 0 && f.impressions > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          CTR: {((f.clicks / f.impressions) * 100).toFixed(2)}%
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex gap-2 mt-3">
                                    <Button variant="outline" size="sm">
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                    <Button variant="outline" size="sm">
                                      <Target className="h-4 w-4 mr-1" />
                                      Assign Spaces
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-muted/30 rounded-lg ml-4">
                              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground mb-3">No flights in this campaign</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCampaignId(c.id);
                                  setFlightDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create First Flight
                              </Button>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          {campaigns.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first campaign to start promoting your ads.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AD FUNNEL ------------------------------------------------------- */}
        <TabsContent value="ad-funnel" className="mt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{formatNumber(funnel.slotsAvailable)}</div>
                  <div className="text-sm text-muted-foreground">Slots Available</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">{formatNumber(funnel.slotsFilled)}</div>
                  <div className="text-sm text-muted-foreground">Slots Filled</div>
                  <div className="text-xs text-purple-600">
                    {pct(funnel.slotsFilled, funnel.slotsAvailable)}% of Slots Available
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-cyan-600">{formatNumber(funnel.impressions)}</div>
                  <div className="text-sm text-muted-foreground">Impressions</div>
                  <div className="text-xs text-cyan-600">
                    {pct(funnel.impressions, funnel.slotsFilled)}% of Slots Filled
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-gray-600">{formatNumber(funnel.clicks)}</div>
                  <div className="text-sm text-muted-foreground">Clicks</div>
                  <div className="text-xs text-gray-600">{pct(funnel.clicks, funnel.impressions)}% of Impressions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{formatNumber(funnel.transactions)}</div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                  <div className="text-xs text-green-600">{pct(funnel.transactions, funnel.clicks)}% of Clicks</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">AI Recommendation: Improve Ad Visibility</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your ads are not getting enough views. Move ads to higher-traffic areas to increase impressions.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">AI Recommendation: Increase ad slots.</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your inventory fill rate is high. Add ad slots to unlock more revenue.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TIMELINE -------------------------------------------------------- */}
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign & Flight Timeline</CardTitle>
              <p className="text-sm text-muted-foreground">Visualização Gantt das datas dos flights por campanha</p>
            </CardHeader>
            <CardContent>
              {ganttItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No flights found.</div>
              ) : (
                // cast para any evita incompatibilidades de props entre o teu FlightsGantt e este tipo local
                <FlightsGantt items={ganttItems as any} from={timelineFrom} to={timelineTo} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
