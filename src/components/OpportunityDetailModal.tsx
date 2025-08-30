// src/components/OpportunityDetailModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Link as LinkIcon, Unlink, PlusCircle, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Opportunity = {
  id: string;
  name: string;
  amount: number | null;
  stage: string;
  probability: number;
  advertiser_id: string | null;
  campaign_id: string | null;
  flight_id: string | null;
  pipeline_id: string | null;
  crm_external_id?: string | null;
  crm_integration_id?: string | null;
};

type FlightRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  campaign_id: string | null;
  campaign_name?: string | null;
};

type AdvertiserInfo = {
  id: string;
  name: string;
};

type BrandInfo = {
  id: string;
  name: string;
};

type Props = {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

export default function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();

  // ---- Manual search (flights) ----
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FlightRow[]>([]);

  // ---- Company tab state ----
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null);
  const [brands, setBrands] = useState<BrandInfo[]>([]);

  // ---- Quick Actions state ----
  const [linkId, setLinkId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  const [flightName, setFlightName] = useState("");
  const [flightCampaignId, setFlightCampaignId] = useState("");
  const [creatingFlight, setCreatingFlight] = useState(false);

  // Load company data when modal opens
  useEffect(() => {
    const loadCompany = async () => {
      if (!isOpen || !opportunity) return;
      setLoadingCompany(true);

      try {
        if (opportunity.advertiser_id) {
          const { data: a, error: aErr } = await supabase
            .from("advertisers")
            .select("id, name")
            .eq("id", opportunity.advertiser_id)
            .maybeSingle();
          if (aErr) throw aErr;
          setAdvertiser(a);

          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);
          if (bErr) throw bErr;
          setBrands((b || []).map(brand => ({ id: brand.id, name: brand.name })));
        } else {
          setAdvertiser(null);
          setBrands([]);
        }
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Failed to load company data",
          description: String(e.message || e),
          variant: "destructive",
        });
      } finally {
        setLoadingCompany(false);
      }
    };

    loadCompany();
  }, [isOpen, opportunity, toast]);

  // Manual search for flights
  const runSearch = async () => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);

    const { data, error } = await supabase
      .from("flights")
      .select(
        `
        id,
        name,
        status,
        start_date,
        end_date,
        campaign_id,
        campaigns ( id, name )
      `
      )
      .ilike("name", `%${search}%`)
      .limit(50);

    if (error) {
      console.error(error);
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
      setSearchResults([]);
    } else {
      const rows: FlightRow[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        campaign_id: r.campaign_id,
        campaign_name: r.campaigns?.name ?? null,
      }));
      setSearchResults(rows);
    }

    setSearching(false);
  };

  // Link selected flight to opportunity
  const linkFlight = async (flightId: string) => {
    if (!opportunity?.id) return;
    const { error } = await supabase
      .from("opportunities")
      .update({ flight_id: flightId })
      .eq("id", opportunity.id);

    if (error) {
      toast({
        title: "Failed to link flight",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Flight linked to opportunity" });
    onUpdate?.();
  };

  const unlinkFlight = async () => {
    if (!opportunity?.id) return;
    const { error } = await supabase
      .from("opportunities")
      .update({ flight_id: null })
      .eq("id", opportunity.id);

    if (error) {
      toast({
        title: "Failed to unlink flight",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Flight unlinked" });
    onUpdate?.();
  };

  // ---- Quick Actions handlers ----

  // 1) Link by Flight ID
  const linkById = async () => {
    if (!linkId.trim()) {
      toast({ title: "Insert a Flight ID", variant: "destructive" });
      return;
    }
    await linkFlight(linkId.trim());
    setLinkId("");
  };

  // 2) Create Campaign (cast para any para contornar tipos gerados)
  const createCampaign = async () => {
    if (!campaignName.trim()) {
      toast({ title: "Insert a campaign name", variant: "destructive" });
      return;
    }
    setCreatingCampaign(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        // 👇 cast para any para não exigir todos os campos do tipo gerado
        .insert([{ name: campaignName.trim() } as any])
        .select("id")
        .single();

      if (error) throw error;

      setCreatedCampaignId(data.id);
      setCampaignName("");
      toast({ title: "Campaign created", description: `ID: ${data.id}` });
    } catch (e: any) {
      toast({
        title: "Failed to create campaign",
        description:
          e?.message ||
          "Your schema may require additional fields (e.g., company/status).",
        variant: "destructive",
      });
    } finally {
      setCreatingCampaign(false);
    }
  };

  // 3) Create Flight & Link (cast para any)
  const createFlightAndLink = async () => {
    if (!opportunity?.id) return;
    if (!flightName.trim()) {
      toast({ title: "Insert a flight name", variant: "destructive" });
      return;
    }
    setCreatingFlight(true);
    try {
      const payload: Record<string, any> = { name: flightName.trim() };
      if (flightCampaignId.trim()) payload.campaign_id = flightCampaignId.trim();

      const { data, error } = await supabase
        .from("flights")
        .insert([payload as any]) // 👈 cast
        .select("id, campaign_id")
        .single();

      if (error) throw error;

      const update: Record<string, any> = { flight_id: data.id };
      if (data.campaign_id) update.campaign_id = data.campaign_id;

      const { error: upErr } = await supabase
        .from("opportunities")
        .update(update)
        .eq("id", opportunity.id);

      if (upErr) throw upErr;

      setFlightName("");
      setFlightCampaignId("");
      toast({ title: "Flight created and linked", description: `ID: ${data.id}` });
      onUpdate?.();
    } catch (e: any) {
      toast({
        title: "Failed to create/link flight",
        description:
          e?.message ||
          "Your schema may require additional fields (e.g., campaign/status).",
        variant: "destructive",
      });
    } finally {
      setCreatingFlight(false);
    }
  };

  const headerBadges = useMemo(() => {
    if (!opportunity) return null;
    return (
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">{opportunity.stage}</Badge>
        <Badge variant="secondary">
          {opportunity.probability ?? 0}% prob.
        </Badge>
        {typeof opportunity.amount === "number" && (
          <Badge variant="outline">
            {new Intl.NumberFormat("pt-PT", {
              style: "currency",
              currency: "EUR",
            }).format(opportunity.amount)}
          </Badge>
        )}
      </div>
    );
  }, [opportunity]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{opportunity?.name ?? "Opportunity"}</DialogTitle>
          {headerBadges}
        </DialogHeader>

        <Tabs defaultValue="search" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full max-w-[400px]">
            <TabsTrigger value="search">Search Flights</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
          </TabsList>

          {/* Manual Search */}
          <TabsContent value="search" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Flights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Type flight name…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={runSearch} disabled={searching}>
                    Search
                  </Button>
                </div>

                {searching ? (
                  <div className="text-sm text-muted-foreground">Searching…</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No results.</div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Campaign: {f.campaign_name || "—"} •{" "}
                            {f.start_date || "—"} → {f.end_date || "—"}
                          </div>
                        </div>
                        <Button size="sm" className="gap-2" onClick={() => linkFlight(f.id)}>
                          <LinkIcon className="h-4 w-4" />
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links & Quick Actions */}
          <TabsContent value="links" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Flight</div>
                        <div className="font-medium">
                          {opportunity?.flight_id || "—"}
                        </div>
                      </div>
                      {opportunity?.flight_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={unlinkFlight}
                        >
                          <Unlink className="h-4 w-4" />
                          Unlink
                        </Button>
                      ) : (
                        <div className="text-xs text-muted-foreground">Not linked</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Campaign</div>
                        <div className="font-medium">
                          {opportunity?.campaign_id || "—"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (Indirect link via Flight)
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Advertiser</div>
                        <div className="font-medium">
                          {opportunity?.advertiser_id || "—"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (From CRM Account mapping)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Link by Flight ID */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Link by Flight ID</div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="paste flight_id…"
                        value={linkId}
                        onChange={(e) => setLinkId(e.target.value)}
                      />
                      <Button onClick={linkById} className="gap-2">
                        <Link2 className="h-4 w-4" />
                        Link
                      </Button>
                    </div>
                  </div>

                  {/* Create Campaign */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Create Campaign (draft)</div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="campaign name…"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                      <Button onClick={createCampaign} className="gap-2" disabled={creatingCampaign}>
                        <PlusCircle className="h-4 w-4" />
                        Create
                      </Button>
                    </div>
                    {createdCampaignId && (
                      <div className="text-xs text-muted-foreground">
                        Last created ID: <span className="font-mono">{createdCampaignId}</span>
                      </div>
                    )}
                  </div>

                  {/* Create Flight & Link */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Create Flight & Link</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="flight name…"
                        value={flightName}
                        onChange={(e) => setFlightName(e.target.value)}
                      />
                      <Input
                        placeholder="campaign_id (optional)…"
                        value={flightCampaignId}
                        onChange={(e) => setFlightCampaignId(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={createFlightAndLink}
                      className="gap-2"
                      disabled={creatingFlight}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Create & Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Company */}
          <TabsContent value="company" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advertiser</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCompany ? (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  ) : !advertiser ? (
                    <div className="text-sm text-muted-foreground">
                      This opportunity has no associated advertiser.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg font-semibold">
                          {advertiser.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {advertiser.id}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        External linking functionality temporarily disabled.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brands</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCompany ? (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  ) : brands.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No brands associated with this advertiser.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {brands.map((b) => (
                        <div key={b.id} className="rounded-lg border p-3">
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {b.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}