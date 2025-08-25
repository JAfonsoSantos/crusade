import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Calendar, DollarSign, Target, User, Briefcase, Zap, Edit, Save, X, 
  Building2, Activity, FileText, MessageSquare, Clock, CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";

type DealDetail = {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  stage: string;
  probability: number;
  close_date: string | null;
  description: string | null;
  next_steps: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  owner_id: string | null;
  advertiser_id: string | null;
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
    budget: number;
  };
  flights?: {
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date: string;
    budget: number;
  };
  pipelines?: {
    name: string;
    stages: any[];
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

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch deal data
  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      if (!id) throw new Error("Deal ID is required");
      
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
            end_date,
            budget
          ),
          flights (
            id,
            name,
            status,
            start_date,
            end_date,
            budget
          ),
          pipelines (
            name,
            stages
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as DealDetail;
    },
    enabled: !!id,
  });

  const [editData, setEditData] = useState(() => ({
    name: deal?.name || "",
    amount: deal?.amount?.toString() || "",
    stage: deal?.stage || "",
    probability: deal?.probability?.toString() || "",
    close_date: deal?.close_date || "",
    description: deal?.description || "",
    next_steps: deal?.next_steps || "",
  }));

  // Update mutation
  const updateDealMutation = useMutation({
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
          next_steps: data.next_steps || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update deal",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateDealMutation.mutate(editData);
  };

  const handleEdit = () => {
    setEditData({
      name: deal?.name || "",
      amount: deal?.amount?.toString() || "",
      stage: deal?.stage || "",
      probability: deal?.probability?.toString() || "",
      close_date: deal?.close_date || "",
      description: deal?.description || "",
      next_steps: deal?.next_steps || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-PT");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading deal...</div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Deal not found</h2>
          <Button onClick={() => navigate("/deals")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Button>
        </div>
      </div>
    );
  }

  const currentStage = PIPELINE_STAGES.find(s => s.key === deal.stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/deals")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? (
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-3xl font-bold border-none p-0 h-auto bg-transparent"
                />
              ) : (
                deal.name
              )}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge className={`${currentStage?.color || "bg-gray-500"} text-white`}>
                {currentStage?.label || deal.stage}
              </Badge>
              <span className="text-muted-foreground">Pipeline: {deal.pipelines?.name || "Default"}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={updateDealMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Deal Value</p>
                <p className="text-xl font-bold">{formatCurrency(deal.amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Probability</p>
                <p className="text-xl font-bold">{deal.probability}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Close Date</p>
                <p className="text-xl font-bold">{formatDate(deal.close_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Advertiser</p>
                <p className="text-xl font-bold">{deal.advertisers?.name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Deal Value</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editData.amount}
                        onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    ) : (
                      <p className="font-medium">{formatCurrency(deal.amount)}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Currency</Label>
                    <p className="font-medium">{deal.currency}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Stage</Label>
                    {isEditing ? (
                      <Select 
                        value={editData.stage} 
                        onValueChange={(value) => setEditData(prev => ({ ...prev, stage: value }))}
                      >
                        <SelectTrigger>
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
                        {currentStage?.label || deal.stage}
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Probability</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.probability}
                        onChange={(e) => setEditData(prev => ({ ...prev, probability: e.target.value }))}
                        placeholder="50"
                      />
                    ) : (
                      <p className="font-medium">{deal.probability}%</p>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Close Date</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.close_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, close_date: e.target.value }))}
                      />
                    ) : (
                      <p className="font-medium">{formatDate(deal.close_date)}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Source</Label>
                    <p className="font-medium">{deal.source || "Manual"}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1">{deal.description || "No description"}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Next Steps</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.next_steps}
                      onChange={(e) => setEditData(prev => ({ ...prev, next_steps: e.target.value }))}
                      placeholder="Enter next steps..."
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm mt-1">{deal.next_steps || "No next steps defined"}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Advertiser & Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Advertiser & Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    {deal.advertisers?.name || "No Advertiser"}
                  </h3>
                  <p className="text-sm text-muted-foreground">Retail Media Partner</p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Deal Owner</h4>
                  <div className="flex items-center gap-2">
                    <UserAvatar 
                      src={null}
                      name="Unknown User"
                      size="sm"
                    />
                    <span className="text-sm">—</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Associated Campaigns & Flights */}
          {(deal.campaigns || deal.flights) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {deal.campaigns && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Associated Campaign
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Campaign Name</Label>
                      <p className="font-medium">{deal.campaigns.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <Badge variant={deal.campaigns.status === 'active' ? 'default' : 'secondary'}>
                          {deal.campaigns.status}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Budget</Label>
                        <p className="font-medium">{formatCurrency(deal.campaigns.budget)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Campaign Period</Label>
                      <p className="text-sm">
                        {formatDate(deal.campaigns.start_date)} - {formatDate(deal.campaigns.end_date)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {deal.flights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Associated Flight
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Flight Name</Label>
                      <p className="font-medium">{deal.flights.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <Badge variant={deal.flights.status === 'active' ? 'default' : 'secondary'}>
                          {deal.flights.status}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Budget</Label>
                        <p className="font-medium">{formatCurrency(deal.flights.budget)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Flight Period</Label>
                      <p className="text-sm">
                        {formatDate(deal.flights.start_date)} - {formatDate(deal.flights.end_date)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Created</Label>
                  <p className="font-medium">{formatDate(deal.created_at)}</p>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Last Updated</Label>
                  <p className="font-medium">{formatDate(deal.updated_at)}</p>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Deal ID</Label>
                  <p className="font-mono text-sm">{deal.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Activity tracking will be available soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Files & Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>File management will be available soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}