// src/components/OpportunityDetailModal.tsx
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Opportunity = {
  id: string;
  name: string;
  amount: number | null;
  currency?: string | null;
  stage: string;
  probability: number;
  close_date: string | null; // DATE (YYYY-MM-DD) na tua base
  advertiser_id: string | null;
  campaign_id: string | null;
  flight_id: string | null;
  pipeline_id: string | null;
  description?: string | null;
  next_steps?: string | null;
  created_at: string;
};

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  flight_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;   // YYYY-MM-DD
  name_score: number;
  date_score: number;
  area_score: number;
  total_score: number;
};

type Props = {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void; // callback para refrescar a lista depois de alguma ação
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    // d é YYYY-MM-DD; criar como UTC para não shiftar
    const parts = d.split("-");
    const dt = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
    return dt.toLocaleDateString("pt-PT");
  } catch {
    return d;
  }
}

function fmtMoney(n?: number | null, currency = "EUR") {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(
      n
    );
  } catch {
    return String(n);
  }
}

export default function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<SuggestionRow[]>([]);
  const oppId = opportunity?.id ?? null;

  React.useEffect(() => {
    let aborted = false;
    async function load() {
      if (!oppId) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        // ⚠️ view fora do tipo gerado → forçar o nome:
        const { data, error } = await supabase
          .from("v_opportunity_flight_suggestions" as any)
          .select("*")
          .eq("opportunity_id", oppId)
          .order("total_score", { ascending: false })
          .limit(20);

        if (error) throw error;
        if (!aborted) {
          setSuggestions((data ?? []) as unknown as SuggestionRow[]);
        }
      } catch (e) {
        console.error("load suggestions error:", e);
        if (!aborted) setSuggestions([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [oppId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Opportunity</DialogTitle>
          <DialogDescription>
            {opportunity ? opportunity.name : "—"}
          </DialogDescription>
        </DialogHeader>

        {!opportunity ? (
          <div className="text-sm text-muted-foreground">No data</div>
        ) : (
          <div className="space-y-6">
            {/* Overview */}
            <Card>
              <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="font-medium">
                    {fmtMoney(opportunity.amount, opportunity.currency || "EUR")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Probability</div>
                  <div className="font-medium">{opportunity.probability ?? 0}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Close Date</div>
                  <div className="font-medium">
                    {fmtDate(opportunity.close_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Stage</div>
                  <Badge variant="outline">{opportunity.stage}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Suggested Flights</h3>
                <div className="text-xs text-muted-foreground">
                  {loading ? "Loading…" : `${suggestions.length} suggestions`}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-0 bg-muted/40 px-3 py-2 text-xs font-medium">
                  <div className="col-span-3">Flight</div>
                  <div className="col-span-3">Campaign</div>
                  <div className="col-span-2">Dates</div>
                  <div className="col-span-1 text-right">Name</div>
                  <div className="col-span-1 text-right">Date</div>
                  <div className="col-span-1 text-right">Area</div>
                  <div className="col-span-1 text-right">Total</div>
                </div>

                {(!suggestions || suggestions.length === 0) && !loading ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No suggestions for this opportunity.
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-auto divide-y">
                    {suggestions.map((s) => (
                      <div
                        key={`${s.opportunity_id}-${s.flight_id}`}
                        className="grid grid-cols-12 gap-0 px-3 py-2 text-sm"
                      >
                        <div className="col-span-3 truncate">
                          {s.flight_name ?? "—"}
                        </div>
                        <div className="col-span-3 truncate">
                          {s.campaign_name ?? "—"}
                        </div>
                        <div className="col-span-2">
                          <div className="truncate">
                            {fmtDate(s.start_date)} — {fmtDate(s.end_date)}
                          </div>
                        </div>
                        <div className="col-span-1 text-right tabular-nums">
                          {Math.round(s.name_score)}
                        </div>
                        <div className="col-span-1 text-right tabular-nums">
                          {Math.round(s.date_score)}
                        </div>
                        <div className="col-span-1 text-right tabular-nums">
                          {Math.round(s.area_score)}
                        </div>
                        <div className="col-span-1 text-right font-medium tabular-nums">
                          {Math.round(s.total_score)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {onUpdate && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onUpdate();
                  }}
                >
                  Refresh
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}