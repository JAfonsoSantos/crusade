import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import FlightsGantt from '@/components/FlightsGantt';
import { Calendar, Target, BarChart3 } from 'lucide-react';

interface Flight {
  id: string;
  campaign_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  flights?: Flight[];
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    const { data: campaignsData } = await supabase.from('campaigns').select('*');
    if (!campaignsData) return;

    const campaignsWithFlights = await Promise.all(
      campaignsData.map(async (c) => {
        const { data: flights } = await supabase.from('flights').select('*').eq('campaign_id', c.id);
        return { ...c, flights: flights || [] };
      })
    );

    setCampaigns(campaignsWithFlights);
  };

  const buildGanttItems = () => {
    const items = [];
    campaigns.forEach((c) => {
      c.flights?.forEach((f) => {
        items.push({
          id: f.id,
          name: `${c.name} - ${f.name}`,
          start: new Date(f.start_date),
          end: new Date(f.end_date),
          type: 'task',
          progress: f.status === 'active' ? 50 : 0,
          styles: { progressColor: '#0ea5e9', progressSelectedColor: '#0284c7' }
        });
      });
    });
    return items;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Campaigns & Flights</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="campaigns"><Target className="w-4 h-4 mr-2" />Campaigns</TabsTrigger>
          <TabsTrigger value="ad-funnel"><BarChart3 className="w-4 h-4 mr-2" />Ad Funnel</TabsTrigger>
          <TabsTrigger value="timeline"><Calendar className="w-4 h-4 mr-2" />Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          {campaigns.map((c) => (
            <Card key={c.id} className="mb-4">
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent>
                Period: {c.start_date} - {c.end_date}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Timeline</CardTitle>
              <CardDescription>Overview of all flights</CardDescription>
            </CardHeader>
            <CardContent>
              <FlightsGantt items={buildGanttItems()} from={new Date()} to={new Date(new Date().setMonth(new Date().getMonth() + 6))} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Campaigns;
