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
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Link as LinkIcon,
  Unlink,
  Maximize2,
  Minimize2,
  Pencil,
  Save,
  X,
} from "lucide-react";

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

  // --- Header actions state ---
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftAmount, setDraftAmount] = useState<string>("");

  useEffect(() => {
    // reset drafts whenever abrimos noutro deal
    if (isOpen && opportunity) {
      setEditing(false);
      setDraftName(opportunity.name ?? "");
      setDraftAmount(
        opportunity.amount != null ? String(opportunity.amount) : ""
      );
    }
  }, [isOpen, opportunity]);

  const saveEdits = async () => {
    if (!opportunity?.id) return;
    const payload: Partial<Opportunity> = {
      name: draftName.trim() || opportunity.name,
    };
    if (draftAmount.trim() === "") {
      payload.amount = null;
    } else {
      const n = Number(draftAmount);
      if (Number.isNaN(n)) {
        toast({
          title: "Amount inválido",
          description: "Insere um número ou deixa vazio.",
          variant: "destructive",
        });
        return;
      }
      payload.amount = n;
    }

    const { error } = await supabase
      .from("opportunities")
      .update(payload)
      .eq("id", opportunity.id);

    if (error) {
      toast({
        title: "Falha ao guardar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Alterações guardadas" });
    setEditing(false);
    onUpdate?.();
  };

  // ---- Manual search (flights) ----
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FlightRow[]>([]);

  // ---- Company tab state ----
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null);
  const [brands, setBrands] = useState<BrandInfo[]>([]);

  // Load company data when modal opens
  useEffect(() => {
    const loadCompany = async () => {
      if (!isOpen || !opportunity) return;
      setLoadingCompany(true);

      try {
        // Load advertiser
        if (opportunity.advertiser_id) {
          const { data: a, error: aErr } = await supabase
            .from("advertisers")
            .select("id, name")
            .eq("id", opportunity.advertiser_id)
            .maybeSingle();

          if (aErr) throw aErr;
          setAdvertiser(a);

          // Load brands for this advertiser
          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);

          if (bErr) throw bErr;
          setBrands((b || []).map((brand) => ({ id: brand.id, name: brand.name })));
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

  // Link / unlink
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

  // classes para expand
  const contentClasses =
    "transition-all " +
    (expanded ? "max-w-[96vw] w-[96vw] h-[90vh]" : "max-w-4xl") +
    " overflow-hidden";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={contentClasses}>
        <DialogHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <DialogTitle>{opportunity?.name ?? "Opportunity"}</DialogTitle>
            {headerBadges}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEditing(false);
                    setDraftName(opportunity?.name ?? "");
                    setDraftAmount(
                      opportunity?.amount != null ? String(opportunity.amount) : ""
                    );
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" className="gap-2" onClick={saveEdits}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setExpanded((v) => !v)}
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
          </div>
        </DialogHeader>

        {/* Inline edit bar (simple) */}
        {editing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Amount (EUR)</div>
              <Input
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                placeholder="ex: 25000"
                inputMode="decimal"
              />
            </div>
          </div>
        )}

        <div className={"mt-4 " + (expanded ? "h-[calc(90vh-180px)] overflow-auto pr-1" : "")}>
          <Tabs defaultValue="search">
            <TabsList className="grid grid-cols-3 w-full max-w-[400px]">
              <TabsTrigger value="search">Search Flights</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
            </TabsList>

            {/* Search */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}