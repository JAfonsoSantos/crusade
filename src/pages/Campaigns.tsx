import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";

const CampaignsPage: React.FC = () => {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);

  // Check permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!hasPermission('campaigns')) {
    return <AccessDenied 
      module="campaigns" 
      title="Campaign Management"
      description="Gerir campanhas publicitárias e voos de anúncios."
    />;
  }

  // Load campaigns and flights data for timeline
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) {
          setTimelineItems([]);
          setLoading(false);
          return;
        }
        
        const { data: prof } = await supabase.from("profiles").select("company_id").eq("user_id", uid).single();
        const cId = prof?.company_id;
        if (!cId) { 
          setTimelineItems([]); 
          setLoading(false); 
          return; 
        }

        // Get flights with campaign data for timeline view
        const { data, error } = await supabase
          .from("flights")
          .select(`
            id,
            name,
            start_date,
            end_date,
            status,
            impressions,
            clicks,
            conversions,
            spend,
            priority,
            campaigns!inner(
              id,
              name,
              company_id
            )
          `)
          .eq("campaigns.company_id", cId);

        if (error) {
          console.error("Error fetching flights:", error);
          setTimelineItems([]);
          setLoading(false);
          return;
        }
        
        const items: TimelineItem[] = (data || []).map(flight => ({
          id: flight.id,
          name: flight.name,
          flight_name: flight.name,
          flight_id: flight.id,
          campaign_id: flight.campaigns.id,
          campaign_name: flight.campaigns.name,
          start_date: flight.start_date,
          end_date: flight.end_date,
          status: flight.status,
          impressions: flight.impressions || 0,
          clicks: flight.clicks || 0,
          conversions: flight.conversions || 0,
          spend: flight.spend || 0,
          priority: flight.priority || 1,
          company_id: flight.campaigns.company_id
        }));
        
        setTimelineItems(items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const campaigns = useMemo(() => {
    const unique = [...new Set(timelineItems.map(item => item.campaign_name))];
    return unique.sort();
  }, [timelineItems]);

  const handleItemSelect = (item: TimelineItem) => {
    setSelectedItem(item);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns Timeline</h2>
          <p className="text-muted-foreground">View campaign flights in timeline format</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{timelineItems.length} flights</Badge>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Flight Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <FlightsGantt 
              items={timelineItems} 
              campaignFilter={campaignFilter === "all" ? undefined : campaignFilter}
              onSelect={handleItemSelect}
            />
          </CardContent>
        </Card>
      )}

      {selectedItem && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedItem.flight_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Campaign</div>
                <div className="font-medium">{selectedItem.campaign_name}</div>
                <div className="text-sm text-muted-foreground mt-4">Dates</div>
                <div className="font-medium">
                  {new Date(selectedItem.start_date).toLocaleDateString()} → {new Date(selectedItem.end_date).toLocaleDateString()}
                </div>
                <div className="flex gap-2 mt-4">
                  <Badge className="capitalize">{selectedItem.status}</Badge>
                  <Badge variant="secondary">Priority {selectedItem.priority}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Impressions</div>
                  <div className="text-right tabular-nums">{selectedItem.impressions.toLocaleString()}</div>
                  <div className="text-muted-foreground">Clicks</div>
                  <div className="text-right tabular-nums">{selectedItem.clicks.toLocaleString()}</div>
                  <div className="text-muted-foreground">Conversions</div>
                  <div className="text-right tabular-nums">{selectedItem.conversions.toLocaleString()}</div>
                  <div className="text-muted-foreground">Spend</div>
                  <div className="text-right tabular-nums">€{selectedItem.spend.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CampaignsPage;
