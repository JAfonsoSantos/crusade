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

  // ---- Integrations (para os botões de link) ----
  const [crmIntegrationId, setCrmIntegrationId] = useState<string | null>(null);
  const [adServerIntegrationId, setAdServerIntegrationId] = useState<string | null>(null);

  // Inputs para external IDs
  const [crmExtIdInput, setCrmExtIdInput] = useState("");
  const [adsExtIdInput, setAdsExtIdInput] = useState("");
  const [brandExtInputs, setBrandExtInputs] = useState<Record<string, string>>({});

  const oppId = opportunity?.id;

  // Load suggestions when modal opens (placeholder: desativado)
  useEffect(() => {
    const run = async () => {
      if (!isOpen || !oppId) return;
      setLoadingSug(true);
      setSuggestions([]); // placeholder
      setLoadingSug(false);
    };
    run();
  }, [isOpen, oppId]);

  // Descobrir integrações ativas (CRM vs Ad Server)
  useEffect(() => {
    const loadIntegrations = async () => {
      const { data, error } = await supabase
        .from("ad_server_integrations")
        .select("id, provider, status")
        .eq("status", "active");

      if (error) {
        console.error(error);
        return;
      }
      // Heurística simples: salesforce -> CRM; o primeiro não-salesforce -> AdServer
      const crm = (data || []).find((r: any) => (r.provider || "").toLowerCase().includes("salesforce"));
      const adServer = (data || []).find((r: any) => !((r.provider || "").toLowerCase().includes("salesforce")));

      setCrmIntegrationId(crm?.id ?? null);
      setAdServerIntegrationId(adServer?.id ?? null);
    };
    loadIntegrations();
  }, []);

  // Load company (advertiser + brands) when modal opens
  useEffect(() => {
    const loadCompany = async () => {
      if (!isOpen || !opportunity) return;
      setLoadingCompany(true);

      try {
        // 1) Advertiser
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

          // Tentar carregar external ids já existentes (se tiveres views/links)
          // CRM
          const { data: crmLink } = await supabase
            .from("crm_account_links")
            .select("account_external_id, integration_id")
            .eq("advertiser_id", opportunity.advertiser_id)
            .limit(1)
            .maybeSingle();

          if (advRow && crmLink) {
            advRow.crm_account_external_id = crmLink.account_external_id;
            setCrmExtIdInput(crmLink.account_external_id || "");
            if (!crmIntegrationId && crmLink.integration_id) setCrmIntegrationId(crmLink.integration_id);
          }

          // Ad Server
          const { data: adLink } = await supabase
            .from("ad_server_advertiser_links")
            .select("advertiser_external_id")
            .eq("advertiser_id", opportunity.advertiser_id)
            .limit(1)
            .maybeSingle();

          if (advRow && adLink) {
            advRow.ad_server_advertiser_external_id = adLink.advertiser_external_id;
            setAdsExtIdInput(adLink.advertiser_external_id || "");
          }
        }

        // 2) Brands
        let brandRows: BrandIdentity[] = [];
        if (opportunity.advertiser_id) {
          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);

          if (bErr) throw bErr;

          // apanhar links já existentes para preencher inputs
          const ids = (b || []).map((x: any) => x.id);
          let brandLinks: Record<string, string | null> = {};
          if (ids.length) {
            const { data: bl } = await supabase
              .from("ad_server_brand_links")
              .select("brand_id, brand_external_id")
              .in("brand_id", ids);

            (bl || []).forEach((row: any) => {
              brandLinks[row.brand_id] = row.brand_external_id;
            });
          }

          brandRows = ((b || []) as any[]).map(brand => ({
            brand_id: brand.id,
            brand_name: brand.name,
            ad_server_brand_external_id: brandLinks[brand.id] ?? null,
          })).sort((x, y) => x.brand_name.localeCompare(y.brand_name));

          const initialInputs: Record<string, string> = {};
          brandRows.forEach(br => initialInputs[br.brand_id] = br.ad_server_brand_external_id || "");
          setBrandExtInputs(initialInputs);
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
  }, [isOpen, opportunity, toast, crmIntegrationId]);

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

  // ---------- Helpers de link/unlink ----------
  const callRpcSafely = async (fn: string, args: any) => {
    const { error } = await supabase.rpc(fn, args);
    if (error) throw error;
  };

  const upsertCrmAdvLink = async () => {
    if (!adv?.advertiser_id) return;
    if (!crmExtIdInput.trim()) {
      toast({ title: "Indica o External ID do CRM", variant: "destructive" });
      return;
    }
    try {
      // 1) tenta RPC
      if (crmIntegrationId) {
        await callRpcSafely("upsert_adv_link_fn", {
          p_advertiser_id: adv.advertiser_id,
          p_external_id: crmExtIdInput.trim(),
          p_integration_id: crmIntegrationId,
          p_source: "crm",
        });
      } else {
        // 2) fallback direto
        const { error } = await supabase
          .from("crm_account_links")
          .upsert(
            {
              advertiser_id: adv.advertiser_id,
              account_external_id: crmExtIdInput.trim(),
              integration_id: crmIntegrationId, // pode ser null se não existir
              linked_at: new Date().toISOString(),
            },
            { onConflict: "advertiser_id,integration_id" }
          );
        if (error) throw error;
      }
      toast({ title: "Advertiser ligado ao CRM" });
      setAdv({ ...(adv as AdvertiserIdentity), crm_account_external_id: crmExtIdInput.trim() });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro a ligar ao CRM", description: String(e.message || e), variant: "destructive" });
    }
  };

  const unlinkCrmAdv = async () => {
    if (!adv?.advertiser_id) return;
    try {
      // sem RPC: remover da tabela de links
      const q = supabase.from("crm_account_links").delete().eq("advertiser_id", adv.advertiser_id);
      if (crmIntegrationId) q.eq("integration_id", crmIntegrationId);
      const { error } = await q;
      if (error) throw error;

      toast({ title: "Ligação CRM removida" });
      setAdv({ ...(adv as AdvertiserIdentity), crm_account_external_id: null });
      setCrmExtIdInput("");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro a remover ligação CRM", description: String(e.message || e), variant: "destructive" });
    }
  };

  const upsertAdServerAdvLink = async () => {
    if (!adv?.advertiser_id) return;
    if (!adsExtIdInput.trim()) {
      toast({ title: "Indica o External ID do Ad Server", variant: "destructive" });
      return;
    }
    try {
      if (adServerIntegrationId) {
        await callRpcSafely("upsert_adv_link_fn", {
          p_advertiser_id: adv.advertiser_id,
          p_external_id: adsExtIdInput.trim(),
          p_integration_id: adServerIntegrationId,
          p_source: "ad_server",
        });
      } else {
        const { error } = await supabase
          .from("ad_server_advertiser_links")
          .upsert(
            {
              advertiser_id: adv.advertiser_id,
              advertiser_external_id: adsExtIdInput.trim(),
              linked_at: new Date().toISOString(),
            },
            { onConflict: "advertiser_id" }
          );
        if (error) throw error;
      }
      toast({ title: "Advertiser ligado ao Ad Server" });
      setAdv({ ...(adv as AdvertiserIdentity), ad_server_advertiser_external_id: adsExtIdInput.trim() });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro a ligar ao Ad Server", description: String(e.message || e), variant: "destructive" });
    }
  };

  const unlinkAdServerAdv = async () => {
    if (!adv?.advertiser_id) return;
    try {
      const { error } = await supabase
        .from("ad_server_advertiser_links")
        .delete()
        .eq("advertiser_id", adv.advertiser_id);
      if (error) throw error;

      toast({ title: "Ligação Ad Server removida" });
      setAdv({ ...(adv as AdvertiserIdentity), ad_server_advertiser_external_id: null });
      setAdsExtIdInput("");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro a remover ligação Ad Server", description: String(e.message || e), variant: "destructive" });
    }
  };

  const upsertBrandLink = async (brandId: string) => {
    const ext = (brandExtInputs[brandId] || "").trim();
    if (!ext) {
      toast({ title: "Indica o External ID da Brand", variant: "destructive" });
      return;
    }
    try {
      if (adServerIntegrationId) {
        await callRpcSafely("upsert_brand_link_fn", {
          p_brand_id: brandId,
          p_external_id: ext,
          p_integration_id: adServerIntegrationId,
        });
      } else {
        const { error } = await supabase
          .from("ad_server_brand_links")
          .upsert(
            {
              brand_id: brandId,
              brand_external_id: ext,
              linked_at: new Date().toISOString(),
            },
            { onConflict: "brand_id" }
          );
        if (error) throw error;
      }
      toast({ title: "Brand ligada ao Ad Server" });
      setBrands(prev => prev.map(b => b.brand_id === brandId ? { ...b, ad_server_brand_external_id: ext } : b));
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro a ligar Brand", description: String(e.message || e), variant: "destructive" });
    }
  };

  const unlinkBrand = async (brandId: string) => {
    try {
      const { error } = await supabase
        .from("ad_server_brand_links")
        .delete()
        .eq("brand_id", brandId);
      if (error) throw error;

      toast({ title: "Ligação da Brand removida" });
      setBrands(prev => prev.map(b => b.brand_id === brandId ? { ...b, ad_server_brand_external_id: null } : b));
      setBrandExtInputs(prev => ({ ...prev, [brandId]: "" }));
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro a remover ligação da Brand", description: String(e.message || e), variant: "destructive" });
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

          {/* Company (com botões de link/unlink) */}
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
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg font-semibold">
                          {adv.advertiser_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {adv.industry || "—"} {adv.website ? `• ${adv.website}` : ""}
                        </div>
                      </div>

                      {/* CRM block */}
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="text-xs uppercase text-muted-foreground">
                          CRM
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="CRM External ID (ex: SFDC Account Id)"
                            value={crmExtIdInput}
                            onChange={(e) => setCrmExtIdInput(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button size="sm" onClick={upsertCrmAdvLink} disabled={!adv.advertiser_id}>
                            Link
                          </Button>
                          <Button size="sm" variant="outline" onClick={unlinkCrmAdv} disabled={!adv.advertiser_id || !adv.crm_account_external_id}>
                            Unlink
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Atual: <span className="font-medium">{adv.crm_account_external_id || "—"}</span>
                        </div>
                      </div>

                      {/* Ad Server block */}
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="text-xs uppercase text-muted-foreground">
                          Ad Server
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Ad Server Advertiser External ID"
                            value={adsExtIdInput}
                            onChange={(e) => setAdsExtIdInput(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button size="sm" onClick={upsertAdServerAdvLink} disabled={!adv.advertiser_id}>
                            Link
                          </Button>
                          <Button size="sm" variant="outline" onClick={unlinkAdServerAdv} disabled={!adv.advertiser_id || !adv.ad_server_advertiser_external_id}>
                            Unlink
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Atual: <span className="font-medium">{adv.ad_server_advertiser_external_id || "—"}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex gap-2">
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
                          className="flex items-center justify-between rounded-lg border p-3 gap-4"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{b.brand_name}</div>
                            <div className="text-xs text-muted-foreground break-all">
                              atual: {b.ad_server_brand_external_id || "—"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Ad Server Brand External ID"
                              value={brandExtInputs[b.brand_id] || ""}
                              onChange={(e) =>
                                setBrandExtInputs((prev) => ({
                                  ...prev,
                                  [b.brand_id]: e.target.value,
                                }))
                              }
                              className="max-w-[220px]"
                            />
                            <Button size="sm" onClick={() => upsertBrandLink(b.brand_id)}>
                              Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unlinkBrand(b.brand_id)}
                              disabled={!b.ad_server_brand_external_id}
                            >
                              Unlink
                            </Button>
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