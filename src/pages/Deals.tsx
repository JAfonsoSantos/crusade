import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Filter, Eye } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { OpportunityDetailModal } from "@/components/OpportunityDetailModal";

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
  owner_id: string | null;
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
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
};

const stageLabels: Record<string, string> = {
  needs_analysis: "Needs Analysis",
  value_proposition: "Value Proposition", 
  proposal: "Proposal/Quote",
  negotiation: "Negotiation/Review",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const stageColors: Record<string, string> = {
  needs_analysis: "bg-blue-100 text-blue-800",
  value_proposition: "bg-purple-100 text-purple-800",
  proposal: "bg-orange-100 text-orange-800", 
  negotiation: "bg-yellow-100 text-yellow-800",
  closed_won: "bg-green-100 text-green-800",
  closed_lost: "bg-red-100 text-red-800",
};

export default function Deals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all opportunities
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
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
          ),
          profiles!owner_id (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch = opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.advertisers?.name && opp.advertisers.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, stageFilter]);

  const formatCurrency = (amount: number | null, currency: string = "EUR") => {
    if (!amount) return "—";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-PT");
  };

  const handleOpportunityClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalAmount = filteredOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    const openDeals = filteredOpportunities.filter(opp => !["closed_won", "closed_lost"].includes(opp.stage));
    const closedWon = filteredOpportunities.filter(opp => opp.stage === "closed_won");
    const openAmount = openDeals.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    const closedAmount = closedWon.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    
    return {
      totalAmount,
      openAmount,
      closedAmount,
      totalDeals: filteredOpportunities.length,
      openDeals: openDeals.length,
      closedWonDeals: closedWon.length,
    };
  }, [filteredOpportunities]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading deals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all your sales opportunities
          </p>
        </div>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Deal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summaryMetrics.totalAmount)}
            </div>
            <div className="text-sm text-muted-foreground">Total Deal Amount</div>
            <div className="text-xs text-muted-foreground">
              Average per deal: {formatCurrency(summaryMetrics.totalAmount / Math.max(summaryMetrics.totalDeals, 1))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summaryMetrics.openAmount)}
            </div>
            <div className="text-sm text-muted-foreground">Open Deal Amount</div>
            <div className="text-xs text-muted-foreground">
              Average per deal: {formatCurrency(summaryMetrics.openAmount / Math.max(summaryMetrics.openDeals, 1))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryMetrics.closedAmount)}
            </div>
            <div className="text-sm text-muted-foreground">Closed Deal Amount</div>
            <div className="text-xs text-muted-foreground">
              Average per deal: {formatCurrency(summaryMetrics.closedAmount / Math.max(summaryMetrics.closedWonDeals, 1))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summaryMetrics.totalDeals}</div>
            <div className="text-sm text-muted-foreground">Total Deals</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summaryMetrics.openDeals}</div>
            <div className="text-sm text-muted-foreground">Open Deals</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summaryMetrics.closedWonDeals}</div>
            <div className="text-sm text-muted-foreground">Closed Won</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals or advertisers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="needs_analysis">Needs Analysis</SelectItem>
              <SelectItem value="value_proposition">Value Proposition</SelectItem>
              <SelectItem value="proposal">Proposal/Quote</SelectItem>
              <SelectItem value="negotiation">Negotiation/Review</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals ({filteredOpportunities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal Name</TableHead>
                <TableHead>Deal Stage</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Advertiser</TableHead>
                <TableHead>Deal Owner</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOpportunities.map((opportunity) => (
                <TableRow 
                  key={opportunity.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpportunityClick(opportunity)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{opportunity.name}</div>
                      {opportunity.campaigns && (
                        <div className="text-xs text-blue-600">
                          Campaign: {opportunity.campaigns.name}
                        </div>
                      )}
                      {opportunity.flights && (
                        <div className="text-xs text-purple-600">
                          Flight: {opportunity.flights.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={stageColors[opportunity.stage] || "bg-gray-100 text-gray-800"}
                    >
                      {stageLabels[opportunity.stage] || opportunity.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(opportunity.close_date)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(opportunity.amount, opportunity.currency)}
                  </TableCell>
                  <TableCell>
                    {opportunity.advertisers?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserAvatar 
                        src={opportunity.profiles?.avatar_url}
                        name={opportunity.profiles?.full_name || "Unknown User"}
                        size="sm"
                      />
                      <span className="text-sm">{opportunity.profiles?.full_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{opportunity.probability}%</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpportunityClick(opportunity);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOpportunity(null);
          }}
          onUpdate={() => {
            // Handle opportunity update if needed - refresh query would go here
          }}
        />
      )}
    </div>
  );
}