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

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  flight_name: string;
  campaign_id: string;
  campaign_name: string;
  name_score: number;
  date_score: number;
  total_score: number;
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

type AdvertiserIdentity = {
  advertiser_id: string;
  advertiser_name: string;
  website: string | null;
  industry: string | null;
  crm_account_external_id: string | null;
  ad_server_advertiser_external_id: string | null;
  crm_name: string | null;
  ad_server_name: string | null;
  crm_opportunities_open?: number | null;
  crm_opportunities_won?: number | null;
};

type BrandIdentity = {
  brand_id: string;
  brand_name: string;
  ad_server_brand_external_id: string | null;
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

  // ---- Suggestions state ----
  const [loadingSug, setLoadingSug] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);

  // ---- Manual search (flights) ----
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FlightRow[]>([]);

  // ---- Company tab state ----
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [adv, setAdv] = useState<AdvertiserIdentity | null>(null);
  const [brands, setBrands] = useState<BrandIdentity[]>([]);

  const oppId = opportunity?.id;

  // Load suggestions when modal opens
  useEffect(() => {
    const run = async () => {
      if (!isOpen || !oppId) return;
      setLoadingSug(true);
      
      // For now, disable suggestions since the view doesn't exist
      // TODO: Implement flight suggestion logic using regular tables
      setSuggestions([]);
      setLoadingSug(false);
    };
    run();
  }, [isOpen, oppId, toast]);

  // Load company (advertiser + brands) when modal opens
  useEffect(() => {
    const loadCompany = async () => {
      if (!isOpen || !opportunity) return;
      setLoadingCompany(true);

      try {
        // 1) Advertiser identity using regular table
        let advRow: AdvertiserIdentity | null = null;

        if (opportunity.advertiser_id) {
          const { data: a, error: aErr } = await supabase
            .from("advertisers")
            .select("id, name")
            .eq("id", opportunity.advertiser_id)
            .maybeSingle();

          if (aErr) throw aErr;
          if (a) {
            advRow = {
              advertiser_id: a.id,
              advertiser_name: a.name,
              website: null,
              industry: null,
              crm_account_external_id: null,
              ad_server_advertiser_external_id: null,
              crm_name: null,
              ad_server_name: null,
              crm_opportunities_open: null,
              crm_opportunities_won: null,
            };
          }
        }

        // 2) Brands using regular table
        let brandRows: BrandIdentity[] = [];
        if (opportunity.advertiser_id) {
          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);

          if (bErr) throw bErr;
          brandRows = ((b || []) as any[]).map(brand => ({
            brand_id: brand.id,
            brand_name: brand.name,
            ad_server_brand_external_id: null,
          })).sort((x, y) => x.brand_name.localeCompare(y.brand_name));
        }

        setAdv(advRow);
        setBrands(brandRows);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Falha ao carregar dados do advertiser",
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

    // pesquisa simples em flights + nome de campaign
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
        title: "Falha na pesquisa",
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
    if (!oppId) return;
    const { error } = await supabase
      .from("opportunities")
      .update({ flight_id: flightId })
      .eq("id", oppId);

    if (error) {
      toast({
        title: "Não foi possível ligar o flight",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Flight ligado à oportunidade" });
    onUpdate?.();
  };

  const unlinkFlight = async () => {
    if (!oppId) return;
    const { error } = await supabase
      .from("opportunities")
      .update({ flight_id: null })
      .eq("id", oppId);

    if (error) {
      toast({
        title: "Não foi possível remover ligação",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Ligação removida" });
    onUpdate?.();
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {opportunity?.name ?? "Opportunity"}
          </DialogTitle>
          {headerBadges}
        </DialogHeader>

        <Tabs defaultValue="suggestions" className="mt-4">
          <TabsList className="grid grid-cols-3 md:grid-cols-4 w-full max-w-[560px]">
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
                  <div className="text-sm text-muted-foreground">A carregar…</div>
                ) : suggestions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Sem sugestões para esta oportunidade.
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
                              {s.total_score.toFixed(1)}
                            </span>{" "}
                            (name {s.name_score.toFixed(1)} • date{" "}
                            {s.date_score.toFixed(1)})
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => linkFlight(s.flight_id)}
                        >
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
                  <div className="text-sm text-muted-foreground">A procurar…</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Sem resultados.
                  </div>
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
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => linkFlight(f.id)}
                        >
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
                      <div className="text-xs text-muted-foreground">
                        Not linked
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Campaign
                      </div>
                      <div className="font-medium">
                        {opportunity?.campaign_id || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      (Ligação indireta via Flight)
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Advertiser
                      </div>
                      <div className="font-medium">
                        {opportunity?.advertiser_id || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      (Vem do mapeamento CRM Account ↔ Advertiser)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company (NEW) */}
          <TabsContent value="company" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advertiser</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCompany ? (
                    <div className="text-sm text-muted-foreground">A carregar…</div>
                  ) : !adv ? (
                    <div className="text-sm text-muted-foreground">
                      Esta oportunidade não tem advertiser associado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-lg font-semibold">
                        {adv.advertiser_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {adv.industry || "—"} {adv.website ? `• ${adv.website}` : ""}
                      </div>

                      <div className="pt-2">
                        <div className="text-xs uppercase text-muted-foreground mb-1">
                          CRM
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">
                            {adv.crm_name || "—"}
                          </span>
                          <div className="text-xs text-muted-foreground break-all">
                            ext_id: {adv.crm_account_external_id || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="text-xs uppercase text-muted-foreground mb-1">
                          Ad Server
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">
                            {adv.ad_server_name || "—"}
                          </span>
                          <div className="text-xs text-muted-foreground break-all">
                            ext_id: {adv.ad_server_advertiser_external_id || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Badge variant="outline">
                          Open: {adv.crm_opportunities_open ?? 0}
                        </Badge>
                        <Badge variant="secondary">
                          Won: {adv.crm_opportunities_won ?? 0}
                        </Badge>
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
                    <div className="text-sm text-muted-foreground">A carregar…</div>
                  ) : brands.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Sem brands associadas a este advertiser.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {brands.map((b) => (
                        <div
                          key={b.brand_id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <div className="font-medium">{b.brand_name}</div>
                            <div className="text-xs text-muted-foreground break-all">
                              ad_server_ext_id: {b.ad_server_brand_external_id || "—"}
                            </div>
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