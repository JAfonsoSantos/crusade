import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Filter, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OpportunityDetailModal } from "@/components/OpportunityDetailModal";
import { PipelineSelector } from "@/components/PipelineSelector";
import { CreatePipelineModal } from "@/components/CreatePipelineModal";
import { 
  DndContext, 
  DragOverlay,
  pointerWithin,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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


export default function Pipeline() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch pipelines
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
  });

  // Set default pipeline when pipelines load
  React.useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines.length, selectedPipelineId]);

  // Fetch opportunities for selected pipeline
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          *,
          advertisers (
            name
          ),
          campaigns (
            id,
            name,
            status,
            start_date,
            end_date
          ),
          flights (
            id,
            name,
            status,
            start_date,
            end_date
          ),
          pipelines (
            name,
            stages
          )
        `)
        .eq("pipeline_id", selectedPipelineId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!selectedPipelineId,
  });

  const currentPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const currentStages = currentPipeline?.stages || [
    { key: "needs_analysis", label: "Needs Analysis", color: "bg-blue-500" },
    { key: "value_proposition", label: "Value Proposition", color: "bg-purple-500" },
    { key: "proposal", label: "Proposal/Quote", color: "bg-orange-500" },
    { key: "negotiation", label: "Negotiation/Review", color: "bg-yellow-500" },
    { key: "closed_won", label: "Closed Won", color: "bg-green-500" },
    { key: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
  ];

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch = opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.advertisers?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, stageFilter]);
  // Mutation to update opportunity stage
  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ opportunityId, newStage }: { opportunityId: string, newStage: string }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ stage: newStage })
        .eq("id", opportunityId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Opportunity moved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities", selectedPipelineId] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to move opportunity",
        variant: "destructive",
      });
    },
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeOpportunity = filteredOpportunities.find(opp => opp.id === active.id);
    if (!activeOpportunity) return;

    // Determine target stage: either a column id or the stage of the card we dropped over
    let targetStageKey: string | null = null;
    const overId = String(over.id);

    if (currentStages.some(s => s.key === overId)) {
      targetStageKey = overId;
    } else {
      const overOpp = filteredOpportunities.find(o => o.id === overId);
      if (overOpp) targetStageKey = overOpp.stage;
    }

    if (targetStageKey && activeOpportunity.stage !== targetStageKey) {
      updateOpportunityMutation.mutate({
        opportunityId: activeOpportunity.id,
        newStage: targetStageKey,
      });
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

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
      .filter((opp) => !["closed_won", "closed_lost"].includes(opp.stage))
      .reduce((sum, opp) => sum + (opp.amount || 0), 0);
  }, [filteredOpportunities]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleOpportunityClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  // Droppable Stage Column
  const DroppableStageColumn = ({ stage, opportunities }: { stage: any, opportunities: Opportunity[] }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: stage.key,
    });

    return (
      <div 
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] p-2 border-2 border-dashed transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-transparent'
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
        <SortableContext items={opportunities.map(opp => opp.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {opportunities.map((opp) => (
              <DraggableOpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </SortableContext>
      </div>
    );
  };

  // Draggable Opportunity Card
  const DraggableOpportunityCard = ({ opportunity }: { opportunity: Opportunity }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: opportunity.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="mb-3"
      >
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={(e) => {
            // Prevent click when dragging
            if (!isDragging) {
              handleOpportunityClick(opportunity);
            }
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
              <div className="text-xs text-muted-foreground">
                {opportunity.advertisers?.name || "No Advertiser"}
              </div>
              {opportunity.campaigns && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Campaign: {opportunity.campaigns.name}
                </div>
              )}
              {opportunity.flights && (
                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  Flight: {opportunity.flights.name}
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">
                  {opportunity.amount ? formatCurrency(opportunity.amount) : "—"}
                </span>
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
    <Card 
      className="mb-3 hover:shadow-md transition-shadow cursor-pointer" 
      onClick={() => handleOpportunityClick(opportunity)}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm truncate">{opportunity.name}</h4>
          <div className="text-xs text-muted-foreground">
            {opportunity.advertisers?.name || "No Advertiser"}
          </div>
          {opportunity.campaigns && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Campaign: {opportunity.campaigns.name}
            </div>
          )}
          {opportunity.flights && (
            <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Flight: {opportunity.flights.name}
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">
              {opportunity.amount ? formatCurrency(opportunity.amount) : "—"}
            </span>
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
  );

  if (pipelinesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pipelines...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Pipeline Selector */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <PipelineSelector
            pipelines={pipelines}
            selectedPipelineId={selectedPipelineId}
            onPipelineChange={setSelectedPipelineId}
            opportunityCount={opportunities.length}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {currentStages.map((stage) => (
                <SelectItem key={stage.key} value={stage.key}>
                  {stage.label}
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

      {!selectedPipelineId ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Select a pipeline to view opportunities</p>
        </div>
      ) : (
        <>
          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
                <div className="text-sm text-muted-foreground">Total Pipeline</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stageMetrics[4]?.count || 0}</div>
                <div className="text-sm text-muted-foreground">Closed Won</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(stageMetrics[4]?.value || 0)}</div>
                <div className="text-sm text-muted-foreground">Won Value</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {filteredOpportunities.filter(o => !["closed_won", "closed_lost"].includes(o.stage)).length}
                </div>
                <div className="text-sm text-muted-foreground">Open Deals</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={view} onValueChange={(value) => setView(value as "kanban" | "list")} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 max-w-[200px]">
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Pipeline Content */}
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
          >
            {view === "kanban" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stageMetrics.map((stage) => (
                  <DroppableStageColumn 
                    key={stage.key} 
                    stage={stage} 
                    opportunities={stage.opportunities}
                  />
                ))}
                
                <DragOverlay>
                  {activeId ? (
                    <OpportunityCard
                      opportunity={filteredOpportunities.find(opp => opp.id === activeId)!}
                    />
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
                        <div className="text-sm text-muted-foreground">
                          {opp.advertisers?.name || "No Advertiser"}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {opp.campaigns && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {opp.campaigns.name}
                            </span>
                          )}
                          {opp.flights && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                              {opp.flights.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {opp.amount ? formatCurrency(opp.amount) : "—"}
                          </div>
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
        </>
      )}
      
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