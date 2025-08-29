// src/components/OpportunityDetailModal.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

// --- Tipos mínimos usados no modal ---
export type OpportunityLite = {
  id: string;
  name: string;
  stage?: string | null;
  amount?: number | null;
  currency?: string | null;
  probability?: number | null;
  close_date?: string | null; // DATE na BD
  advertiser_id?: string | null;
  campaign_id?: string | null;
  flight_id?: string | null;
};

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  flight_name: string;
  campaign_id: string | null;
  campaign_name: string | null;
  name_score: number;
  date_score: number;
  adserver_score: number;
  total_score: number;
  start_date: string | null;
  end_date: string | null;
};

type FlightPick = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  campaign_id: string | null;
};

type Props = {
  opportunity: OpportunityLite | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => Promise<void> | void;
};

function formatCurrency(value?: number | null, currency = "EUR") {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return String(value);
  }
}

export default function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();

  // Sugestões
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Pesquisa manual
  const [flightQuery, setFlightQuery] = useState("");
  const [flightResults, setFlightResults] = useState<FlightPick[]>([]);
  const [searchingFlights, setSearchingFlights] = useState(false);

  // Ligação
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  // Recarregar dados quando abrir
  useEffect(() => {
    if (!isOpen || !opportunity?.id) return;

    // carregar sugestões
    (async () => {
      setLoadingSuggestions(true);
      const { data, error } = await supabase
        .from("v_opportunity_flight_suggestions")
        .select("*")
        .eq("opportunity_id", opportunity.id)
        .order("total_score", { ascending: false })
        .limit(10);

      if (error) {
        toast({
          title: "Erro ao carregar sugestões",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSuggestions((data || []) as SuggestionRow[]);
      }
      setLoadingSuggestions(false);
    })();

    // limpar pesquisa
    setFlightQuery("");
    setFlightResults([]);
  }, [isOpen, opportunity?.id]);

  // Pesquisa manual de flights
  async function searchFlights(q: string) {
    setFlightQuery(q);
    if (!q || q.trim().length < 2) {
      setFlightResults([]);
      return;
    }
    setSearchingFlights(true);

    const { data, error } = await supabase
      .from("flights")
      .select("id,name,start_date,end_date,campaign_id")
      .ilike("name", `%${q}%`)
      .order("start_date", { ascending: false })
      .limit(20);

    if (error) {
      toast({
        title: "Erro na pesquisa",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setFlightResults((data || []) as FlightPick[]);
    }
    setSearchingFlights(false);
  }

  // Ligar oportunidade ⇄ flight
  async function linkFlight(flightId: string) {
    if (!opportunity?.id) return;
    setLinking(true);
    const { error } = await supabase.rpc("upsert_opportunity_flight_link", {
      p_opportunity_id: opportunity.id,
      p_flight_id: flightId,
    });
    setLinking(false);

    if (error) {
      toast({
        title: "Erro ao ligar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ligação criada",
      description: "Flight associado à oportunidade.",
    });

    await onUpdate?.();
  }

  // Desligar
  async function unlinkFlight() {
    if (!opportunity?.id) return;
    setUnlinking(true);
    const { error } = await supabase.rpc("unlink_opportunity_flight", {
      p_opportunity_id: opportunity.id,
    });
    setUnlinking(false);

    if (error) {
      toast({
        title: "Erro ao remover ligação",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Ligação removida" });
    await onUpdate?.();
  }

  const headerBadges = useMemo(() => {
    if (!opportunity) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {opportunity.stage && <Badge variant="outline">{opportunity.stage}</Badge>}
        {typeof opportunity.probability === "number" && (
          <Badge variant="outline">{opportunity.probability}%</Badge>
        )}
        {opportunity.close_date && (
          <Badge variant="secondary">
            Fecha: {new Date(opportunity.close_date).toLocaleDateString("pt-PT")}
          </Badge>
        )}
      </div>
    );
  }, [opportunity]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {opportunity?.name ?? "Opportunity"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Valor: {formatCurrency(opportunity?.amount)}
              </div>
              {headerBadges}
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          {/* Ligação atual */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Ligação atual</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  Campaign:{" "}
                  {opportunity?.campaign_id ? (
                    <Badge variant="outline">{opportunity.campaign_id}</Badge>
                  ) : (
                    "—"
                  )}
                </div>
                <div>
                  Flight:{" "}
                  {opportunity?.flight_id ? (
                    <Badge variant="outline">{opportunity.flight_id}</Badge>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={unlinkFlight}
                  disabled={!opportunity?.flight_id || unlinking}
                >
                  {unlinking ? "A remover…" : "Remover ligação"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sugestões */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Sugestões de Flights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingSuggestions && (
                <div className="text-sm text-muted-foreground">
                  A carregar…
                </div>
              )}

              {!loadingSuggestions && suggestions.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Sem sugestões para já.
                </div>
              )}

              {suggestions.map((s) => (
                <div
                  key={`${s.opportunity_id}-${s.flight_id}`}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{s.flight_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.campaign_name ? `Campanha: ${s.campaign_name} • ` : ""}
                      Score: {Math.round(s.total_score)}
                      {s.start_date
                        ? ` • ${new Date(s.start_date).toLocaleDateString(
                            "pt-PT"
                          )} - ${
                            s.end_date
                              ? new Date(s.end_date).toLocaleDateString("pt-PT")
                              : "—"
                          }`
                        : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => linkFlight(s.flight_id)}
                    disabled={linking}
                  >
                    {linking ? "A ligar…" : "Link"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pesquisa manual */}
          <Card>
            <CardHeader>
              <CardTitle>Pesquisar Flights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Nome do flight…"
                  value={flightQuery}
                  onChange={(e) => searchFlights(e.target.value)}
                />
              </div>

              {searchingFlights && (
                <div className="text-sm text-muted-foreground">A pesquisar…</div>
              )}

              {!searchingFlights &&
                flightResults.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.start_date
                          ? `${new Date(f.start_date).toLocaleDateString(
                              "pt-PT"
                            )} - ${
                              f.end_date
                                ? new Date(f.end_date).toLocaleDateString(
                                    "pt-PT"
                                  )
                                : "—"
                            }`
                          : "Sem datas"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => linkFlight(f.id)}
                      disabled={linking}
                    >
                      {linking ? "A ligar…" : "Link"}
                    </Button>
                  </div>
                ))}

              {!searchingFlights && flightQuery && flightResults.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Sem resultados.
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollArea>

        <div className="px-6 pb-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}