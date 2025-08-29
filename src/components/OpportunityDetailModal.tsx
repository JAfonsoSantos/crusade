// src/components/OpportunityDetailModal.tsx
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Link as LinkIcon } from "lucide-react";

type FlightMini = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  campaign_id: string | null;
};

type SuggestionRow = {
  opportunity_id: string;
  flight_id: string;
  name_score: number;
  date_score: number;
  advertiser_score: number;
  total_score: number;
  flight_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type Opportunity = {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  stage: string;
  probability: number;
  close_date: string | null;
  advertiser_id: string | null;
  description: string | null;
  next_steps: string | null;
  created_at: string;
  campaign_id: string | null;
  flight_id: string | null;
  pipeline_id: string | null;
};

type Props = {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-PT");
  } catch {
    return d;
  }
}

export default function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Basic edit example
  const [localName, setLocalName] = React.useState(opportunity?.name ?? "");
  const [localNext, setLocalNext] = React.useState(opportunity?.next_steps ?? "");
  React.useEffect(() => {
    setLocalName(opportunity?.name ?? "");
    setLocalNext(opportunity?.next_steps ?? "");
  }, [opportunity?.id]);

  const saveBasics = useMutation({
    mutationFn: async () => {
      if (!opportunity) return;
      const { error } = await supabase
        .from("opportunities")
        .update({ name: localName, next_steps: localNext })
        .eq("id", opportunity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Opportunity updated." });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      onUpdate?.();
    },
    onError: (e: any) => {
      toast({
        title: "Save failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  const oppId = opportunity?.id;

  // --- SUGGESTIONS (type-forced to avoid Supabase generics explosion)
  const { data: suggestions = [], isLoading: sugLoading } = useQuery<SuggestionRow[]>({
    queryKey: ["opp-suggestions", oppId],
    enabled: !!oppId && isOpen,
    queryFn: async () => {
      if (!oppId) return [] as SuggestionRow[];
      // Important: <any> to bypass generated-type overloads for a VIEW
      const { data, error } = await supabase
        .from<any>("v_opportunity_flight_suggestions")
        .select("*")
        .eq("opportunity_id", oppId)
        .order("total_score", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as SuggestionRow[];
    },
  });

  // flight details (explicit generic)
  const flightIds = React.useMemo(
    () =>
      Array.from(new Set((suggestions ?? []).map((s) => s.flight_id))).filter(
        Boolean
      ),
    [suggestions]
  );

  const { data: flights = [], isLoading: flightsLoading } = useQuery<FlightMini[]>({
    queryKey: ["suggestion-flights", flightIds.join(",")],
    enabled: isOpen && flightIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from<FlightMini>("flights")
        .select("id, name, start_date, end_date, campaign_id")
        .in("id", flightIds);
      if (error) throw error;
      return (data ?? []) as FlightMini[];
    },
  });

  const flightsById = React.useMemo(() => {
    const m = new Map<string, FlightMini>();
    flights.forEach((f) => m.set(f.id, f));
    return m;
  }, [flights]);

  const linkFlight = useMutation({
    mutationFn: async (flightId: string) => {
      if (!opportunity) return;
      const f = flightsById.get(flightId);
      const patch: Partial<Opportunity> = { flight_id: flightId };
      if (f?.campaign_id) patch.campaign_id = f.campaign_id;

      const { error } = await supabase
        .from("opportunities")
        .update(patch)
        .eq("id", opportunity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Linked", description: "Flight linked to opportunity." });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      onUpdate?.();
    },
    onError: (e: any) => {
      toast({
        title: "Link failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  function renderSuggestionRow(s: SuggestionRow) {
    const f = flightsById.get(s.flight_id);
    const showName = s.flight_name ?? f?.name ?? s.flight_id;
    const start = s.start_date ?? f?.start_date ?? null;
    const end = s.end_date ?? f?.end_date ?? null;

    return (
      <Card key={`${s.flight_id}-${s.total_score}`} className="mb-2">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-medium truncate">{showName}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(start)} — {formatDate(end)}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">name {Math.round(s.name_score * 100)}%</Badge>
              <Badge variant="outline">date {Math.round(s.date_score * 100)}%</Badge>
              <Badge variant="outline">
                advertiser {Math.round(s.advertiser_score * 100)}%
              </Badge>
              <Badge>{Math.round(s.total_score * 100)}%</Badge>
            </div>
          </div>

          <Button
            size="sm"
            className="shrink-0"
            disabled={linkFlight.isPending}
            onClick={() => linkFlight.mutate(s.flight_id)}
          >
            {linkFlight.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Opportunity</DialogTitle>
          <DialogDescription>
            {opportunity?.name ?? "—"} •{" "}
            <span className="text-muted-foreground">
              {opportunity?.stage ?? "—"}
            </span>
          </DialogDescription>
        </DialogHeader>

        {!opportunity ? (
          <div className="text-sm text-muted-foreground">No opportunity</div>
        ) : (
          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="suggested-flights">Suggested Flights</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Name</div>
                      <Input
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Next steps</div>
                      <Input
                        value={localNext}
                        onChange={(e) => setLocalNext(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveBasics.mutate()}
                        disabled={saveBasics.isPending}
                      >
                        {saveBasics.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={onClose}>
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">Amount</span>
                      <span>
                        {opportunity.amount != null ? opportunity.amount : "—"}{" "}
                        {opportunity.currency ?? ""}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">Probability</span>
                      <span>{opportunity.probability ?? 0}%</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">Close</span>
                      <span>{formatDate(opportunity.close_date)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">Flight</span>
                      <span>{opportunity.flight_id ?? "—"}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">Campaign</span>
                      <span>{opportunity.campaign_id ?? "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="suggested-flights" className="mt-4">
              {sugLoading || flightsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading suggestions…
                </div>
              ) : (suggestions?.length ?? 0) === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No flight suggestions for this opportunity.
                </div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Top {Math.min(20, suggestions.length)} suggestions
                  </div>
                  {suggestions.map(renderSuggestionRow)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="links" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground mr-2">Advertiser</span>
                    <span>{opportunity.advertiser_id ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2">Campaign</span>
                    <span>{opportunity.campaign_id ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2">Flight</span>
                    <span>{opportunity.flight_id ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}