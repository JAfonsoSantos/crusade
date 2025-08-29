
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Opportunity = {
  id: string;
  name: string;
  amount: number | null;
  currency: string | null;
  stage: string;
  probability: number;
  close_date: string | null; // YYYY-MM-DD
  advertiser_id: string | null;
  campaign_id: string | null;
  flight_id: string | null;
  pipeline_id: string | null;
  description: string | null;
};

type Option = { id: string; name: string };

type Props = {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

// Stages used on the Pipeline page
const STAGE_OPTIONS: { key: string; label: string }[] = [
  { key: "needs_analysis", label: "Needs Analysis" },
  { key: "value_proposition", label: "Value Proposition" },
  { key: "proposal", label: "Proposal/Quote" },
  { key: "negotiation", label: "Negotiation/Review" },
  { key: "closed_won", label: "Closed Won" },
  { key: "closed_lost", label: "Closed Lost" },
];

export function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  // Local editable state (seeded from props.opportunity)
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [probability, setProbability] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [closeDate, setCloseDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [advertiserId, setAdvertiserId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [flightId, setFlightId] = useState<string | null>(null);

  // Select options
  const [advertisers, setAdvertisers] = useState<Option[]>([]);
  const [campaigns, setCampaigns] = useState<Option[]>([]);
  const [flights, setFlights] = useState<Option[]>([]);

  // Seed state whenever a new opportunity is opened
  useEffect(() => {
    if (!opportunity) return;
    setName(opportunity.name || "");
    setAmount(opportunity.amount != null ? String(opportunity.amount) : "");
    setProbability(
      opportunity.probability != null ? String(opportunity.probability) : ""
    );
    setStage(opportunity.stage || "");
    setCloseDate(opportunity.close_date || "");
    setDescription(opportunity.description || "");

    setAdvertiserId(opportunity.advertiser_id);
    setCampaignId(opportunity.campaign_id);
    setFlightId(opportunity.flight_id);
  }, [opportunity]);

  // Load options when opened
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [advRes, campRes, flightRes] = await Promise.all([
        supabase.from("advertisers").select("id,name").order("name", { ascending: true }),
        supabase.from("campaigns").select("id,name").order("name", { ascending: true }),
        supabase.from("flights").select("id,name").order("name", { ascending: true }),
      ]);

      setAdvertisers((advRes.data || []).filter((r) => !!r.id && !!r.name));
      setCampaigns((campRes.data || []).filter((r) => !!r.id && !!r.name));
      setFlights((flightRes.data || []).filter((r) => !!r.id && !!r.name));
    })();
  }, [isOpen]);

  const handleSave = async () => {
    if (!opportunity) return;
    try {
      setLoading(true);

      const payload = {
        name,
        stage: stage || null,
        amount: amount === "" ? null : Number(amount),
        probability: probability === "" ? null : Number(probability),
        close_date: closeDate || null,
        description: description || null,
        advertiser_id: advertiserId,
        campaign_id: campaignId,
        flight_id: flightId,
      };

      const { error } = await supabase
        .from("opportunities")
        .update(payload)
        .eq("id", opportunity.id);

      if (error) throw error;

      toast({
        title: "Opportunity updated",
        description: "Changes saved successfully.",
      });
      onUpdate();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Update failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Utilities for Select values: Radix Select requires non-empty Item values.
  // We use "__none" as a sentinel to "clear" the association (sets field to null).
  const toSelectValue = (val: string | null | undefined) => (val ?? "");
  const fromSelectChange = (val: string): string | null =>
    val === "__none" || val === "" ? null : val;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Opportunity details</DialogTitle>
        </DialogHeader>

        {!opportunity ? (
          <div className="py-6">No opportunity selected.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={toSelectValue(stage)} onValueChange={(v) => setStage(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {/* Disabled placeholder with NON-empty value */}
                  <SelectItem value="__placeholder" disabled>
                    Select stage
                  </SelectItem>
                  {STAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Close date</Label>
              <Input
                type="date"
                value={closeDate || ""}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description || ""}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Advertiser</Label>
              <Select
                value={toSelectValue(advertiserId)}
                onValueChange={(v) => setAdvertiserId(fromSelectChange(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No advertiser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__placeholder" disabled>
                    Choose advertiser
                  </SelectItem>
                  <SelectItem value="__none">— None —</SelectItem>
                  {advertisers
                    .filter((a) => !!a.id)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select
                value={toSelectValue(campaignId)}
                onValueChange={(v) => setCampaignId(fromSelectChange(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__placeholder" disabled>
                    Choose campaign
                  </SelectItem>
                  <SelectItem value="__none">— None —</SelectItem>
                  {campaigns
                    .filter((c) => !!c.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Flight</Label>
              <Select
                value={toSelectValue(flightId)}
                onValueChange={(v) => setFlightId(fromSelectChange(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No flight" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__placeholder" disabled>
                    Choose flight
                  </SelectItem>
                  <SelectItem value="__none">— None —</SelectItem>
                  {flights
                    .filter((f) => !!f.id)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !opportunity}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OpportunityDetailModal;
