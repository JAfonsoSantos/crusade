import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

type Opportunity = {
  id: string;
  name: string;
  amount: number | null;
  currency: string | null;
  stage: string;
  probability: number;
  close_date: string | null;
  advertiser_id: string | null;
  campaign_id: string | null;
  flight_id: string | null;
  pipeline_id: string | null;
  crm_external_id?: string | null;
  crm_integration_id?: string | null;
  advertisers?: { id: string; name: string } | null;
  campaigns?: { id: string; name: string } | null;
  flights?: { id: string; name: string } | null;
  pipelines?: { id: string; name: string; stages: any[] } | null;
};

type Props = {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

export function OpportunityDetailModal({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const oppId = opportunity?.id;

  // ------------ Lists ------------
  const { data: advertisers = [] } = useQuery({
    queryKey: ["modal-advertisers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: isOpen,
  });

  const [advId, setAdvId] = React.useState<string | null>(
    opportunity?.advertiser_id ?? null
  );
  const [brandId, setBrandId] = React.useState<string | null>(null);
  const [campaignId, setCampaignId] = React.useState<string | null>(
    opportunity?.campaign_id ?? null
  );
  const [flightId, setFlightId] = React.useState<string | null>(
    opportunity?.flight_id ?? null
  );
  const [stage, setStage] = React.useState<string>(opportunity?.stage ?? "");

  React.useEffect(() => {
    setAdvId(opportunity?.advertiser_id ?? null);
    setCampaignId(opportunity?.campaign_id ?? null);
    setFlightId(opportunity?.flight_id ?? null);
    setStage(opportunity?.stage ?? "");
    setBrandId(null);
  }, [opportunity?.id]);

  const { data: pipeline } = useQuery({
    queryKey: ["modal-pipeline", opportunity?.pipeline_id],
    queryFn: async () => {
      if (!opportunity?.pipeline_id) return null;
      const { data, error } = await supabase
        .from("pipelines")
        .select("id, name, stages")
        .eq("id", opportunity.pipeline_id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; stages: any[] } | null;
    },
    enabled: isOpen && !!opportunity?.pipeline_id,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["modal-brands", advId],
    queryFn: async () => {
      if (!advId) return [];
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, advertiser_id")
        .eq("advertiser_id", advId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; advertiser_id: string }[];
    },
    enabled: isOpen && !!advId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["modal-campaigns", advId, brandId],
    queryFn: async () => {
      if (!advId) return [];
      const query = supabase
        .from("campaigns")
        .select("id, name, advertiser_id, brand_id")
        .order("name");
      if (brandId) query.eq("brand_id", brandId);
      else query.eq("advertiser_id", advId);
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: isOpen && !!advId,
  });

  const { data: flights = [] } = useQuery({
    queryKey: ["modal-flights", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("flights")
        .select("id, name, campaign_id, start_date, end_date")
        .eq("campaign_id", campaignId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: isOpen && !!campaignId,
  });

  // limpar descendentes
  React.useEffect(() => {
    setBrandId(null);
    setCampaignId(null);
    setFlightId(null);
  }, [advId]);

  React.useEffect(() => {
    setCampaignId(null);
    setFlightId(null);
  }, [brandId]);

  React.useEffect(() => {
    setFlightId(null);
  }, [campaignId]);

  // ------------ UPDATE opportunity ------------
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!oppId) return;
      const payload: Record<string, any> = {
        advertiser_id: advId,
        campaign_id: campaignId,
        flight_id: flightId,
      };
      // se tiveres brand_id na tabela, manter
      if (brandId) payload["brand_id"] = brandId;
      if (stage && stage !== opportunity?.stage) payload.stage = stage;

      const { error } = await supabase
        .from("opportunities")
        .update(payload)
        .eq("id", oppId);

      if (error) throw error;
    },
    onSuccess: async () => {
      // refresca queries relevantes
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["opportunities"] }),
        qc.invalidateQueries({ queryKey: ["modal-campaigns"] }),
        qc.invalidateQueries({ queryKey: ["modal-flights"] }),
      ]);
      toast({ title: "Saved", description: "Opportunity updated." });
      onUpdate?.();
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message ?? "Failed to update opportunity.",
        variant: "destructive",
      });
    },
  });

  // ------------ QUICK CREATE: Campaign ------------
  const [creatingCamp, setCreatingCamp] = React.useState(false);
  const [campName, setCampName] = React.useState("");

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!advId) throw new Error("Choose an advertiser first.");
      if (!campName.trim()) throw new Error("Campaign name is required.");
      const insert: any = { name: campName.trim(), advertiser_id: advId };
      if (brandId) insert.brand_id = brandId;
      const { data, error } = await supabase
        .from("campaigns")
        .insert(insert)
        .select("id, name")
        .single();
      if (error) throw error;
      return data as { id: string; name: string };
    },
    onSuccess: async (data) => {
      setCreatingCamp(false);
      setCampName("");
      setCampaignId(data.id);
      await qc.invalidateQueries({ queryKey: ["modal-campaigns"] });
      toast({ title: "Campaign created" });
    },
    onError: (err: any) => {
      toast({
        title: "Error creating campaign",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  // ------------ QUICK CREATE: Flight ------------
  const [creatingFlight, setCreatingFlight] = React.useState(false);
  const [flightName, setFlightName] = React.useState("");
  const [flightStart, setFlightStart] = React.useState<string>("");
  const [flightEnd, setFlightEnd] = React.useState<string>("");

  const createFlight = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Choose a campaign first.");
      if (!flightName.trim()) throw new Error("Flight name is required.");
      if (!flightStart || !flightEnd)
        throw new Error("Start and end dates are required.");

      const insert = {
        name: flightName.trim(),
        campaign_id: campaignId,
        start_date: flightStart,
        end_date: flightEnd,
      };
      const { data, error } = await supabase
        .from("flights")
        .insert(insert)
        .select("id, name")
        .single();
      if (error) throw error;
      return data as { id: string; name: string };
    },
    onSuccess: async (data) => {
      setCreatingFlight(false);
      setFlightName("");
      setFlightStart("");
      setFlightEnd("");
      setFlightId(data.id);
      await qc.invalidateQueries({ queryKey: ["modal-flights"] });
      toast({ title: "Flight created" });
    },
    onError: (err: any) => {
      toast({
        title: "Error creating flight",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {opportunity?.name ?? "Opportunity"}
            {opportunity?.pipelines?.name ? (
              <span className="ml-2 text-sm text-muted-foreground">
                • {opportunity.pipelines.name}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {!opportunity ? (
          <div className="py-10 text-center text-muted-foreground">
            No opportunity selected
          </div>
        ) : (
          <Tabs defaultValue="overview" className="mt-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="edit">Edit / Link</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <div className="text-lg font-medium">
                    {opportunity.amount != null
                      ? new Intl.NumberFormat("pt-PT", {
                          style: "currency",
                          currency: opportunity.currency || "EUR",
                        }).format(opportunity.amount)
                      : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <Label className="text-xs text-muted-foreground">
                    Probability
                  </Label>
                  <div>
                    <Badge variant="outline">{opportunity.probability}%</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Stage</Label>
                  <div className="font-medium">{opportunity.stage}</div>
                </div>
                <div className="text-right">
                  <Label className="text-xs text-muted-foreground">
                    Close Date
                  </Label>
                  <div>
                    {opportunity.close_date
                      ? new Date(opportunity.close_date).toLocaleDateString("pt-PT")
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Advertiser
                  </Label>
                  <div className="font-medium">
                    {opportunity.advertisers?.name ?? "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Campaign / Flight
                  </Label>
                  <div className="font-medium">
                    {opportunity.campaigns?.name ?? "—"}
                    {opportunity.flights?.name
                      ? ` • ${opportunity.flights.name}`
                      : ""}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">CRM ID</Label>
                  <Input
                    value={opportunity.crm_external_id ?? ""}
                    readOnly
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Integration
                  </Label>
                  <Input
                    value={opportunity.crm_integration_id ?? ""}
                    readOnly
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            {/* EDIT / LINK */}
            <TabsContent value="edit" className="pt-4 space-y-4">
              {/* Stage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Stage</Label>
                  <Select value={stage} onValueChange={(v) => setStage(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {(pipeline?.stages ?? []).map((s: any) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label ?? s.key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advertiser / Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Advertiser</Label>
                  <Select
                    value={advId ?? undefined}
                    onValueChange={(v) => setAdvId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose advertiser" />
                    </SelectTrigger>
                    <SelectContent>
                      {advertisers.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="mb-1 block">Brand (optional)</Label>
                  </div>
                  <Select
                    value={brandId ?? undefined}
                    onValueChange={(v) => setBrandId(v)}
                    disabled={!advId || brands.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={brands.length ? "Choose brand" : "—"} />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campaign + Quick Create */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="mb-1 block">Campaign</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!advId}
                      onClick={() => setCreatingCamp((v) => !v)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      New
                    </Button>
                  </div>
                  <Select
                    value={campaignId ?? undefined}
                    onValueChange={(v) => setCampaignId(v)}
                    disabled={!advId || campaigns.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={campaigns.length ? "Choose campaign" : "—"} />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {creatingCamp && (
                    <div className="mt-3 rounded-lg border p-3 space-y-2">
                      <Label className="text-sm">New campaign name</Label>
                      <Input
                        placeholder="e.g. Q4 Always On"
                        value={campName}
                        onChange={(e) => setCampName(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setCreatingCamp(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => createCampaign.mutate()}
                          disabled={!advId || !campName.trim()}
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Flight + Quick Create */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="mb-1 block">Flight</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!campaignId}
                      onClick={() => setCreatingFlight((v) => !v)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      New
                    </Button>
                  </div>
                  <Select
                    value={flightId ?? undefined}
                    onValueChange={(v) => setFlightId(v)}
                    disabled={!campaignId || flights.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={flights.length ? "Choose flight" : "—"} />
                    </SelectTrigger>
                    <SelectContent>
                      {flights.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {creatingFlight && (
                    <div className="mt-3 rounded-lg border p-3 space-y-2">
                      <Label className="text-sm">New flight</Label>
                      <Input
                        placeholder="Flight name"
                        value={flightName}
                        onChange={(e) => setFlightName(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Start date
                          </Label>
                          <Input
                            type="date"
                            value={flightStart}
                            onChange={(e) => setFlightStart(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            End date
                          </Label>
                          <Input
                            type="date"
                            value={flightEnd}
                            onChange={(e) => setFlightEnd(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setCreatingFlight(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => createFlight.mutate()}
                          disabled={
                            !campaignId || !flightName.trim() || !flightStart || !flightEnd
                          }
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={() => updateMutation.mutate()} disabled={!oppId}>
                  Save
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}