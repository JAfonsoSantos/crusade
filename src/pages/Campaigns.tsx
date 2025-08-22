
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, Calendar, Target, BarChart3, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FlightsGantt, { GanttItem } from "@/components/FlightsGantt";

/**
 * This page keeps your previous UX, but adds a dependency-free Gantt.
 * It does not rely on any external npm libraries, so it compiles on lovable.dev.
 */

type Campaign = {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget?: number;
  currency?: string;
  status?: string;
  created_at?: string;
};

type Flight = {
  id: string;
  campaign_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget?: number | null;
  currency?: string;
  status?: string;
  priority?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  spend?: number | null;
  external_id?: string | null;
  ad_server?: string | null;
  created_at?: string;
  updated_at?: string;
};

const Campaigns: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [flightsByCampaign, setFlightsByCampaign] = useState<Record<string, Flight[]>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    budget: "",
    currency: "EUR",
  });

  useEffect(() => {
    (async () => {
      await fetchCompanyId();
      await fetchCampaignsAndFlights();
      setLoading(false);
    })();
  }, []);

  const fetchCompanyId = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.user.id)
      .single();
    if (profile?.company_id) setCompanyId(profile.company_id);
  };

  const fetchCampaignsAndFlights = async () => {
    try {
      const { data: cData, error: cErr } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (cErr) throw cErr;
      setCampaigns(cData || []);

      // pull flights grouped by campaign
      const byCamp: Record<string, Flight[]> = {};
      for (const c of cData || []) {
        const { data: fData, error: fErr } = await supabase
          .from("flights")
          .select("*")
          .eq("campaign_id", c.id)
          .order("priority", { ascending: true });
        if (!fErr && fData) byCamp[c.id] = fData as unknown as Flight[];
      }
      setFlightsByCampaign(byCamp);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load campaigns/flights", variant: "destructive" });
    }
  };

  const ganttItems: GanttItem[] = useMemo(() => {
    const rows: GanttItem[] = [];
    for (const c of campaigns) {
      const flights = flightsByCampaign[c.id] || [];
      for (const f of flights) {
        if (!f.start_date || !f.end_date) continue;
        rows.push({
          campaign_id: c.id,
          campaign_name: c.name,
          flight_id: f.id,
          flight_name: f.name,
          start_date: f.start_date,
          end_date: f.end_date,
          priority: f.priority ?? undefined,
          status: f.status ?? undefined,
          ad_server: f.ad_server ?? undefined,
        });
      }
    }
    return rows;
  }, [campaigns, flightsByCampaign]);

  // Time window for the Gantt: min two weeks around data
  const [from, to] = useMemo(() => {
    const allDates: string[] = [];
    ganttItems.forEach((r) => {
      allDates.push(r.start_date);
      allDates.push(r.end_date);
    });
    const min = allDates.length
      ? new Date(allDates.sort()[0])
      : new Date();
    const max = allDates.length
      ? new Date(allDates.sort().slice(-1)[0])
      : new Date();
    // pad a few days
    const from = new Date(min); from.setDate(min.getDate() - 3);
    const to = new Date(max); to.setDate(max.getDate() + 3);
    return [from, to];
  }, [ganttItems]);

  const syncAllIntegrations = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-sync-kevel");
      if (error) throw error;
      toast({
        title: "Sync complete",
        description: data?.message ?? "Platforms synced",
      });
      await fetchCampaignsAndFlights();
    } catch (e) {
      console.error(e);
      toast({ title: "Sync failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error("No user");
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.user.id)
        .single();
      if (!profile?.company_id) throw new Error("Company not set");

      const { error } = await supabase.from("campaigns").insert({
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget: parseFloat(formData.budget || "0"),
        currency: formData.currency,
        company_id: profile.company_id,
        created_by: user.user.id,
      });
      if (error) throw error;
      toast({ title: "Campaign created" });
      setDialogOpen(false);
      setFormData({ name: "", description: "", start_date: "", end_date: "", budget: "", currency: "EUR" });
      await fetchCampaignsAndFlights();
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "Failed to create campaign", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

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
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>Set up a new advertising campaign</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
                    <Input id="budget" type="number" step="0.01" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="0.00" />
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
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Target className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="ad-funnel" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Ad Funnel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign & Flight Timeline</CardTitle>
              <CardDescription>Visual timeline (Gantt) grouped by campaign</CardDescription>
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

        {/* The other tabs can reuse your previous components; kept simple here */}
        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>List of campaigns (simplified)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {campaigns.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.start_date} → {c.end_date}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ad-funnel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Funnel</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                We will bring back your Ad Funnel widgets here.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Campaigns;
