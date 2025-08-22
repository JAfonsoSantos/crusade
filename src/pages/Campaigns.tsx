import { useEffect, useMemo, useState } from "react";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

/**
 * Campaigns page (simplified)
 * - Loads company_id for the current user
 * - Reads v_gantt_items_fast (or v_gantt_items) and maps to TimelineItem[]
 * - Renders the FlightsGantt without any external gantt libs
 *
 * NOTE: We cast/map the Supabase rows explicitly to keep TypeScript happy,
 * regardless of what the generated supabase types say.
 */

type GanttRow = {
  company_id?: string;
  campaign_id: string;
  campaign_name: string;
  flight_id: string;
  flight_name: string;
  start_date: string;
  end_date: string;
  priority?: number | null;
  status?: string | null;
};

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState<string>("timeline");
  const [loading, setLoading] = useState<boolean>(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setErrorMsg(null);

      // 1) Get user -> profile -> company_id
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        setErrorMsg(authErr.message);
        setLoading(false);
        return;
      }
      const uid = userData.user?.id;
      if (!uid) {
        setErrorMsg("Not authenticated");
        setLoading(false);
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (pErr) {
        setErrorMsg(pErr.message);
        setLoading(false);
        return;
      }

      const cId = profile?.company_id || null;
      setCompanyId(cId);

      // 2) Load data from the fast view first, fallback to the regular one
      const loadFrom = async (viewName: string) => {
        const q = supabase
          .from(viewName)
          .select(
            "company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status"
          );

        const query = cId ? q.eq("company_id", cId) : q;
        return await query;
      };

      let data: any[] | null = null;
      let err: any = null;

      const first = await loadFrom("v_gantt_items_fast");
      if (first.error) {
        // try fallback
        const second = await loadFrom("v_gantt_items");
        data = second.data;
        err = second.error;
      } else {
        data = first.data;
      }

      if (err) {
        setErrorMsg(err.message);
        setLoading(false);
        return;
      }

      // 3) Map rows to TimelineItem[] explicitly
      const mapped: TimelineItem[] = (data || []).map((d: GanttRow) => ({
        campaign_id: d.campaign_id,
        campaign_name: d.campaign_name,
        flight_id: d.flight_id,
        flight_name: d.flight_name,
        start_date: d.start_date,
        end_date: d.end_date,
        priority: d.priority ?? null,
        status: d.status ?? null,
      }));

      setItems(mapped);
      setLoading(false);
    }

    bootstrap();
  }, []);

  const range = useMemo(() => {
    if (!items.length) return { from: undefined as Date | undefined, to: undefined as Date | undefined };
    const parse = (s: string) => {
      const d = s.length === 10 ? s : s.slice(0, 10);
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, (m || 1) - 1, day || 1);
    };
    const starts = items.map(i => parse(i.start_date).getTime());
    const ends = items.map(i => parse(i.end_date).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    return { from: min, to: max };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns & Flights</h1>
          <p className="text-muted-foreground">
            Manage your advertising campaigns and analyze performance
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="ad-funnel">Ad Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign & Flight Timeline</CardTitle>
              <CardDescription>Visual timeline (Gantt) grouped by campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading timeline…
                </div>
              ) : errorMsg ? (
                <div className="text-sm text-red-600">Error: {errorMsg}</div>
              ) : (
                <FlightsGantt items={items} from={range.from} to={range.to} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>Simple placeholder list</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Coming soon — this tab will list and manage campaigns.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ad-funnel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Funnel</CardTitle>
              <CardDescription>Placeholder content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Coming soon — funnel visualization.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
