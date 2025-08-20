import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Edit, Megaphone, RefreshCw, ChevronDown, ChevronRight, Target,
  Eye, MousePointer, TrendingUp, BarChart3, Lightbulb, Loader2, Calendar
} from "lucide-react";
import FlightsGantt, { GanttItem } from "@/components/FlightsGantt";

interface Flight {
  id: string;
  campaign_id: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  budget?: number | null;
  currency: string;
  status: string;
  priority: number | null;
  targeting_criteria?: any;
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
  description?: string | null;
  start_date: string;
  end_date: string;
  budget: number | null;
  currency: string;
  status: string;
  created_at: string;
  flights?: Flight[];
}

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flightDialogOpen, setFlightDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("campaigns");
  const { toast } = useToast();

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

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    const { data: campaignsData, error: campaignsError } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (campaignsError) {
      toast({ title: "Error", description: "Could not load campaigns.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const campaignsWithFlights = await Promise.all(
      (campaignsData || []).map(async (campaign) => {
        const { data: flightsData } = await supabase
          .from("flights")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("priority", { ascending: true });
        return { ...campaign, flights: flightsData || [] };
      })
    );

    setCampaigns(campaignsWithFlights as Campaign[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.user?.id)
      .single();

    if (!profile?.company_id) {
      toast({ title: "Error", description: "Company profile not found. Set up your company first.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("campaigns").insert({
      ...formData,
      budget: parseFloat(formData.budget),
      company_id: profile.company_id,
      created_by: user.user?.id,
    });

    if (error) {
      toast({ title: "Error", description: "Could not create campaign.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Campaign created successfully!" });
      setDialogOpen(false);
      setFormData({ name: "", description: "", start_date: "", end_date: "", budget: "", currency: "EUR" });
      fetchCampaigns();
    }
  };

  const handleFlightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("flights").insert({
      ...flightFormData,
      campaign_id: selectedCampaignId,
      budget: flightFormData.budget ? parseFloat(flightFormData.budget) : null,
      priority: parseInt(flightFormData.priority),
    });

    if (error) {
      toast({ title: "Error", description: "Could not create flight.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Flight created successfully!" });
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
      fetchCampaigns();
    }
  };

  const toggleCampaignExpansion = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const s = new Set(prev);
      s.has(campaignId) ? s.delete(campaignId) : s.add(campaignId);
      return s;
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  const calculateCampaignTotals = (flights: Flight[]) => {
    return flights.reduce(
      (totals, f) => ({
        impressions: totals.impressions + f.impressions,
        clicks: totals.clicks + f.clicks,
        conversions: totals.conversions + f.conversions,
        spend: totals.spend + f.spend,
      }),
      { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    );
  };

  const syncAllIntegrations = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-sync-kevel");
      if (error) throw error;
      toast({
        title: "Sync Complete",
        description: data?.message || `Synced ${data?.total_synced} items from ${data?.integrations_processed} integrations`,
      });
      await fetchCampaigns();
    } catch (error) {
      console.error(error);
      toast({ title: "Sync Failed", description: "Failed to sync with ad platforms. Please try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "draft": return "bg-gray-100 text-gray-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });

  if (loading) return <div>Loading…</div>;

  /** --------- Ad Funnel (igual ao teu) --------- */
  const funnelData = { slotsAvailable: 10_000_000, slotsFilled: 7_200_000, impressions: 6_800_000, clicks: 816_000, transactions: 40_800 };
  const pct = (a: number, b: number) => ((a / b) * 100).toFixed(0);

  const AdFunnelContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{formatNumber(funnelData.slotsAvailable)}</div><div className="text-sm text-muted-foreground">Slots Available</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-purple-600">{formatNumber(funnelData.slotsFilled)}</div><div className="text-sm text-muted-foreground">Slots Filled</div><div className="text-xs text-purple-600">{pct(funnelData.slotsFilled, funnelData.slotsAvailable)}% of Slots Available</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-cyan-600">{formatNumber(funnelData.impressions)}</div><div className="text-sm text-muted-foreground">Impressions</div><div className="text-xs text-cyan-600">{pct(funnelData.impressions, funnelData.slotsFilled)}% of Slots Filled</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-gray-600">{formatNumber(funnelData.clicks)}</div><div className="text-sm text-muted-foreground">Clicks</div><div className="text-xs text-gray-600">{pct(funnelData.clicks, funnelData.impressions)}% of Impressions</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{formatNumber(funnelData.transactions)}</div><div className="text-sm text-muted-foreground">Transactions</div><div className="text-xs text-green-600">{pct(funnelData.transactions, funnelData.clicks)}% of Clicks</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="h-5 rounded bg-gradient-to-r from-purple-500 via-cyan-500 via-40% to-green-500" />
          <div className="grid grid-cols-5 gap-4 text-xs text-muted-foreground text-center mt-4">
            <span>Slots Available</span><span>Slots Filled</span><span>Impressions</span><span>Clicks</span><span>Transactions</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-600">AI Recommendation: Improve Ad Visibility</span></div><p className="text-sm text-muted-foreground">Your ads are not getting enough views. Move ads to higher-traffic areas to increase impressions.</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-600">AI Recommendation: Increase ad slots.</span></div><p className="text-sm text-muted-foreground">Your inventory fill rate is high. Add ad slots to unlock more revenue.</p></CardContent></Card>
      </div>
    </div>
  );

  /** --------- Campaigns tab --------- */
  const CampaignsContent: React.FC = () => {
    return (
      <>
        {/* Dialog criar Flight */}
        <Dialog open={flightDialogOpen} onOpenChange={setFlightDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Flight</DialogTitle>
              <DialogDescription>Add a new flight to the campaign</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFlightSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="flight_name">Flight Name</Label>
                <Input id="flight_name" value={flightFormData.name} onChange={(e) => setFlightFormData({ ...flightFormData, name: e.target.value })} placeholder="Ex: Homepage Banner Flight" required />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="flight_description">Description</Label>
                <Textarea id="flight_description" value={flightFormData.description} onChange={(e) => setFlightFormData({ ...flightFormData, description: e.target.value })} placeholder="Flight description..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="flight_start_date">Start Date</Label>
                  <Input id="flight_start_date" type="date" value={flightFormData.start_date} onChange={(e) => setFlightFormData({ ...flightFormData, start_date: e.target.value })} required />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="flight_end_date">End Date</Label>
                  <Input id="flight_end_date" type="date" value={flightFormData.end_date} onChange={(e) => setFlightFormData({ ...flightFormData, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="flight_budget">Budget</Label>
                  <Input id="flight_budget" type="number" step="0.01" value={flightFormData.budget} onChange={(e) => setFlightFormData({ ...flightFormData, budget: e.target.value })} placeholder="0.00" />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="flight_priority">Priority</Label>
                  <Input id="flight_priority" type="number" value={flightFormData.priority} onChange={(e) => setFlightFormData({ ...flightFormData, priority: e.target.value })} min="1" max="10" />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="flight_ad_server">Ad Server</Label>
                  <Select value={flightFormData.ad_server} onValueChange={(value) => setFlightFormData({ ...flightFormData, ad_server: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kevel">🎯 Kevel</SelectItem>
                      <SelectItem value="google">🟦 Google</SelectItem>
                      <SelectItem value="criteo">🟧 Criteo</SelectItem>
                      <SelectItem value="koddi">🟩 Koddi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Create Flight</Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const totals = calculateCampaignTotals(campaign.flights || []);
            const isExpanded = expandedCampaigns.has(campaign.id);

            return (
              <Collapsible key={campaign.id} open={isExpanded} onOpenChange={() => toggleCampaignExpansion(campaign.id)}>
                <Card className="w-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 rounded p-1">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </CollapsibleTrigger>
                          <CardTitle className="text-lg font-semibold">{campaign.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{campaign.flights?.length || 0} flights</Badge>
                        </div>
                        {campaign.description && <p className="text-muted-foreground mt-1 ml-7">{campaign.description}</p>}
                      </div>
                      <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div><p className="text-sm text-muted-foreground">Budget</p><p className="font-medium">{campaign.budget ? `${campaign.currency} ${campaign.budget.toLocaleString()}` : "Not set"}</p></div>
                      <div><p className="text-sm text-muted-foreground">Campaign Period</p><p className="font-medium text-xs">{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</p></div>
                      <div><p className="text-sm text-muted-foreground">Total Impressions</p><p className="font-medium">{formatNumber(totals.impressions)}</p></div>
                      <div><p className="text-sm text-muted-foreground">Total Clicks</p><p className="font-medium">{formatNumber(totals.clicks)}</p></div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedCampaignId(campaign.id); setFlightDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Flight
                      </Button>
                      <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" /> Edit Campaign</Button>
                    </div>

                    <Collapsible open={isExpanded}>
                      <CollapsibleContent className="space-y-3">
                        {campaign.flights && campaign.flights.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground">Flights</h4>
                            {campaign.flights.map((flight) => (
                              <div key={flight.id} className="bg-muted/30 rounded-lg p-4 ml-4 border-l-2 border-primary/20">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h5 className="font-medium">{flight.name}</h5>
                                    {flight.description && <p className="text-sm text-muted-foreground">{flight.description}</p>}
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className={getStatusColor(flight.status)}>{flight.status}</Badge>
                                    <Badge variant="secondary" className="text-xs">Priority {flight.priority ?? "-"}</Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div><span className="text-muted-foreground">Period:</span><p className="text-xs">{formatDate(flight.start_date)} - {formatDate(flight.end_date)}</p></div>
                                  <div><span className="text-muted-foreground">Budget:</span><p>{flight.budget ? `${flight.currency} ${flight.budget.toLocaleString()}` : "No budget"}</p></div>
                                  <div><span className="text-muted-foreground">Ad Server:</span><p>{flight.ad_server}</p></div>
                                  <div><span className="text-muted-foreground">Spend:</span><p>{flight.spend ? `${flight.currency} ${flight.spend.toLocaleString()}` : "€0"}</p></div>
                                </div>

                                {(flight.impressions > 0 || flight.clicks > 0) && (
                                  <div className="mt-3 p-3 bg-background/50 rounded">
                                    <h6 className="text-xs font-medium text-muted-foreground mb-2">Performance</h6>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div className="flex items-center gap-1"><Eye className="w-3 h-3 text-blue-600" /><span>{formatNumber(flight.impressions)} impressions</span></div>
                                      <div className="flex items-center gap-1"><MousePointer className="w-3 h-3 text-green-600" /><span>{formatNumber(flight.clicks)} clicks</span></div>
                                      <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-purple-600" /><span>{formatNumber(flight.conversions)} conversions</span></div>
                                    </div>
                                    {flight.clicks > 0 && flight.impressions > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">CTR: {((flight.clicks / flight.impressions) * 100).toFixed(2)}%</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-muted/30 rounded-lg ml-4">
                            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-3">No flights in this campaign</p>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedCampaignId(campaign.id); setFlightDialogOpen(true); }}>
                              <Plus className="h-4 w-4 mr-2" /> Create First Flight
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
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns</h3>
              <p className="text-muted-foreground text-center mb-4">Create your first campaign to start promoting your ads.</p>
              <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create First Campaign</Button>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  /** --------- Gantt items derivados no cliente --------- */
  const ganttItems: GanttItem[] = useMemo(() => {
    const out: GanttItem[] = [];
    for (const c of campaigns) {
      for (const f of c.flights || []) {
       out.push({
  campaign_id: c.id,
  campaign_name: c.name,
  flight_id: f.id,
  flight_name: f.name,
  start_date: f.start_date,
  end_date: f.end_date,
  priority: f.priority ?? null,
});
      }
    }
    return out;
  }, [campaigns]);

  // eixo temporal: hoje - 7d a hoje + 60d
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 7);
  const to = new Date(today);
  to.setDate(to.getDate() + 60);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns & Flights</h2>
          <p className="text-muted-foreground">Manage your advertising campaigns and analyze performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncAllIntegrations} disabled={syncing}>
            {syncing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing…</>) : (<><RefreshCw className="mr-2 h-4 w-4" /> Sync with Platforms</>)}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Campaign</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>Set up a new advertising campaign</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Summer 2024 Campaign" required />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Campaign description..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="budget">Budget</Label>
                    <Input id="budget" type="number" step="0.01" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="0.00" required />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Campaign</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns" className="flex items-center gap-2"><Target className="h-4 w-4" /> Campaigns</TabsTrigger>
          <TabsTrigger value="ad-funnel" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Ad Funnel</TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6"><CampaignsContent /></TabsContent>
        <TabsContent value="ad-funnel" className="mt-6"><AdFunnelContent /></TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign & Flight Timeline</CardTitle>
              <CardDescription>Visualização Gantt das datas dos flights por campanha</CardDescription>
            </CardHeader>
            <CardContent>
              {ganttItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No flights found.</div>
              ) : (
                <FlightsGantt items={ganttItems} from={from} to={to} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Campaigns;
