import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, DollarSign, Target, User, Briefcase, Zap, Edit, Save, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  onUpdate?: () => void;
}

const PIPELINE_STAGES = [
  { key: "needs_analysis", label: "Needs Analysis", color: "bg-blue-500" },
  { key: "value_proposition", label: "Value Proposition", color: "bg-purple-500" },
  { key: "proposal", label: "Proposal/Quote", color: "bg-orange-500" },
  { key: "negotiation", label: "Negotiation/Review", color: "bg-yellow-500" },
  { key: "closed_won", label: "Closed Won", color: "bg-green-500" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
];

export function OpportunityDetailModal({ opportunity, isOpen, onClose, onUpdate }: OpportunityDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(() => ({
    name: opportunity?.name || "",
    amount: opportunity?.amount?.toString() || "",
    stage: opportunity?.stage || "",
    probability: opportunity?.probability?.toString() || "",
    close_date: opportunity?.close_date || "",
    description: opportunity?.description || "",
  }));
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateOpportunityMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("opportunities")
        .update({
          name: data.name,
          amount: data.amount ? parseFloat(data.amount) : null,
          stage: data.stage,
          probability: parseInt(data.probability),
          close_date: data.close_date || null,
          description: data.description || null,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setIsEditing(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update opportunity",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateOpportunityMutation.mutate({ ...editData, id: opportunity?.id });
  };

  // Ensure hooks run before any conditional return
  if (!opportunity) return null;

  // Compute view model after ensuring opportunity exists
  const currentEditData = isEditing ? editData : {
    name: opportunity.name || "",
    amount: opportunity.amount?.toString() || "",
    stage: opportunity.stage || "",
    probability: opportunity.probability?.toString() || "",
    close_date: opportunity.close_date || "",
    description: opportunity.description || "",
  };
  const handleEdit = () => {
    setEditData({
      name: opportunity.name || "",
      amount: opportunity.amount?.toString() || "",
      stage: opportunity.stage || "",
      probability: opportunity.probability?.toString() || "",
      close_date: opportunity.close_date || "",
      description: opportunity.description || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const currentStage = PIPELINE_STAGES.find(s => s.key === opportunity.stage);

  const handleExpandView = () => {
    navigate(`/deals/${opportunity.id}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            {isEditing ? (
              <Input
                value={currentEditData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="text-2xl font-bold border-none p-0 h-auto"
              />
            ) : (
              opportunity.name
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExpandView} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Expand View
              </Button>
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={updateOpportunityMutation.isPending}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit opportunity details" : "View and manage opportunity information"}
          </DialogDescription>
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
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentEditData.amount}
                    onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-32 text-right"
                  />
                ) : (
                  <span className="font-semibold text-lg">
                    {opportunity.amount ? formatCurrency(opportunity.amount) : "—"}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stage:</span>
                {isEditing ? (
                  <Select 
                    value={currentEditData.stage} 
                    onValueChange={(value) => setEditData(prev => ({ ...prev, stage: value }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.key} value={stage.key}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`${currentStage?.color || "bg-gray-500"} text-white`}>
                    {currentStage?.label || opportunity.stage}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Probability:</span>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={currentEditData.probability}
                    onChange={(e) => setEditData(prev => ({ ...prev, probability: e.target.value }))}
                    placeholder="50"
                    className="w-20 text-right"
                  />
                ) : (
                  <Badge variant="outline" className="font-semibold">
                    {opportunity.probability}%
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Close Date:</span>
                {isEditing ? (
                  <Input
                    type="date"
                    value={currentEditData.close_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, close_date: e.target.value }))}
                    className="w-40"
                  />
                ) : (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {opportunity.close_date 
                      ? new Date(opportunity.close_date).toLocaleDateString("pt-PT")
                      : "Not set"
                    }
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created:</span>
                <span>{new Date(opportunity.created_at).toLocaleDateString("pt-PT")}</span>
              </div>
              
              {(opportunity.description || isEditing) && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Description:</span>
                    {isEditing ? (
                      <Textarea
                        value={currentEditData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter description..."
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <p className="mt-1 text-sm">{opportunity.description}</p>
                    )}
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