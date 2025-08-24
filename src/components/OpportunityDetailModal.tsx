import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Target, User, Briefcase, Zap } from "lucide-react";

type OpportunityDetail = {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  stage: string;
  probability: number;
  close_date: string | null;
  description: string | null;
  created_at: string;
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
};

interface OpportunityDetailModalProps {
  opportunity: OpportunityDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const PIPELINE_STAGES = [
  { key: "needs_analysis", label: "Needs Analysis", color: "bg-blue-500" },
  { key: "value_proposition", label: "Value Proposition", color: "bg-purple-500" },
  { key: "proposal", label: "Proposal/Quote", color: "bg-orange-500" },
  { key: "negotiation", label: "Negotiation/Review", color: "bg-yellow-500" },
  { key: "closed_won", label: "Closed Won", color: "bg-green-500" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
];

export function OpportunityDetailModal({ opportunity, isOpen, onClose }: OpportunityDetailModalProps) {
  if (!opportunity) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const currentStage = PIPELINE_STAGES.find(s => s.key === opportunity.stage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{opportunity.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opportunity Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Opportunity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Value:</span>
                <span className="font-semibold text-lg">
                  {opportunity.amount ? formatCurrency(opportunity.amount) : "—"}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stage:</span>
                <Badge className={`${currentStage?.color || "bg-gray-500"} text-white`}>
                  {currentStage?.label || opportunity.stage}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Probability:</span>
                <Badge variant="outline" className="font-semibold">
                  {opportunity.probability}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Close Date:</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {opportunity.close_date 
                    ? new Date(opportunity.close_date).toLocaleDateString("pt-PT")
                    : "Not set"
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created:</span>
                <span>{new Date(opportunity.created_at).toLocaleDateString("pt-PT")}</span>
              </div>
              
              {opportunity.description && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Description:</span>
                    <p className="mt-1 text-sm">{opportunity.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Advertiser Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Advertiser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">
                  {opportunity.advertisers?.name || "No Advertiser"}
                </h3>
                <p className="text-sm text-muted-foreground">Retail Media Partner</p>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Information */}
          {opportunity.campaigns && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Associated Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Campaign Name:</span>
                  <p className="font-medium">{opportunity.campaigns.name}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={opportunity.campaigns.status === 'active' ? 'default' : 'secondary'}>
                    {opportunity.campaigns.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Period:</span>
                  <span className="text-sm">
                    {new Date(opportunity.campaigns.start_date).toLocaleDateString("pt-PT")} - {" "}
                    {new Date(opportunity.campaigns.end_date).toLocaleDateString("pt-PT")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flight Information */}
          {opportunity.flights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Associated Flight
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Flight Name:</span>
                  <p className="font-medium">{opportunity.flights.name}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={opportunity.flights.status === 'active' ? 'default' : 'secondary'}>
                    {opportunity.flights.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Period:</span>
                  <span className="text-sm">
                    {new Date(opportunity.flights.start_date).toLocaleDateString("pt-PT")} - {" "}
                    {new Date(opportunity.flights.end_date).toLocaleDateString("pt-PT")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}