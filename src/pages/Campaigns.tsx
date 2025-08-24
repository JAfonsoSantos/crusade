import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CampaignData = {
  campaign_id: string;
  campaign_name: string;
  advertiser_name: string | null;
  flight_count: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spend: number;
  start_date: string;
  end_date: string;
  status: string;
};

const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [advertiserFilter, setAdvertiserFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<CampaignData | null>(null);

  // load campaign data by advertiser
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) {
          setCampaigns([]);
          setLoading(false);
          return;
        }
        const { data: prof } = await supabase.from("profiles").select("company_id").eq("user_id", uid).single();
        const cId = prof?.company_id;
        if (!cId) { setCampaigns([]); setLoading(false); return; }

        // Get campaigns with advertiser info
        const { data, error } = await supabase
          .from("campaigns")
          .select(`
            id,
            name,
            start_date,
            end_date,
            status,
            advertiser_id,
            advertisers(name),
            flights(
              impressions,
              clicks,
              conversions,
              spend
            )
          `)
          .eq("company_id", cId);

        if (error) console.error(error);
        
        const campaignData: CampaignData[] = (data || []).map(campaign => {
          const flightData = campaign.flights || [];
          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            advertiser_name: campaign.advertisers?.name || "No Advertiser",
            flight_count: flightData.length,
            total_impressions: flightData.reduce((sum, f) => sum + (f.impressions || 0), 0),
            total_clicks: flightData.reduce((sum, f) => sum + (f.clicks || 0), 0),
            total_conversions: flightData.reduce((sum, f) => sum + (f.conversions || 0), 0),
            total_spend: flightData.reduce((sum, f) => sum + (f.spend || 0), 0),
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            status: campaign.status
          };
        });
        
        setCampaigns(campaignData);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const advertisers = useMemo(() => {
    const unique = [...new Set(campaigns.map(c => c.advertiser_name))];
    return unique.sort();
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (advertiserFilter === "all") return campaigns;
    return campaigns.filter(c => c.advertiser_name === advertiserFilter);
  }, [campaigns, advertiserFilter]);

  const campaignsByAdvertiser = useMemo(() => {
    const grouped = filteredCampaigns.reduce((acc, campaign) => {
      const advertiser = campaign.advertiser_name || "No Advertiser";
      if (!acc[advertiser]) acc[advertiser] = [];
      acc[advertiser].push(campaign);
      return acc;
    }, {} as Record<string, CampaignData[]>);
    return grouped;
  }, [filteredCampaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns by Advertiser</h2>
          <p className="text-muted-foreground">View campaigns organized by advertiser</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{campaigns.length} campaigns</Badge>
          <Select value={advertiserFilter} onValueChange={(v) => setAdvertiserFilter(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All advertisers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All advertisers</SelectItem>
              {advertisers.map(advertiser => (
                <SelectItem key={advertiser} value={advertiser}>{advertiser}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(campaignsByAdvertiser).map(([advertiser, advertiserCampaigns]) => (
            <Card key={advertiser}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  <CardTitle>{advertiser}</CardTitle>
                  <Badge variant="secondary">{advertiserCampaigns.length} campaigns</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {advertiserCampaigns.map(campaign => (
                    <div 
                      key={campaign.campaign_id}
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelected(campaign)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{campaign.campaign_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {campaign.start_date} → {campaign.end_date}
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="capitalize">{campaign.status}</Badge>
                            <Badge variant="secondary">{campaign.flight_count} flights</Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm space-y-1">
                          <div>Impressions: {campaign.total_impressions.toLocaleString()}</div>
                          <div>Clicks: {campaign.total_clicks.toLocaleString()}</div>
                          <div>Spend: €{campaign.total_spend.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign modal */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.campaign_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Advertiser</div>
                <div className="font-medium">{selected.advertiser_name}</div>
                <div className="text-sm text-muted-foreground mt-4">Dates</div>
                <div className="font-medium">{selected.start_date} → {selected.end_date}</div>
                <div className="flex gap-2 mt-4">
                  <Badge className="capitalize">{selected.status}</Badge>
                  <Badge variant="secondary">{selected.flight_count} flights</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Impressions</div><div className="text-right tabular-nums">{selected.total_impressions.toLocaleString()}</div>
                  <div className="text-muted-foreground">Clicks</div><div className="text-right tabular-nums">{selected.total_clicks.toLocaleString()}</div>
                  <div className="text-muted-foreground">Conversions</div><div className="text-right tabular-nums">{selected.total_conversions.toLocaleString()}</div>
                  <div className="text-muted-foreground">Spend</div><div className="text-right tabular-nums">€{selected.total_spend.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsPage;
