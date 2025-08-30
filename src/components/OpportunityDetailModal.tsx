// src/components/OpportunityDetailModal.tsx
/**
 * ✅ PRÉ-REQUISITO (uma vez no Supabase):
 *
 * create or replace function public.fetch_opportunity_flight_suggestions(
 *   p_opportunity_id uuid,
 *   p_limit integer default 30,
 *   p_offset integer default 0
 * )
 * returns table (
 *   opportunity_id uuid,
 *   flight_id uuid,
 *   flight_name text,
 *   campaign_id uuid,
 *   campaign_name text,
 *   total_score numeric
 * )
 * language sql
 * stable
 * as $$
 *   select
 *     o.id              as opportunity_id,
 *     f.id              as flight_id,
 *     f.name            as flight_name,
 *     f.campaign_id,
 *     c.name            as campaign_name,
 *     (
 *       case
 *         when f.name ilike '%' || o.name || '%' then 0.7
 *         when o.name ilike '%' || f.name || '%' then 0.5
 *         else 0.2
 *       end
 *       + case
 *           when f.start_date is not null and f.end_date is not null and o.close_date is not null
 *                and (o.close_date between f.start_date and f.end_date) then 0.3
 *           else 0
 *         end
 *     )::numeric(4,2) as total_score
 *   from public.opportunities o
 *   join public.flights f on true
 *   left join public.campaigns c on c.id = f.campaign_id
 *   where o.id = p_opportunity_id
 *   order by 6 desc
 *   limit p_limit offset p_offset;
 * $$;
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
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

type AdvertiserInfo = {
  id: string;
  name: string;
};

type BrandInfo = {
  id: string;
  name: string;
};

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  flight_name: string;
  campaign_id: string | null;
  campaign_name: string | null;
  total_score: number; // numeric
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

  // -------- Suggestions (RPC + infinite scroll) --------
  const PAGE_SIZE = 20;
  const [sugs, setSugs] = useState<SuggestionRow[]>([]);
  const [sugsLoading, setSugsLoading] = useState(false);
  const [sugsError, setSugsError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !opportunity?.id) return;
    // reset on open/opportunity change
    setSugs([]);
    setPage(0);
    setHasMore(true);
    setSugsError(null);
  }, [isOpen, opportunity?.id]);

  useEffect(() => {
    const load = async () => {
      if (!isOpen || !opportunity?.id || !hasMore || sugsLoading) return;
      setSugsLoading(true);
      setSugsError(null);

      // 1) tentar via RPC tipado
      const { data, error } = await supabase.rpc(
        "fetch_opportunity_flight_suggestions",
        {
          p_opportunity_id: opportunity.id,
          p_limit: PAGE_SIZE,
          p_offset: page * PAGE_SIZE,
        }
      );

      if (!error && Array.isArray(data)) {
        const rows = data as SuggestionRow[];
        setSugs((prev) => [...prev, ...rows]);
        setHasMore(rows.length === PAGE_SIZE);
        setSugsLoading(false);
        return;
      }

      // 2) fallback para a view (pode não estar nos tipos)
      const { data: vdata, error: vErr } = (supabase as any)
        .from("v_opportunity_flight_suggestions")
        .select(
          `
          opportunity_id,
          flight_id,
          flight_name,
          campaign_id,
          campaign_name,
          total_score
        `
        )
        .eq("opportunity_id", opportunity.id)
        .order("total_score", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (vErr) {
        setSugsError(vErr.message || "Failed to load suggestions");
      } else {
        const rows = (vdata || []) as SuggestionRow[];
        setSugs((prev) => [...prev, ...rows]);
        setHasMore(rows.length === PAGE_SIZE);
      }
      setSugsLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, opportunity?.id, page]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && hasMore && !sugsLoading) {
        setPage((p) => p + 1);
      }
    });
    io.observe(el);
    return () => io.unobserve(el);
  }, [hasMore, sugsLoading]);

  // -------- Manual flight search --------
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FlightRow[]>([]);

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

  // -------- Company tab (advertiser + brands) --------
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null);
  const [brands, setBrands] = useState<BrandInfo[]>([]);

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
          setBrands((b || []).map((r) => ({ id: r.id, name: r.name })));
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

  // -------- Link / Unlink flight --------
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

  // -------- Header badges --------
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

        <Tabs defaultValue="suggestions" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full max-w-[520px]">
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
                {sugsError && (
                  <div className="text-sm text-red-600 mb-3">{sugsError}</div>
                )}

                {sugs.length === 0 && !sugsLoading ? (
                  <div className="text-sm text-muted-foreground">
                    No suggestions for this opportunity.
                  </div>
                ) : (
                  <>
                    <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
                      {sugs.map((s) => (
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
                                {Number(s.total_score).toFixed(2)}
                              </span>
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
                      {/* sentinel for infinite scroll */}
                      {hasMore && (
                        <div
                          ref={sentinelRef}
                          className="h-6 w-full flex items-center justify-center text-xs text-muted-foreground"
                        >
                          {sugsLoading ? "Loading…" : "Scroll to load more"}
                        </div>
                      )}
                    </div>
                  </>
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
                  <div className="text-sm text-muted-foreground">
                    No results.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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

          {/* Links */}
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
                      (Indirect link via Flight)
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
                      (From CRM Account mapping)
                    </div>
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
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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