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
import { useToast } from "@/hooks/use-toast";
import { Search, Link as LinkIcon, Unlink, Pencil, Save, X } from "lucide-react";

// ---------- types ----------
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
  onUpdate?: () => void; // chamado depois de guardar/ligar/desligar/fechar
};

// ---------- consts ----------
const STAGE_OPTIONS = [
  { value: "needs_analysis", label: "Needs analysis" },
  { value: "value_proposition", label: "Value proposition" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed won" },
  { value: "closed_lost", label: "Closed lost" },
];

// helper simples para num safe
function toNumberOrNull(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- component ----------
export default function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();
  const oppId = opportunity?.id;

  // --------- Inline edit state (badges) ----------
  const original = useRef<Opportunity | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formProb, setFormProb] = useState<string>("");
  const [formStage, setFormStage] = useState<string>(STAGE_OPTIONS[0].value);

  // re-hydrate form when opp changes/open
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    original.current = opportunity;
    setFormName(opportunity.name ?? "");
    setFormAmount(opportunity.amount != null ? String(opportunity.amount) : "");
    setFormProb(String(opportunity.probability ?? 0));
    setFormStage(opportunity.stage || STAGE_OPTIONS[0].value);
    setEditMode(false);
  }, [isOpen, opportunity]);

  // ENTER para guardar, ESC para fechar
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && editMode) {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        // fecha sempre; refresh pipeline ao fechar
        onClose();
        onUpdate?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasDiff = useMemo(() => {
    if (!original.current) return false;
    const a = original.current;
    const amount = toNumberOrNull(formAmount);
    const prob = Math.max(0, Math.min(100, Number(formProb || 0) || 0));
    return (
      a.name !== formName ||
      (a.amount ?? null) !== (amount ?? null) ||
      (a.probability ?? 0) !== prob ||
      (a.stage || "") !== (formStage || "")
    );
  }, [formName, formAmount, formProb, formStage]);

  async function handleSave() {
    if (!oppId || !original.current) return;
    if (!hasDiff) {
      setEditMode(false);
      return;
    }
    setSaving(true);
    const before = original.current;

    const payload: Partial<Opportunity> = {
      name: formName.trim() || before.name,
      amount: toNumberOrNull(formAmount),
      probability: Math.max(0, Math.min(100, Number(formProb || 0) || 0)),
      stage: formStage || before.stage || STAGE_OPTIONS[0].value,
    };

    const { error } = await supabase.from("opportunities").update(payload).eq("id", oppId);
    setSaving(false);

    if (error) {
      toast({
        title: "Falha ao guardar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // diff bonitinho
    const diffs: string[] = [];
    if (before.name !== payload.name) diffs.push(`name: “${before.name}” → “${payload.name}”`);
    if ((before.amount ?? null) !== (payload.amount ?? null))
      diffs.push(`amount: ${before.amount ?? "—"} → ${payload.amount ?? "—"}`);
    if ((before.probability ?? 0) !== (payload.probability ?? 0))
      diffs.push(`probability: ${before.probability}% → ${payload.probability}%`);
    if ((before.stage || "") !== (payload.stage || ""))
      diffs.push(`stage: ${before.stage} → ${payload.stage}`);

    toast({
      title: "Opportunity atualizada",
      description: diffs.length ? diffs.join(" • ") : "Sem alterações",
    });

    setEditMode(false);
    onUpdate?.(); // auto-refresh pipeline / lista
  }

  // --------- Flights: search & link/unlink ----------
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

  const linkFlight = async (flightId: string) => {
    if (!oppId) return;
    const { error } = await supabase.from("opportunities").update({ flight_id: flightId }).eq("id", oppId);
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
    if (!oppId) return;
    const { error } = await supabase.from("opportunities").update({ flight_id: null }).eq("id", oppId);
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

  // --------- Company tab ----------
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
          setAdvertiser(a || null);

          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select("id, name")
            .eq("advertiser_id", opportunity.advertiser_id);
          if (bErr) throw bErr;
          setBrands((b || []).map((it) => ({ id: it.id, name: it.name })));
        } else {
          setAdvertiser(null);
          setBrands([]);
        }
      } catch (e: any) {
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

  // header badges / inline edit
  const headerBadges = useMemo(() => {
    if (!opportunity) return null;

    if (!editMode) {
      return (
        <div className="flex gap-2 flex-wrap mt-2">
          <Badge variant="outline" className="cursor-pointer" onClick={() => setEditMode(true)} title="Edit stage">
            {opportunity.stage}
          </Badge>
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setEditMode(true)} title="Edit probability">
            {opportunity.probability ?? 0}% prob.
          </Badge>
          {typeof opportunity.amount === "number" ? (
            <Badge variant="outline" className="cursor-pointer" onClick={() => setEditMode(true)} title="Edit amount">
              {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(opportunity.amount)}
            </Badge>
          ) : (
            <Badge variant="outline" className="cursor-pointer" onClick={() => setEditMode(true)} title="Edit amount">
              Amount: —
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => setEditMode(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      );
    }

    // EDIT MODE – inputs inline
    return (
      <div className="flex flex-col md:flex-row md:items-center gap-3 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">Stage</span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={formStage || STAGE_OPTIONS[0].value}
            onChange={(e) => setFormStage(e.target.value)}
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">Prob.</span>
          <Input
            className="h-8 w-20"
            type="number"
            min={0}
            max={100}
            step={1}
            value={formProb}
            onChange={(e) => setFormProb(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">Amount</span>
          <Input
            className="h-8 w-36"
            type="number"
            step="0.01"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="€"
          />
        </div>

        <div className="ml-auto flex gap-2">
          <Button size="sm" className="gap-2" disabled={saving || !hasDiff} onClick={handleSave} title="Enter também guarda">
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={saving}
            onClick={() => {
              // revert
              if (original.current) {
                setFormName(original.current.name ?? "");
                setFormAmount(original.current.amount != null ? String(original.current.amount) : "");
                setFormProb(String(original.current.probability ?? 0));
                setFormStage(original.current.stage || STAGE_OPTIONS[0].value);
              }
              setEditMode(false);
            }}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }, [opportunity, editMode, formAmount, formProb, formStage, saving, hasDiff]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          onUpdate?.(); // auto-refresh ao fechar
        }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-2">
            {/* Nome pode ser editável quando em modo de edição */}
            {!editMode ? (
              <span>{formName || opportunity?.name || "Opportunity"}</span>
            ) : (
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            )}
          </DialogTitle>
          {headerBadges}
        </DialogHeader>

        <Tabs defaultValue="search" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full max-w-[420px]">
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
                  <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                    {searchResults.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Campaign: {f.campaign_name || "—"} • {f.start_date || "—"} → {f.end_date || "—"}
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
                    <div className="text-sm text-muted-foreground">No brands associated with this advertiser.</div>
                  ) : (
                    <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
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