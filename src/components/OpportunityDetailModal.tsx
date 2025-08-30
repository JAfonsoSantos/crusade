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
import { Search, Link as LinkIcon, Unlink } from "lucide-react";
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

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  flight_name: string;
  campaign_id: string | null;
  campaign_name: string | null;
  total_score: number;
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

  // ---- Suggestions ----
  const [loadingSug, setLoadingSug] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);

  // ---- Manual search (flights) ----
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FlightRow[]>([]);

  // ---- Company tab state ----
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null);
  const [brands, setBrands] = useState<BrandInfo[]>([]);

  // Load suggestions when modal opens
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!isOpen || !opportunity?.id) return;
      setLoadingSug(true);
      try {
        // cast para ignorar tipos (a view não existe nos types gerados)
        const sb: any = supabase;
        const { data, error } = await sb
          .from("v_opportunity_flight_suggestions")
          .select(
            "opportunity_id, flight_id, flight_name, campaign_id, campaign_name, total_score"
          )
          .eq("opportunity_id", opportunity.id)
          .order("total_score", { ascending: false })
          .limit(10);

        if (error) throw error;

        const rows: SuggestionRow[] = (data || []).map((r: any) => ({
          opportunity_id: r.opportunity_id,
          flight_id: r.flight_id,
          flight_name: r.flight_name,
          campaign_id: r.campaign_id ?? null,
          campaign_name: r.campaign_name ?? null,
          total_score: Number(r.total_score ?? 0),
        }));

        setSuggestions(rows);
      } catch (e: any) {
        console.error(e);
        setSuggestions([]);
        toast({
          title: "Failed to load suggestions",
          description: String(e.message || e),
          variant: "destructive",
        });
      } finally {
        setLoadingSug(false);
      }
    };

    loadSuggestions();
  }, [isOpen, opportunity?.id, toast]);

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
          if (a) setAdvertiser({ id: a.id, name: a.name });

          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);

          if (bErr) throw bErr;
          setBrands((b || []).map((brand) => ({ id: brand.id, name: brand.name })));
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

  const headerBadges = useMemo(() => {
    if (!opportunity) return null;
    return (
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">{opportunity.stage}</Badge>
        <Badge variant="secondary">{opportunity.probability ?? 0}% prob.</Badge>
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

        <Tabs defaultValue="suggestions" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full max-w-[540px]">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="search">Search Flights</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
          </TabsList>

          {/* Suggestions */}
          <TabsContent value="suggestions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Suggested Flights</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSug ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : suggestions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No suggestions for this opportunity.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <div
                        key={`${s.opportunity_id}-${s.flight_id}`}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">{s.flight_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Campaign: {s.campaign_name || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Score:{" "}
                            <span className="font-medium">
                              {Number(s.total_score ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" className="gap-2" onClick={() => linkFlight(s.flight_id)}>
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
                            Campaign: {f.campaign_name || "—"} • {f.start_date || "—"} →{" "}
                            {f.end_date || "—"}
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

          {/* Links (current link / unlink) */}
          <TabsContent value="links" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Flight</div>
                      <div className="font-medium">{opportunity?.flight_id || "—"}</div>
                    </div>
                    {opportunity?.flight_id ? (
                      <Button variant="outline" size="sm" className="gap-2" onClick={unlinkFlight}>
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
                      <div className="font-medium">{opportunity?.campaign_id || "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">(Indirect link via Flight)</div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Advertiser</div>
                      <div className="font-medium">{opportunity?.advertiser_id || "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">(From CRM Account mapping)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                        <div className="text-lg font-semibold">{advertiser.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {advertiser.id}</div>
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
                          <div className="text-xs text-muted-foreground">ID: {b.id}</div>
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