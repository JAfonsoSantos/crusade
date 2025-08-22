import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import FlightsGantt, { TimelineItem } from "../components/FlightsGantt";

const CampaignsPage: React.FC = () => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "campaigns" | "funnel">("timeline");

  useEffect(() => {
    const loadData = async () => {
      const user = await supabase.auth.getUser();
      const company_id = user.data?.user?.user_metadata?.company_id;

      if (!company_id) return;

      const { data, error } = await supabase
        .from("v_gantt_items_fast")
        .select("*")
        .eq("company_id", company_id);

      if (error) {
        console.error("Error fetching data:", error);
        return;
      }

      if (data) {
        const mapped: TimelineItem[] = data.map((d: any) => ({
          campaign_id: d.campaign_id,
          campaign_name: d.campaign_name,
          flight_id: d.flight_id,
          flight_name: d.flight_name,
          start_date: d.start_date,
          end_date: d.end_date,
          priority: d.priority,
          status: d.status,
        }));
        setItems(mapped);
      }
    };
    loadData();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Campaigns & Flights</h1>

      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded ${activeTab === "timeline" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("timeline")}
        >
          Timeline
        </button>
        <button
          className={`px-3 py-1 rounded ${activeTab === "campaigns" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("campaigns")}
        >
          Campaigns
        </button>
        <button
          className={`px-3 py-1 rounded ${activeTab === "funnel" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("funnel")}
        >
          Ad Funnel
        </button>
      </div>

      {activeTab === "timeline" && <FlightsGantt items={items} />}
      {activeTab === "campaigns" && <div>Campaigns list here...</div>}
      {activeTab === "funnel" && <div>Ad Funnel visualization here...</div>}
    </div>
  );
};

export default CampaignsPage;