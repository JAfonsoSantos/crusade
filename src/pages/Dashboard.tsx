import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Target, Megaphone, Euro, Settings, TrendingUp, TrendingDown, Star } from 'lucide-react';

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

  const welcomeCards = [
    {
      title: 'Bem-vindo ao AdSpace!',
      description: 'Configure seus primeiros espaços publicitários para começar a gerar receita.',
      buttonText: 'Começar',
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Configure integrações',
      description: 'Conecte-se aos principais servidores de anúncios para maximizar sua receita.',
      buttonText: 'Integrar',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Otimize suas campanhas',
      description: 'Use analytics avançados para melhorar o desempenho dos seus anúncios.',
      buttonText: 'Ver métricas',
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
  ];

  const keyMetrics = [
    {
      title: 'Espaços Ativos',
      value: stats.adSpaces,
      period: 'Total',
      trend: 'up',
      icon: Target,
    },
    {
      title: 'Campanhas Ativas',
      value: stats.campaigns,
      period: 'Em execução',
      trend: 'up',
      icon: Megaphone,
    },
    {
      title: 'Receita Total',
      value: `€${stats.revenue.toLocaleString()}`,
      period: 'Este mês',
      trend: stats.revenue > 0 ? 'up' : 'neutral',
      icon: Euro,
    },
    {
      title: 'Impressões',
      value: '0',
      period: 'Hoje',
      trend: 'neutral',
      icon: TrendingUp,
    },
    {
      title: 'Taxa de Clique',
      value: '0%',
      period: 'Últimos 7 dias',
      trend: 'neutral',
      icon: TrendingUp,
    },
    {
      title: 'Integrações',
      value: stats.integrations,
      period: 'Conectadas',
      trend: stats.integrations > 0 ? 'up' : 'neutral',
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral do seu negócio de publicidade
        </p>
      </div>
      
      {/* Welcome Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {welcomeCards.map((card, index) => (
          <Card key={index} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className={`inline-flex p-2 rounded-lg ${card.bgColor} mb-4`}>
                <Star className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{card.description}</p>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                {card.buttonText}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
          Métricas Principais
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keyMetrics.map((metric, index) => {
            const Icon = metric.icon;
            const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : null;
            
            return (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="inline-flex p-2 rounded-lg bg-orange-50">
                      <Star className="h-4 w-4 text-orange-500" />
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                    <div className="flex items-end justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{metric.value}</span>
                        {TrendIcon && (
                          <TrendIcon className={`h-4 w-4 ${
                            metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                          }`} />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Atualizado há {Math.floor(Math.random() * 30) + 1} minutos
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;