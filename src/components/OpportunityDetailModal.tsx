
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type PipelineStage = { key: string; label: string; color?: string };

type Opportunity = {
  id: string;
  name: string;
  amount: number | null;
  currency: string | null;
  stage: string;
  probability: number;
  close_date: string | null; // DATE in DB
  advertiser_id: string | null;
  description: string | null;
  next_steps: string | null;
  campaign_id: string | null;
  flight_id: string | null;
  pipeline_id: string | null;
  // expanded (optional)
  advertisers?: { name: string } | null;
  campaigns?: { id: string; name: string } | null;
  flights?: { id: string; name: string } | null;
};

type Props = {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

type Option = { id: string; name: string };

const fallbackStages: PipelineStage[] = [
  { key: "needs_analysis", label: "Needs Analysis" },
  { key: "value_proposition", label: "Value Proposition" },
  { key: "proposal", label: "Proposal/Quote" },
  { key: "negotiation", label: "Negotiation/Review" },
  { key: "closed_won", label: "Closed Won" },
  { key: "closed_lost", label: "Closed Lost" },
];

export function OpportunityDetailModal({ opportunity, isOpen, onClose, onUpdate }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [probability, setProbability] = useState<string>("");
  const [closeDate, setCloseDate] = useState<string>("");
  const [stage, setStage] = useState<string>("needs_analysis");
  const [description, setDescription] = useState<string>("");
  const [nextSteps, setNextSteps] = useState<string>("");
  const [advertiserId, setAdvertiserId] = useState<string | "">("");
  const [campaignId, setCampaignId] = useState<string | "">("");
  const [flightId, setFlightId] = useState<string | "">("");

  // Lookup data
  const [stages, setStages] = useState<PipelineStage[]>(fallbackStages);
  const [advertisers, setAdvertisers] = useState<Option[]>([]);
  const [campaigns, setCampaigns] = useState<Option[]>([]);
  const [flights, setFlights] = useState<Option[]>([]);

  // Hydrate when open/opportunity changes
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    // Set base fields
    setName(opportunity.name || "");
    setAmount(opportunity.amount != null ? String(opportunity.amount) : "");
    setProbability(opportunity.probability != null ? String(opportunity.probability) : "0");
    setCloseDate(opportunity.close_date || "");
    setStage(opportunity.stage || "needs_analysis");
    setDescription(opportunity.description || "");
    setNextSteps(opportunity.next_steps || "");
    setAdvertiserId(opportunity.advertiser_id || "");
    setCampaignId(opportunity.campaign_id || "");
    setFlightId(opportunity.flight_id || "");

    // Load auxiliary options (stages, advertisers, campaigns, flights)
    (async () => {
      setLoading(true);
      try {
        // Stages: load from pipeline if available
        if (opportunity.pipeline_id) {
          const { data: pipe, error: pipeErr } = await supabase
            .from("pipelines")
            .select("stages")
            .eq("id", opportunity.pipeline_id)
            .maybeSingle();
          if (!pipeErr && pipe?.stages && Array.isArray(pipe.stages) && pipe.stages.length > 0) {
            // Normalize to PipelineStage[]
            const norm: PipelineStage[] = pipe.stages.map((s: any) => ({
              key: s.key ?? s.id ?? s.value ?? s,
              label: s.label ?? s.name ?? String(s.key ?? s),
              color: s.color,
            }));
            setStages(norm);
          } else {
            setStages(fallbackStages);
          }
        } else {
          setStages(fallbackStages);
        }

        // Advertisers (basic id+name)
        const { data: adv, error: advErr } = await supabase
          .from("advertisers")
          .select("id,name")
          .order("name", { ascending: true });
        if (!advErr && adv) setAdvertisers(adv as Option[]);

        // Campaigns
        const { data: camp, error: campErr } = await supabase
          .from("campaigns")
          .select("id,name")
          .order("created_at", { ascending: false })
          .limit(200);
        if (!campErr && camp) setCampaigns(camp as Option[]);

        // Flights
        const { data: flt, error: fltErr } = await supabase
          .from("flights")
          .select("id,name")
          .order("created_at", { ascending: false })
          .limit(200);
        if (!fltErr && flt) setFlights(flt as Option[]);
      } catch (e: any) {
        console.error("Load modal options failed:", e);
        toast({
          title: "Erro a carregar dados",
          description: e?.message || "Tenta de novo.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, opportunity]);

  const currentStageLabel = useMemo(() => {
    const s = stages.find((x) => x.key === stage);
    return s?.label ?? stage;
  }, [stage, stages]);

  async function handleSave() {
    if (!opportunity) return;
    setSaving(true);
    try {
      const payload: any = {
        name: name?.trim() || null,
        amount: amount ? Number(amount) : null,
        probability: probability ? Number(probability) : 0,
        close_date: closeDate || null, // expect YYYY-MM-DD
        stage,
        description: description?.trim() || null,
        next_steps: nextSteps?.trim() || null,
        advertiser_id: advertiserId || null,
        campaign_id: campaignId || null,
        flight_id: flightId || null,
      };

      const { error } = await supabase
        .from("opportunities")
        .update(payload)
        .eq("id", opportunity.id);

      if (error) throw error;

      toast({
        title: "Opportunity updated",
        description: "As alterações foram guardadas com sucesso.",
      });
      onUpdate();
      onClose();
    } catch (e: any) {
      console.error("Save opportunity failed:", e);
      toast({
        title: "Erro ao guardar",
        description: e?.message || "Não foi possível guardar a oportunidade.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function resetAndClose() {
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Opportunity details</DialogTitle>
        </DialogHeader>

        {!opportunity ? (
          <div className="py-12 text-center text-muted-foreground">No opportunity selected</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Probability %</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Close date</Label>
                  <Input
                    type="date"
                    value={closeDate || ""}
                    onChange={(e) => setCloseDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={description || ""}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about this deal..."
                />
              </div>

              <div className="space-y-2">
                <Label>Next steps</Label>
                <Textarea
                  rows={3}
                  value={nextSteps || ""}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="What should happen next?"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Advertiser</Label>
                    <Select value={advertiserId} onValueChange={setAdvertiserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select advertiser" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— None —</SelectItem>
                        {advertisers.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Campaign</Label>
                    <Select value={campaignId} onValueChange={setCampaignId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— None —</SelectItem>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Flight</Label>
                    <Select value={flightId} onValueChange={setFlightId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select flight" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— None —</SelectItem>
                        {flights.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2">
                    Stage now: <Badge variant="outline">{currentStageLabel}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetAndClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OpportunityDetailModal;
