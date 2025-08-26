import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { useLanguage } from "@/contexts/LanguageContext";

const LS_FILTER_KEY = "crusade.campaigns.filter";

const CampaignsPage: React.FC = () => {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { t } = useLanguage();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_FILTER_KEY) || null; } catch { return null; }
  });
  const [stats, setStats] = useState({ spaces: 0, campaigns: 0, revenue: 0 });
  const [syncing, setSyncing] = useState(false);
  const [debug, setDebug] = useState<{companyId?: string; flightsFetched: number; distinctCampaigns: number}>({ flightsFetched: 0, distinctCampaigns: 0 });
  const [showAllCompanies, setShowAllCompanies] = useState(false); // debug toggle

  // persist filter
  useEffect(() => {
    try {
      if (campaignFilter) localStorage.setItem(LS_FILTER_KEY, campaignFilter);
      else localStorage.removeItem(LS_FILTER_KEY);
    } catch {}
  }, [campaignFilter]);

  // fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      if (!hasPermission("campaigns")) {
        setTimelineItems([]);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      console.log("User profile:", profile, "Error:", profileError);

      const companyId = profile?.company_id || undefined;

      // Base query
      let query = supabase
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
        .order("start_date", { ascending: true });

      if (!showAllCompanies && companyId) {
        query = query.eq("campaigns.company_id", companyId);
      }

      const { data, error } = await query;

      console.log("Flights query result:", { data, error, companyId, showAllCompanies });

      if (error || profileError) {
        console.error("Query errors:", { error, profileError });
        setTimelineItems([]);
        setDebug({ companyId, flightsFetched: 0, distinctCampaigns: 0 });
        setLoading(false);
        return;
      }

      const items: TimelineItem[] = (data || []).map((flight: any) => ({
        company_id: flight.campaigns.company_id,
        campaign_id: flight.campaigns.id,
        campaign_name: flight.campaigns.name,
        flight_id: flight.id,
        flight_name: flight.name,
        start_date: flight.start_date,
        end_date: flight.end_date,
        status: flight.status,
        impressions: flight.impressions || 0,
        clicks: flight.clicks || 0,
        conversions: flight.conversions || 0,
        spend: flight.spend || 0,
        priority: flight.priority || 1,
      }));

      setTimelineItems(items);

      const campaignsCount = new Set(items.map(i => i.campaign_id)).size;
      const revenue = items.reduce((s, r) => s + (r.spend || 0), 0);
      const spacesCount = 0;
      setStats({ spaces: spacesCount, campaigns: campaignsCount, revenue });
      setDebug({ companyId, flightsFetched: items.length, distinctCampaigns: campaignsCount });
      setLoading(false);
    };

    if (!permissionsLoading) fetchData();
  }, [permissionsLoading, showAllCompanies]);

  const campaigns = useMemo(() => {
    const unique = [...new Set(timelineItems.map(item => item.campaign_name))];
    return unique.sort();
  }, [timelineItems]);

  const flightsCountByCampaign = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of timelineItems) {
      m.set(it.campaign_name, (m.get(it.campaign_name) || 0) + 1);
    }
    return m;
  }, [timelineItems]);

  const handleItemSelect = (item: TimelineItem) => {
    setSelectedItem(item);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke("crm-universal-sync");
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const resetFilter = () => {
    setCampaignFilter(null);
    try { localStorage.removeItem(LS_FILTER_KEY); } catch {}
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>{t?.("loading") || "Loading..."}</span>
      </div>
    );
  }

  if (!hasPermission("campaigns")) {
    return <AccessDenied module="campaigns" title="Campaigns" />;
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns &amp; Flights</h1>
          <p className="text-muted-foreground">Manage campaigns and analyze performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetFilter}>Reset filter</Button>
          <Button onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={syncing ? "animate-spin" : ""} size={16} />
            {syncing ? "Syncing..." : "Sync with Platforms"}
          </Button>
        </div>
      </div>

      {/* DEBUG BANNER (temporário) */}
      <div className="flex items-center gap-2 text-xs p-2 rounded bg-amber-50 text-amber-900 border border-amber-200">
        <AlertCircle size={14} />
        <span>Company: <strong>{debug.companyId || "none"}</strong> · Flights: <strong>{debug.flightsFetched}</strong> · Campaigns: <strong>{debug.distinctCampaigns}</strong> · Show all companies: <button className="underline" onClick={() => setShowAllCompanies(s => !s)}>{showAllCompanies ? "ON" : "OFF"}</button></span>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t?.("active_campaigns") || "Active Campaigns"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.campaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t?.("total_revenue") || "Total Revenue"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {stats.revenue.toLocaleString(undefined, { style: "currency", currency: "EUR" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t?.("spaces") || "Spaces"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.spaces}</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS + TIMELINE */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Timeline</CardTitle>
              <p className="text-sm text-muted-foreground">Gantt by campaign</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t?.("campaign") || "Campaign"}</span>
                <Select
                  value={campaignFilter || "__all__"}
                  onValueChange={(v) => setCampaignFilter(v === "__all__" ? null : v)}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder={t?.("all_campaigns") || "All campaigns"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t?.("all_campaigns") || "All campaigns"}</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <span>{c}</span>
                          {flightsCountByCampaign.has(c) && (
                            <Badge variant="secondary">
                              {flightsCountByCampaign.get(c)} flights
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>{t?.("loading_flights") || "Loading flights..."}</span>
            </div>
          ) : (
            <FlightsGantt
              items={timelineItems}
              campaignFilter={campaignFilter || undefined}
              onSelect={handleItemSelect}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignsPage;
