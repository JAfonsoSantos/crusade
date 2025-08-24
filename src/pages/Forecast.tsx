import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, TrendingUp, Target, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';

interface ForecastData {
  month: string;
  availableSpaces: number;
  bookedSpaces: number;
  pipelineValue: number;
  activeOpportunities: number;
}

const Forecast = () => {
  const [selectedTab, setSelectedTab] = useState('availability');

  // Fetch ad spaces availability
  const { data: adSpaces = [] } = useQuery({
    queryKey: ['forecast-ad-spaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_spaces')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming campaigns
  const { data: upcomingCampaigns = [] } = useQuery({
    queryKey: ['forecast-campaigns'],
    queryFn: async () => {
      const today = new Date();
      const nextMonth = addMonths(today, 3);
      
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          flights(*)
        `)
        .gte('start_date', format(today, 'yyyy-MM-dd'))
        .lte('start_date', format(nextMonth, 'yyyy-MM-dd'));
        
      if (error) throw error;
      return data;
    },
  });

  // Fetch pipeline opportunities
  const { data: opportunities = [] } = useQuery({
    queryKey: ['forecast-opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          advertisers(name)
        `)
        .in('stage', ['needs_analysis', 'value_proposition', 'proposal', 'negotiation']);
        
      if (error) throw error;
      return data;
    },
  });

  const generateForecastData = (): ForecastData[] => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
      const month = addMonths(today, i);
      const monthStr = format(month, 'MMM yyyy');
      
      // Calculate availability based on existing data
      const totalSpaces = adSpaces.length;
      const bookedSpaces = Math.floor(Math.random() * totalSpaces * 0.7); // Mock data
      const availableSpaces = totalSpaces - bookedSpaces;
      
      // Pipeline value for the month
      const monthOpportunities = opportunities.filter(opp => {
        if (!opp.close_date) return false;
        const closeDate = new Date(opp.close_date);
        return closeDate.getMonth() === month.getMonth() && 
               closeDate.getFullYear() === month.getFullYear();
      });
      
      const pipelineValue = monthOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
      
      months.push({
        month: monthStr,
        availableSpaces,
        bookedSpaces,
        pipelineValue,
        activeOpportunities: monthOpportunities.length,
      });
    }
    
    return months;
  };

  const forecastData = generateForecastData();
  const totalSpaces = adSpaces.length;
  const availableSpaces = adSpaces.filter(space => space.usage_status === 'unused').length;
  const utilizationRate = totalSpaces > 0 ? ((totalSpaces - availableSpaces) / totalSpaces) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Forecast</h1>
        <p className="text-muted-foreground">
          Disponibilidade e oportunidades de vendas
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espaços Disponíveis</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableSpaces}</div>
            <p className="text-xs text-muted-foreground">
              de {totalSpaces} espaços totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Utilização</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationRate.toFixed(1)}%</div>
            <Progress value={utilizationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Ativo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
            <p className="text-xs text-muted-foreground">
              oportunidades abertas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Futuras</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              próximos 3 meses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Previsão de Disponibilidade - Próximos 6 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecastData.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{month.month}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="secondary">
                          {month.availableSpaces} disponíveis
                        </Badge>
                        <Badge variant="outline">
                          {month.bookedSpaces} ocupados
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Taxa de ocupação</div>
                      <div className="text-lg font-semibold">
                        {month.bookedSpaces > 0 ? 
                          ((month.bookedSpaces / (month.availableSpaces + month.bookedSpaces)) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Oportunidades Ativas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecastData.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{month.month}</h3>
                      <p className="text-sm text-muted-foreground">
                        {month.activeOpportunities} oportunidades
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        €{month.pipelineValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">valor potencial</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campanhas Programadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingCampaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(campaign.start_date), 'dd/MM/yyyy')} - {format(new Date(campaign.end_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        €{campaign.budget?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Forecast;