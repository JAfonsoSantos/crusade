// src/components/OpportunityDetailModal.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import {
  Search,
  Link as LinkIcon,
  Unlink,
  Pencil,
  Save,
  X,
  Maximize2,
  Minimize2,
  RotateCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  close_date: string | null; // DATE na BD (YYYY-MM-DD)
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

const STAGE_OPTIONS = [
  { key: "needs_analysis", label: "Needs Analysis" },
  { key: "value_proposition", label: "Value Proposition" },
  { key: "proposal", label: "Proposal/Quote" },
  { key: "negotiation", label: "Negotiation/Review" },
  { key: "closed_won", label: "Closed Won" },
  { key: "closed_lost", label: "Closed Lost" },
];

export default function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  // ---------- EDIT MODE ----------
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Opportunity>>({});

  // ---------- Flights: search ----------
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FlightRow[]>([]);

  // ---------- Suggestions ----------
  const [loadingSug, setLoadingSug] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);

  // ---------- Company tab ----------
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null);
  const [brands, setBrands] = useState<BrandInfo[]>([]);

  // Sync local edit form when the incoming opportunity changes
  useEffect(() => {
    if (!opportunity) return;
    setForm({
      name: opportunity.name,
      amount: opportunity.amount ?? null,
      probability: opportunity.probability ?? 0,
      stage: opportunity.stage,
      close_date: opportunity.close_date ?? null,
    });
  }, [opportunity]);

  // Keyboard shortcuts: e (edit), s (save), Esc (cancel)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && !editMode) {
        setEditMode(true);
      } else if (e.key.toLowerCase() === "s" && editMode) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape" && editMode) {
        setEditMode(false);
        // reset form to original
        if (opportunity) {
          setForm({
            name: opportunity.name,
            amount: opportunity.amount ?? null,
            probability: opportunity.probability ?? 0,
            stage: opportunity.stage,
            close_date: opportunity.close_date ?? null,
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editMode, opportunity, form]);

  // -------- Suggestions loader --------
  useEffect(() => {
    const run = async () => {
      if (!isOpen || !opportunity?.id) return;
      setLoadingSug(true);
      try {
        const { data, error } = await supabase
          .from("v_opportunity_flight_suggestions")
          .select("opportunity_id, flight_id, flight_name, campaign_id, campaign_name, total_score")
          .eq("opportunity_id", opportunity.id)
          .order("total_score", { ascending: false })
          .limit(50);
        if (error) throw error;

        setSuggestions((data || []) as SuggestionRow[]);
      } catch (err: any) {
        console.error(err);
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    };
    run();
  }, [isOpen, opportunity?.id]);

  // -------- Company loader --------
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
          setAdvertiser(a ?? null);

          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);
          if (bErr) throw bErr;
          setBrands(((b || []) as any[]).map(r => ({ id: r.id, name: r.name })));
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

  // -------- Flights search --------
  const runSearch = async () => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("flights")
        .select(`
          id,
          name,
          status,
          start_date,
          end_date,
          campaign_id,
          campaigns ( id, name )
        `)
        .ilike("name", `%${search}%`)
        .limit(50);
      if (error) throw error;
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
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Search failed",
        description: e.message || String(e),
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

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

  const formatCurrency = useCallback((amt?: number | null) => {
    if (typeof amt !== "number") return "—";
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amt);
  }, []);

  const headerBadges = useMemo(() => {
    if (!opportunity) return null;
    return (
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">{opportunity.stage}</Badge>
        <Badge variant="secondary">{opportunity.probability ?? 0}% prob.</Badge>
        {typeof opportunity.amount === "number" && (
          <Badge variant="outline">{formatCurrency(opportunity.amount)}</Badge>
        )}
      </div>
    );
  }, [opportunity, formatCurrency]);

  // ---------- Save (with diff toast) ----------
  const handleSave = async () => {
    if (!opportunity?.id) return;

    // Compute diff
    const diff: Record<string, { from: any; to: any }> = {};
    const fields: (keyof Opportunity)[] = ["name", "amount", "probability", "stage", "close_date"];
    fields.forEach((f) => {
      const before = (opportunity as any)[f];
      const after = (form as any)[f];
      const normalizedBefore =
        f === "amount" && typeof before === "string" ? Number(before) : before;
      const normalizedAfter =
        f === "amount" && typeof after === "string" ? Number(after) : after;

      if (normalizedBefore !== normalizedAfter) {
        diff[f] = { from: before, to: normalizedAfter };
      }
    });

    if (Object.keys(diff).length === 0) {
      toast({ title: "Nothing to save", description: "No changes detected." });
      setEditMode(false);
      return;
    }

    const patch: Partial<Opportunity> = {};
    Object.keys(diff).forEach((k) => {
      // @ts-ignore
      patch[k] = diff[k].to;
    });

    const { error } = await supabase
      .from("opportunities")
      .update(patch)
      .eq("id", opportunity.id);

    if (error) {
      toast({
        title: "Failed to save opportunity",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const lines = Object.entries(diff)
      .map(([k, v]) => `• ${k}: "${v.from ?? "—"}" → "${v.to ?? "—"}"`)
      .join("\n");

    toast({
      title: "Opportunity updated",
      description: lines,
    });

    setEditMode(false);
    onUpdate?.();
  };

  const ExpandedWrap = expanded ? "div" : React.Fragment;
  const expandedProps = expanded
    ? { className: "max-h-[70vh] overflow-y-auto pr-1" }
    : {};

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={expanded ? "max-w-[1100px] h-[90vh]" : "max-w-4xl"}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>{opportunity?.name ?? "Opportunity"}</DialogTitle>
              {headerBadges}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                title={expanded ? "Collapse" : "Expand"}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              {!editMode ? (
                <Button variant="outline" className="gap-2" onClick={() => setEditMode(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit (E)
                </Button>
              ) : (
                <>
                  <Button className="gap-2" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                    Save (S)
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setEditMode(false);
                      // reset form
                      if (opportunity) {
                        setForm({
                          name: opportunity.name,
                          amount: opportunity.amount ?? null,
                          probability: opportunity.probability ?? 0,
                          stage: opportunity.stage,
                          close_date: opportunity.close_date ?? null,
                        });
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel (Esc)
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                title="Refresh from DB"
                onClick={() => onUpdate?.()}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ExpandedWrap {...expandedProps}>
          {/* EDIT BLOCK (inline) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            {/* Name */}
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              {editMode ? (
                <Input
                  value={form.name ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              ) : (
                <div>{opportunity?.name || "—"}</div>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Amount</div>
              {editMode ? (
                <Input
                  inputMode="decimal"
                  value={form.amount ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value ? Number(e.target.value) : null }))
                  }
                />
              ) : (
                <div>{formatCurrency(opportunity?.amount)}</div>
              )}
            </div>

            {/* Probability */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Probability (%)</div>
              {editMode ? (
                <Input
                  inputMode="numeric"
                  value={form.probability ?? 0}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      probability: e.target.value ? Math.max(0, Math.min(100, Number(e.target.value))) : 0,
                    }))
                  }
                />
              ) : (
                <div>{opportunity?.probability ?? 0}%</div>
              )}
            </div>

            {/* Stage */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Stage</div>
              {editMode ? (
                <Select
                  value={(form.stage as string) ?? ""}
                  onValueChange={(v) => setForm((p) => ({ ...p, stage: v as Opportunity["stage"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">
                  {STAGE_OPTIONS.find((s) => s.key === opportunity?.stage)?.label ||
                    opportunity?.stage ||
                    "—"}
                </Badge>
              )}
            </div>

            {/* Close date */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Close Date</div>
              {editMode ? (
                <Input
                  type="date"
                  value={form.close_date ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, close_date: e.target.value || null }))}
                />
              ) : (
                <div>{opportunity?.close_date ?? "—"}</div>
              )}
            </div>
          </div>

          <Tabs defaultValue="search" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full max-w-[560px]">
              <TabsTrigger value="search">Search Flights</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
            </TabsList>

            {/* Search Flights */}
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter") runSearch();
                        }}
                      />
                    </div>
                    <Button onClick={runSearch} disabled={searching}>
                      Search
                    </Button>
                  </div>

                  {searching ? (
                    <div className="text-sm text-muted-foreground">Searching…</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {searchResults.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No results.</div>
                      ) : (
                        searchResults.map((f) => (
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
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suggestions */}
            <TabsContent value="suggestions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Flights</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSug ? (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {suggestions.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No suggestions.</div>
                      ) : (
                        suggestions.map((s) => (
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
                      <div className="text-xs text-muted-foreground">(Indirect via Flight)</div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Advertiser</div>
                        <div className="font-medium">{opportunity?.advertiser_id || "—"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (From CRM Account ↔ Advertiser mapping)
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
                          <div className="text-sm text-muted-foreground">ID: {advertiser.id}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          External linking temporarily disabled.
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
                      <div className="text-sm text-muted-foreground">No brands linked to this advertiser.</div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
        </ExpandedWrap>
      </DialogContent>
    </Dialog>
  );
}