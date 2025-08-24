import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Filter, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  advertisers?: {
    name: string;
  };
};

const PIPELINE_STAGES = [
  { key: "needs_analysis", label: "Needs Analysis", color: "bg-blue-500" },
  { key: "value_proposition", label: "Value Proposition", color: "bg-purple-500" },
  { key: "proposal", label: "Proposal/Quote", color: "bg-orange-500" },
  { key: "negotiation", label: "Negotiation/Review", color: "bg-yellow-500" },
  { key: "closed_won", label: "Closed Won", color: "bg-green-500" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
];

export default function Pipeline() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const { toast } = useToast();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          *,
          advertisers (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Opportunity[];
    },
  });

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch = opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.advertisers?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, stageFilter]);

  const stageMetrics = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => {
      const stageOpps = filteredOpportunities.filter((opp) => opp.stage === stage.key);
      const totalValue = stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
      return {
        ...stage,
        count: stageOpps.length,
        value: totalValue,
        opportunities: stageOpps,
      };
    });
  }, [filteredOpportunities]);

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

  const OpportunityCard = ({ opportunity }: { opportunity: Opportunity }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm truncate">{opportunity.name}</h4>
          <div className="text-xs text-muted-foreground">
            {opportunity.advertisers?.name || "No Advertiser"}
          </div>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Manage your retail media opportunities and track sales progress
          </p>
        </div>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Opportunity
        </Button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
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
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.key} value={stage.key}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            Kanban
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            List
          </Button>
        </div>
      </div>

      {/* Pipeline Content */}
      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stageMetrics.map((stage) => (
            <div key={stage.key} className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <h3 className="font-medium text-sm">{stage.label}</h3>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stage.count} deals • {formatCurrency(stage.value)}
                </div>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {stage.opportunities.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            </div>
          ))}
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/25 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{opp.name}</h4>
                    <div className="text-sm text-muted-foreground">
                      {opp.advertisers?.name || "No Advertiser"}
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
                        PIPELINE_STAGES.find((s) => s.key === opp.stage)?.color || "bg-gray-500"
                      } text-white`}
                    >
                      {PIPELINE_STAGES.find((s) => s.key === opp.stage)?.label || opp.stage}
                    </Badge>
                    <Badge variant="outline">{opp.probability}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}