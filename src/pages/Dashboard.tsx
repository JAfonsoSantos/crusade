import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Target, Megaphone, Euro, Settings } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    adSpaces: 0,
    campaigns: 0,
    revenue: 0,
    integrations: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: adSpaces } = await supabase.from('ad_spaces').select('id', { count: 'exact' });
      const { data: campaigns } = await supabase.from('campaigns').select('id', { count: 'exact' });
      const { data: integrations } = await supabase.from('ad_server_integrations').select('id', { count: 'exact' });
      
      setStats({
        adSpaces: adSpaces?.length || 0,
        campaigns: campaigns?.length || 0,
        revenue: 0, // Calculate from actual data later
        integrations: integrations?.length || 0,
      });
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Espaços Ativos',
      value: stats.adSpaces,
      description: 'Espaços publicitários disponíveis',
      icon: Target,
    },
    {
      title: 'Campanhas',
      value: stats.campaigns,
      description: 'Campanhas em execução',
      icon: Megaphone,
    },
    {
      title: 'Receita',
      value: `€${stats.revenue}`,
      description: 'Receita total este mês',
      icon: Euro,
    },
    {
      title: 'Integrações',
      value: stats.integrations,
      description: 'Servidores de anúncios conectados',
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral do seu negócio de publicidade
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas atualizações nos seus espaços e campanhas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Nenhuma atividade recente
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Comece criando espaços publicitários
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              Métricas de desempenho dos seus anúncios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Sem dados de performance
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Configure integrações para ver métricas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;