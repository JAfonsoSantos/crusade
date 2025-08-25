import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, Target, DollarSign, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { toast } from 'sonner';

interface ForecastData {
  month: string;
  availableSpaces: number;
  bookedSpaces: number;
  pipelineValue: number;
  activeOpportunities: number;
}

interface KevelForecastResult {
  id: string;
  status: string;
  progress?: number;
  result?: {
    total?: Record<string, {
      impressions: number;
      uniqueUsers: number;
    }>;
    grouped?: any;
  };
  resultStatus?: string;
  message?: string;
}

const Forecast = () => {
  const [selectedTab, setSelectedTab] = useState('availability');
  const [kevelForecast, setKevelForecast] = useState<KevelForecastResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

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

  // Fetch Kevel integrations
  const { data: kevelIntegrations = [] } = useQuery({
    queryKey: ['kevel-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_server_integrations')
        .select('*')
        .eq('provider', 'kevel')
        .eq('status', 'active');
        
      if (error) throw error;
      return data;
    },
  });

  // Kevel forecast mutation
  const kevelForecastMutation = useMutation({
    mutationFn: async ({ integrationId, forecastType, endDate }: { 
      integrationId: string; 
      forecastType: string; 
      endDate: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('kevel-forecast', {
        body: {
          integrationId,
          forecastType,
          endDate,
          startDate: format(new Date(), 'yyyy-MM-dd'),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setKevelForecast(data);
      if (data.status === 'enqueued' || data.status === 'running') {
        startPolling(data.id);
      }
      toast.success('Previsão Kevel iniciada');
    },
    onError: (error) => {
      console.error('Erro na previsão Kevel:', error);
      toast.error('Erro ao solicitar previsão Kevel');
    },
  });

  // Polling function for forecast results
  const startPolling = (forecastId: string) => {
    if (!kevelIntegrations[0]?.id) return;
    
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('kevel-forecast-poll', {
          body: {
            integrationId: kevelIntegrations[0].id,
            forecastId,
          },
        });

        if (error) throw error;

        setKevelForecast(data);

        if (data.status === 'finished') {
          clearInterval(pollInterval);
          setIsPolling(false);
          toast.success('Previsão Kevel concluída');
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setIsPolling(false);
          toast.error('Falha na previsão Kevel');
        }
      } catch (error) {
        console.error('Erro ao verificar status da previsão:', error);
        clearInterval(pollInterval);
        setIsPolling(false);
      }
    }, 3000);

    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPolling(false);
    }, 300000);
  };

  const handleKevelForecast = (forecastType: string) => {
    if (!kevelIntegrations[0]?.id) {
      toast.error('Nenhuma integração Kevel ativa encontrada');
      return;
    }

    const endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
    kevelForecastMutation.mutate({
      integrationId: kevelIntegrations[0].id,
      forecastType,
      endDate,
    });
  };

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

  // Calculate Kevel forecast metrics
  const kevelImpressions = kevelForecast?.result?.total ? 
    Object.values(kevelForecast.result.total).reduce((sum, ad) => sum + ad.impressions, 0) : 0;
  const kevelUniqueUsers = kevelForecast?.result?.total ? 
    Object.values(kevelForecast.result.total).reduce((sum, ad) => sum + ad.uniqueUsers, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forecast</h1>
          <p className="text-muted-foreground">
            Disponibilidade e oportunidades de vendas
          </p>
        </div>
        <div className="flex gap-2">
          {kevelIntegrations.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleKevelForecast('existing')}
                disabled={kevelForecastMutation.isPending || isPolling}
              >
                <Activity className="h-4 w-4 mr-2" />
                Previsão Existente
              </Button>
              <Button
                variant="outline"
                onClick={() => handleKevelForecast('available')}
                disabled={kevelForecastMutation.isPending || isPolling}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(kevelForecastMutation.isPending || isPolling) ? 'animate-spin' : ''}`} />
                Previsão Disponível
              </Button>
            </>
          )}
        </div>
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

      {/* Kevel Forecast Results */}
      {kevelForecast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Previsão Kevel
              {(kevelForecast.status === 'enqueued' || kevelForecast.status === 'running' || isPolling) && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}
              <Badge variant={
                kevelForecast.status === 'finished' ? 'default' :
                kevelForecast.status === 'running' ? 'secondary' :
                kevelForecast.status === 'enqueued' ? 'outline' : 'destructive'
              }>
                {kevelForecast.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kevelForecast.status === 'finished' && kevelForecast.result ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Impressões Previstas</h4>
                  <div className="text-3xl font-bold">{kevelImpressions.toLocaleString()}</div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Usuários Únicos</h4>
                  <div className="text-3xl font-bold">{kevelUniqueUsers.toLocaleString()}</div>
                </div>
                {kevelForecast.result.total && (
                  <div className="md:col-span-2 mt-4">
                    <h4 className="font-medium mb-2">Detalhes por Anúncio</h4>
                    <div className="space-y-2">
                      {Object.entries(kevelForecast.result.total).map(([adId, metrics]) => (
                        <div key={adId} className="flex justify-between items-center p-2 border rounded">
                          <span className="text-sm text-muted-foreground">Anúncio {adId}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {metrics.impressions.toLocaleString()} impressões
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {metrics.uniqueUsers.toLocaleString()} usuários únicos
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : kevelForecast.status === 'running' || kevelForecast.status === 'enqueued' ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {kevelForecast.message || `Processando previsão... ${kevelForecast.progress || 0}%`}
                </p>
                {kevelForecast.progress && (
                  <Progress value={kevelForecast.progress} className="mt-2 max-w-md mx-auto" />
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {kevelForecast.message || 'Status da previsão não disponível'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="kevel">Kevel Analytics</TabsTrigger>
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

        <TabsContent value="kevel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise Kevel</CardTitle>
            </CardHeader>
            <CardContent>
              {kevelIntegrations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhuma integração Kevel configurada. Configure uma integração Kevel para ver previsões detalhadas.
                  </p>
                </div>
              ) : !kevelForecast ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Use os botões acima para gerar previsões Kevel baseadas em dados reais de tráfego.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Previsão Existente</h4>
                      <p className="text-sm text-muted-foreground">
                        Prevê o desempenho de anúncios atualmente em execução na sua rede.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Previsão Disponível</h4>
                      <p className="text-sm text-muted-foreground">
                        Mostra inventário disponível restante em um nível de prioridade específico.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      Os resultados da previsão Kevel são mostrados na seção acima quando concluídos.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Forecast;