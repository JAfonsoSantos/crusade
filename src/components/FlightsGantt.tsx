import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FlightsGantt from "@/components/FlightsGantt";
import { supabase } from "@/integrations/supabase/client";

export default function CampaignsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompany() {
      const { data, error } = await supabase
        .from("companies")
        .select("id")
        .limit(1)
        .single();
      if (!error && data) {
        setCompanyId(data.id);
      }
    }
    fetchCompany();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Campaigns & Flights</h1>
      <p className="text-muted-foreground mb-6">
        Manage your advertising campaigns and analyze performance
      </p>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="adfunnel">Ad Funnel</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>List of your campaigns</CardDescription>
            </CardHeader>
            <CardContent>TODO: campaigns table</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adfunnel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Funnel</CardTitle>
              <CardDescription>Performance across funnel stages</CardDescription>
            </CardHeader>
            <CardContent>TODO: ad funnel charts</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {companyId ? (
            <Card>
              <CardHeader>
                <CardTitle>Campaign & Flight Timeline</CardTitle>
                <CardDescription>
                  Visualização Gantt das datas dos flights por campanha
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FlightsGantt companyId={companyId} />
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-muted-foreground">
              A carregar a tua empresa…
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}