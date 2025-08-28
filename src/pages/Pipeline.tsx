// src/pages/Pipeline.tsx
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { OpportunityDetailModal } from "@/components/OpportunityDetailModal";
import { PipelineSelector } from "@/components/PipelineSelector";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ---------------- Types (iguais aos teus + snapshot opcional) ---------------- */

type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  stages: any[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
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
  advertisers?: {
    name: string;
  };
  campaigns?: {
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date: string;
  };
  flights?: {
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date: string;
  };
  pipelines?: {
    name: string;
    stages: any[];
  };
};

type SnapshotRow = {
  advertiser_id: string;
  advertiser_name: string;
  industry?: string | null;
  website?: string | null;
  crm_name?: string | null;
  crm_opportunities_open?: number | null;
  crm_opportunities_won?: number | null;
  crm_opportunities_total?: number | null;
  crm_account_external_id?: string | null;
  ad_server_advertiser_external_id?: string | null;
  ad_server_name?: string | null;
};

/* ---------------- Small helpers ---------------- */

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amount ?? 0);

/** tenta ler a view v_advertiser_pipeline; se falhar, faz fallback a advertisers básicos */
async function fetchAdvertiserSnapshot(): Promise<SnapshotRow[]> {
  // 1) tentar a view (cast para any para não bater no type-literal do client)
  const tryView = await supabase
    .from<any>("v_advertiser_pipeline" as any)
    .select(
      [
        "advertiser_id",
        "advertiser_name",
        "industry",
        "website",
        "crm_name",
        "crm_opportunities_open",
        "crm_opportunities_won",
        "crm_opportunities_total",
        "crm_account_external_id",
        "ad_server_advertiser_external_id",
        "ad_server_name",
      ].join(","),
    );

  if (tryView.error) {
    // fallback seguro
    // pega advertisers e devolve snapshot mínimo
    const base = await supabase.from("advertisers").select("id, name");
    if (base.error) throw base.error;
    return (base.data || []).map((a: any) => ({
      advertiser_id: a.id,
      advertiser_name: a.name,
      crm_opportunities_open: 0,
      crm_opportunities_won: 0,
      crm_opportunities_total: 0,
    }));
  }

  return (tryView.data || []) as SnapshotRow[];
}

/* ---------------- Component ---------------- */

export default function Pipeline() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSnapshot, setShowSnapshot] = useState<boolean>(true); // <-- toggle CRM Snapshot
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const blocked = !permissionsLoading && !hasPermission("pipeline");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ---------------- pipelines ---------------- */

  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !blocked,
  });

  React.useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const def = pipelines.find((p) => p.is_default) || pipelines[0];
      setSelectedPipelineId(def.id);
    }
  }, [pipelines.length, selectedPipelineId]);

  /* ---------------- opportunities ---------------- */

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const { data, error } = await supabase
        .from("opportunities")
        .select(
          `
          *,
          advertisers ( name ),
          campaigns ( id, name, status, start_date, end_date ),
          flights   ( id, name, status, start_date, end_date ),
          pipelines ( name, stages )
        `,
        )
        .eq("pipeline_id", selectedPipelineId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!selectedPipelineId && !blocked,
  });

  /* ---------------- snapshot (view + fallback) ---------------- */

  const { data: snapshot = [], isLoading: snapshotLoading } = useQuery({
    queryKey: ["advertiser-snapshot"],
    queryFn: fetchAdvertiserSnapshot,
    enabled: showSnapshot && !blocked,
  });

  /* ---------------- current pipeline / stages ---------------- */

  const currentPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const currentStages =
    currentPipeline?.stages ||
    [
      { key: "needs_analysis", label: "Needs Analysis", color: "bg-blue-500" },
      { key: "value_proposition", label: "Value Proposition", color: "bg-purple-500" },
      { key: "proposal", label: "Proposal/Quote", color: "bg-orange-500" },
      { key: "negotiation", label: "Negotiation/Review", color: "bg-yellow-500" },
      { key: "closed_won", label: "Closed Won", color: "bg-green-500" },
      { key: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
    ];

  /* ---------------- filters + metrics ---------------- */

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch =
        opp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.advertisers?.name && opp.advertisers.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, stageFilter]);

  const stageMetrics = useMemo(() => {
    return currentStages.map((stage) => {
      const stageOpps = filteredOpportunities.filter((opp) => opp.stage === stage.key);
      const totalValue = stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
      return {
        ...stage,
        count: stageOpps.length,
        value: totalValue,
        opportunities: stageOpps,
      };
    });
  }, [filteredOpportunities, currentStages]);

  const totalPipelineValue = useMemo(() => {
    return filteredOpportunities
      .filter((o) => !["closed_won", "closed_lost"].includes(o.stage))
      .reduce((sum, o) => sum + (o.amount || 0), 0);
  }, [filteredOpportunities]);

  /* ---------------- mutations ---------------- */

  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ opportunityId, newStage }: { opportunityId: string; newStage: string }) => {
      const { error } = await supabase.from("opportunities").update({ stage: newStage }).eq("id", opportunityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Opportunity moved successfully" });
      queryClient.invalidateQueries({ queryKey: ["opportunities", selectedPipelineId] });
    },
    onError: (error: any) => {
      console.error("Move error", error);
      toast({ title: "Error", description: error?.message || "Failed to move opportunity", variant: "destructive" });
    },
  });

  /* ---------------- DnD handlers ---------------- */

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeOpportunity = filteredOpportunities.find((opp) => opp.id === active.id);
    if (!activeOpportunity) return;

    let targetStageKey: string | null = null;
    const overId = String(over.id);
    if (currentStages.some((s) => s.key === overId)) {
      targetStageKey = overId;
    } else {
      const overOpp = filteredOpportunities.find((o) => o.id === overId);
      if (overOpp) targetStageKey = overOpp.stage;
    }

    if (targetStageKey && activeOpportunity.stage !== targetStageKey) {
      updateOpportunityMutation.mutate({ opportunityId: activeOpportunity.id, newStage: targetStageKey });
    }
  };
  const handleDragStart = (event: any) => setActiveId(event.active.id);
  const handleOpportunityClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  /* ---------------- UI subcomponents ---------------- */

  const DroppableStageColumn = ({ stage, opportunities }: { stage: any; opportunities: Opportunity[] }) => {
    const { setNodeRef, isOver } = useDroppable({ id: stage.key });
    return (
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] p-2 border-2 border-dashed transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-transparent"
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stage.color}`} />
            <h3 className="font-medium text-sm">{stage.label}</h3>
          </div>
          <div className="text-xs text-muted-foreground">
            {stage.count} deals • {formatCurrency(stage.value)}
          </div>
        </div>
        <SortableContext items={opportunities.map((opp) => opp.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {opportunities.map((opp) => (
              <DraggableOpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </SortableContext>
      </div>
    );
  };

  const DraggableOpportunityCard = ({ opportunity }: { opportunity: Opportunity }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opportunity.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    return (
      <div ref={setNodeRef} style={style} {...attributes} className="mb-3">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={(e) => {
            if (!isDragging) handleOpportunityClick(opportunity);
          }}
        >
          <CardContent className="p-4">
            <div
              {...listeners}
              className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-2 h-2 bg-muted-foreground rounded-full mb-1"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full mb-1"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            </div>
            <div className="space-y-2 pr-6">
              <h4 className="font-medium text-sm truncate">{opportunity.name}</h4>
              <div className="text-xs text-muted-foreground">{opportunity.advertisers?.name || "No Advertiser"}</div>
              {opportunity.campaigns && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Campaign: {opportunity.campaigns.name}
                </div>
              )}
              {opportunity.flights && (
                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">Flight: {opportunity.flights.name}</div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{opportunity.amount ? formatCurrency(opportunity.amount) : "—"}</span>
                <Badge variant="outline" className="text-xs">
                  {opportunity.probability}%
                </Badge>
              </div>
              {opportunity.close_date && (
                <div className="text-xs text-muted-foreground">
                  Close: {new Date(opportunity.close_date).toLocaleDateString("pt-PT")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const OpportunityCard = ({ opportunity }: { opportunity: Opportunity }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpportunityClick(opportunity)}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm truncate">{opportunity.name}</h4>
          <div className="text-xs text-muted-foreground">{opportunity.advertisers?.name || "No Advertiser"}</div>
          {opportunity.campaigns && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Campaign: {opportunity.campaigns.name}</div>
          )}
          {opportunity.flights && (
            <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">Flight: {opportunity.flights.name}</div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">{opportunity.amount ? formatCurrency(opportunity.amount) : "—"}</span>
            <Badge variant="outline" className="text-xs">
              {opportunity.probability}%
            </Badge>
          </div>
          {opportunity.close_date && (
            <div className="text-xs text-muted-foreground">Close: {new Date(opportunity.close_date).toLocaleDateString("pt-PT")}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  /* ---------------- guards ---------------- */

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  if (blocked) {
    return <AccessDenied module="pipeline" title="Pipeline Management" description="Gerir o pipeline de vendas e oportunidades comerciais." />;
  }
  if (pipelinesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pipelines...</div>
      </div>
    );
  }

  /* ---------------- render ---------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <PipelineSelector
            pipelines={pipelines}
            selectedPipelineId={selectedPipelineId}
            onPipelineChange={setSelectedPipelineId}
            opportunityCount={opportunities.length}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search opportunities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {currentStages.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPipelineId && (
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Opportunity
            </Button>
          )}
        </div>
      </div>

      {/* Snapshot toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Tip: enable the CRM snapshot to see open / won / total by advertiser and links.</div>
        <div className="flex items-center gap-2">
          <Badge variant={showSnapshot ? "default" : "outline"} className="cursor-pointer" onClick={() => setShowSnapshot((v) => !v)}>
            {showSnapshot ? "CRM Snapshot: ON" : "CRM Snapshot: OFF"}
          </Badge>
        </div>
      </div>

      {/* CRM snapshot cards */}
      {showSnapshot && !snapshotLoading && snapshot.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {snapshot.map((row) => (
            <Card key={row.advertiser_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{row.advertiser_name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm">
                <div className="flex gap-2 mb-2">
                  <Badge variant="outline">open: {row.crm_opportunities_open ?? 0}</Badge>
                  <Badge variant="outline">won: {row.crm_opportunities_won ?? 0}</Badge>
                  <Badge variant="outline">total: {row.crm_opportunities_total ?? 0}</Badge>
                </div>
                {(row.crm_account_external_id || row.ad_server_advertiser_external_id) && (
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {row.crm_account_external_id && <span>CRM ✓</span>}
                    {row.ad_server_advertiser_external_id && <span>Ad Server ✓</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
            <div className="text-sm text-muted-foreground">Total Pipeline</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stageMetrics.find((s) => s.key === "closed_won")?.count ?? 0}</div>
            <div className="text-sm text-muted-foreground">Closed Won</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {formatCurrency(stageMetrics.find((s) => s.key === "closed_won")?.value ?? 0)}
            </div>
            <div className="text-sm text-muted-foreground">Won Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {filteredOpportunities.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).length}
            </div>
            <div className="text-sm text-muted-foreground">Open Deals</div>
          </CardContent>
        </Card>
      </div>

      {/* tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[200px]">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" />
        <TabsContent value="list" />
      </Tabs>

      {/* kanban / list */}
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        {view === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stageMetrics.map((stage) => (
              <DroppableStageColumn key={stage.key} stage={stage} opportunities={stage.opportunities} />
            ))}
            <DragOverlay>
              {activeId ? (
                <OpportunityCard opportunity={filteredOpportunities.find((opp) => opp.id === activeId)!} />
              ) : null}
            </DragOverlay>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/25 transition-colors cursor-pointer"
                    onClick={() => handleOpportunityClick(opp)}
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{opp.name}</h4>
                      <div className="text-sm text-muted-foreground">{opp.advertisers?.name || "No Advertiser"}</div>
                      <div className="flex gap-2 mt-1">
                        {opp.campaigns && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">{opp.campaigns.name}</span>
                        )}
                        {opp.flights && (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">{opp.flights.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{opp.amount ? formatCurrency(opp.amount) : "—"}</div>
                        <div className="text-sm text-muted-foreground">
                          {opp.close_date ? new Date(opp.close_date).toLocaleDateString("pt-PT") : "No date"}
                        </div>
                      </div>
                      <Badge
                        className={`${
                          currentStages.find((s) => s.key === opp.stage)?.color || "bg-gray-500"
                        } text-white`}
                      >
                        {currentStages.find((s) => s.key === opp.stage)?.label || opp.stage}
                      </Badge>
                      <Badge variant="outline">{opp.probability}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </DndContext>

      {/* modal */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOpportunity(null);
        }}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["opportunities", selectedPipelineId] })}
      />
    </div>
  );
}