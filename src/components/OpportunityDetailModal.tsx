// src/components/OpportunityDetailModal.tsx
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Link as LinkIcon, Unlink, Maximize2, Minimize2, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ---------- Types ---------- */
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

type AdvertiserInfo = { id: string; name: string };
type BrandInfo = { id: string; name: string };

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  flight_name: string;
  campaign_id: string | null;
  campaign_name: string | null;
  total_score: number;
};

type Props = {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

/* ---------- Aux ---------- */
const STAGES = [
  "needs_analysis",
  "value_proposition",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

/* ============================================================
   Component
============================================================ */
export default function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();

  /* ---------- Expand / Edit state ---------- */
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    amount: string; // keep string for input; cast when saving
    probability: string;
    stage: (typeof STAGES)[number];
  } | null>(null);

  useEffect(() => {
    if (isOpen && opportunity) {
      // prepara form sempre que abre (ou troca opp)
      setForm({
        name: opportunity.name ?? "",
        amount:
          typeof opportunity.amount === "number"
            ? String(opportunity.amount)
            : "",
        probability: String(opportunity.probability ?? 0),
        stage: (STAGES.includes(opportunity.stage as any)
          ? (opportunity.stage as any)
          : "needs_analysis") as (typeof STAGES)[number],
      });
    }
  }, [isOpen, opportunity]);

  const openEdit = () => setEditOpen(true);
  const closeEdit = () => setEditOpen(false);

  const saveEdit = async () => {
    if (!opportunity?.id || !form) return;
    setSavingEdit(true);
    try {
      const amountNum =
        form.amount.trim() === "" ? null : Number.parseFloat(form.amount);
      const probNum = Number.parseInt(form.probability || "0", 10);
      const { error } = await supabase
        .from("opportunities")
        .update({
          name: form.name,
          amount: amountNum,
          probability: isFinite(probNum) ? probNum : 0,
          stage: form.stage,
        })
        .eq("id", opportunity.id);

      if (error) {
        toast({
          title: "Failed to save changes",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Opportunity updated" });
      setEditOpen(false);
      onUpdate?.();
    } finally {
      setSavingEdit(false);
    }
  };

  /* ---------- Suggestions (RPC + infinite scroll) ---------- */
  const PAGE_SIZE = 20;
  const [sugs, setSugs] = useState<SuggestionRow[]>([]);
  const [sugsLoading, setSugsLoading] = useState(false);
  const [sugsError, setSugsError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !opportunity?.id) return;
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

      // 1) RPC (tipagem via any para evitar dependência dos types gerados)
      const { data, error } = await (supabase as any).rpc(
        "fetch_opportunity_flight_suggestions",
        {
          p_opportunity_id: opportunity.id,
          p_limit: PAGE_SIZE,
          p_offset: page * PAGE_SIZE,
        }
      );

      if (!error && Array.isArray(data)) {
        const rows = (data || []) as SuggestionRow[];
        setSugs((prev) => [...prev, ...rows]);
        setHasMore(rows.length === PAGE_SIZE);
        setSugsLoading(false);
        return;
      }

      // 2) fallback para view
      const { data: vdata, error: vErr } = (supabase as any)
        .from("v_opportunity_flight_suggestions")
        .select(
          `opportunity_id, flight_id, flight_name, campaign_id, campaign_name, total_score`
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
  }, [isOpen, opportunity?.id, page, hasMore, sugsLoading]);

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

  /* ---------- Manual flight search ---------- */
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

  /* ---------- Company tab ---------- */
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

  /* ---------- Link / Unlink ---------- */
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

  /* ---------- Header badges ---------- */
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

  /* ---------- Render ---------- */
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          expanded
            ? "w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col"
            : "max-w-4xl"
        }
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <DialogTitle>{opportunity?.name ?? "Opportunity"}</DialogTitle>
            {headerBadges}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="gap-2"
            >
              {expanded ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  Collapse
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </>
              )}
            </Button>

            <Button variant="default" size="sm" onClick={openEdit} className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <div className={expanded ? "flex-1 overflow-y-auto pr-1" : ""}>
          <Tabs defaultValue="suggestions" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full max-w-[620px]">
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
                    <div className="text-sm text-muted-foreground">No results.</div>
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
                          <div className="text-lg font-semibold">{advertiser.name}</div>
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
        </div>

        {/* Inline Edit drawer (simple) */}
        {editOpen && form && (
          <div className="mt-4 border-t pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Edit Opportunity</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="op-name">Name</Label>
                  <Input
                    id="op-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="op-amount">Amount</Label>
                  <Input
                    id="op-amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="op-prob">Probability %</Label>
                  <Input
                    id="op-prob"
                    inputMode="numeric"
                    value={form.probability}
                    onChange={(e) =>
                      setForm({ ...form, probability: e.target.value })
                    }
                    placeholder="0-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stage</Label>
                  {/* IMPORTANT: Select value must never be empty string */}
                  <Select
                    value={form.stage}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        stage: (v as (typeof STAGES)[number]) || "needs_analysis",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeEdit} disabled={savingEdit}>
                    Cancel
                  </Button>
                  <Button onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}