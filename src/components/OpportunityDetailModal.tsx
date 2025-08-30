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
import { Search, Link as LinkIcon, Unlink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
};

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  flight_name: string;
  campaign_id: string | null;
  campaign_name: string | null;
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

  // -------------------- Suggestions --------------------
  const [sugs, setSugs] = useState<SuggestionRow[]>([]);
  const [sugsLoading, setSugsLoading] = useState(false);
  const [sugsPage, setSugsPage] = useState(0);
  const [sugsHasMore, setSugsHasMore] = useState(true);
  const [sugsOrder, setSugsOrder] = useState<"score" | "name" | "campaign">("score");
  const [sugsFilter, setSugsFilter] = useState("");

  const pageSize = 20;

  const loadSuggestions = async (reset = false) => {
    if (!opportunity?.id) return;
    setSugsLoading(true);
    try {
      const from = reset ? 0 : sugsPage * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("v_opportunity_flight_suggestions")
        .select(`
          opportunity_id,
          flight_id,
          flight_name,
          campaign_id,
          campaign_name,
          total_score
        `)
        .eq("opportunity_id", opportunity.id)
        .order("total_score", { ascending: false })
        .range(from, to);

      if (error) throw error;
      const rows = (data || []) as any[];
      setSugs(reset ? rows as SuggestionRow[] : [...sugs, ...(rows as SuggestionRow[])]);
      setSugsHasMore(rows.length === pageSize);
      setSugsPage(reset ? 1 : sugsPage + 1);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Falha ao carregar sugestões",
        description: String(e.message || e),
        variant: "destructive",
      });
    } finally {
      setSugsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSugs([]);
    setSugsPage(0);
    setSugsHasMore(true);
    setSugsFilter("");
    setSugsOrder("score");
    loadSuggestions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, opportunity?.id]);

  const sugsFilteredSorted = useMemo(() => {
    const term = sugsFilter.trim().toLowerCase();
    let list = !term
      ? sugs
      : sugs.filter(
          (s) =>
            s.flight_name?.toLowerCase().includes(term) ||
            (s.campaign_name ?? "").toLowerCase().includes(term)
        );

    switch (sugsOrder) {
      case "name":
        list = [...list].sort((a, b) => a.flight_name.localeCompare(b.flight_name));
        break;
      case "campaign":
        list = [...list].sort((a, b) =>
          (a.campaign_name ?? "").localeCompare(b.campaign_name ?? "")
        );
        break;
      default:
        list = [...list].sort((a, b) => b.total_score - a.total_score);
    }
    return list;
  }, [sugs, sugsFilter, sugsOrder]);

  // -------------------- Manual search (flights) --------------------
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

  // -------------------- Link / Unlink --------------------
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

  // -------------------- Company --------------------
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
          if (a) setAdvertiser({ id: a.id, name: a.name });

          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);

          if (bErr) throw bErr;
          setBrands((b || []).map((brand: any) => ({ id: brand.id, name: brand.name })));
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

  // -------------------- Header badges --------------------
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
          <DialogTitle>{opportunity?.name ?? "Opportunity"}</DialogTitle>
          {headerBadges}
        </DialogHeader>

        <Tabs defaultValue="suggestions" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full max-w-[640px]">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="search">Search Flights</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
          </TabsList>

          {/* Suggestions */}
          <TabsContent value="suggestions" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Suggested Flights</CardTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter by name or campaign…"
                      value={sugsFilter}
                      onChange={(e) => setSugsFilter(e.target.value)}
                      className="pl-9 w-[260px]"
                    />
                  </div>
                  <Select
                    value={sugsOrder}
                    onValueChange={(v: "score" | "name" | "campaign") => setSugsOrder(v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Order by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Score (desc)</SelectItem>
                      <SelectItem value="name">Flight name</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSuggestions(true)}
                    disabled={sugsLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
                  {sugsLoading && sugs.length === 0 ? (
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : sugsFilteredSorted.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No suggestions.</div>
                  ) : (
                    sugsFilteredSorted.map((s) => (
                      <div
                        key={`${s.opportunity_id}-${s.flight_id}`}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.flight_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            Campaign: {s.campaign_name || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Score: <span className="font-medium">{s.total_score.toFixed(2)}</span>
                          </div>
                        </div>
                        <Button size="sm" className="gap-2" onClick={() => linkFlight(s.flight_id)}>
                          <LinkIcon className="h-4 w-4" />
                          Link
                        </Button>
                      </div>
                    ))
                  )}

                  {sugsHasMore && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => loadSuggestions(false)}
                        disabled={sugsLoading}
                      >
                        {sugsLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading…
                          </span>
                        ) : (
                          "Load more"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
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
                    {searching ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching…
                      </span>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                  {searching ? (
                    <div className="text-sm text-muted-foreground">Searching…</div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No results.</div>
                  ) : (
                    searchResults.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            Campaign: {f.campaign_name || "—"} • {f.start_date || "—"} → {f.end_date || "—"}
                          </div>
                        </div>
                        <Button size="sm" className="gap-2" onClick={() => linkFlight(f.id)}>
                          <LinkIcon className="h-4 w-4" />
                          Link
                        </Button>
                      </div>
                    ))
                  )}
                </div>
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
                    <div className="max-h-[60vh] overflow-y-auto space-y-2">
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