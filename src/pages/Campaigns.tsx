import React, { useEffect, useState } from "react";
import FlightsGantt, { TimelineItem } from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";

// (Optional) UI wrappers – if your project doesn't have these shadcn cards,
// you can safely replace them by simple <div> blocks.
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const Campaigns: React.FC = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1) Load user's company_id
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) {
          if (mounted) {
            setCompanyId(null);
            setLoading(false);
            setError("Not authenticated.");
          }
          return;
        }

        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", uid)
          .maybeSingle();

        if (pErr) throw pErr;
        if (mounted) setCompanyId(profile?.company_id ?? null);
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Load Gantt items from the fast view for that company
  useEffect(() => {
    if (!companyId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("v_gantt_items_fast")
          .select(
            "company_id,campaign_id,campaign_name,flight_id,flight_name,start_date,end_date,priority,status"
          )
          .eq("company_id", companyId);

        if (error) throw error;

        const rows = (data ?? []) as any[];
        const mapped: TimelineItem[] = rows.map((r) => ({
          campaign_id: r.campaign_id,
          campaign_name: r.campaign_name ?? "",
          flight_id: r.flight_id,
          flight_name: r.flight_name ?? "",
          start_date: r.start_date,
          end_date: r.end_date,
          priority: r.priority ?? null,
          status: r.status ?? null,
        }));

        if (mounted) setItems(mapped);
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to fetch timeline items.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [companyId]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Campaigns & Flights</h2>
      <p className="text-muted-foreground">
        Manage your advertising campaigns and analyze performance
      </p>

      {loading && <div>Loading…</div>}
      {!loading && error && (
        <div className="text-sm text-red-600">Error: {error}</div>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign &amp; Flight Timeline</CardTitle>
            <CardDescription>
              Visual timeline (Gantt) grouped by campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <FlightsGantt items={items} />
            ) : (
              <div className="text-sm text-muted-foreground">
                No flights found for your company.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Campaigns;
