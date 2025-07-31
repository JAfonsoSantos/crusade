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
      title: 'Welcome to AdSpace!',
      description: 'Set up your first ad spaces to start generating revenue.',
      buttonText: 'Get Started',
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Set up integrations',
      description: 'Connect to major ad servers to maximize your revenue.',
      buttonText: 'Integrate',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Optimize your campaigns',
      description: 'Use advanced analytics to improve your ad performance.',
      buttonText: 'View metrics',
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
  ];

  const keyMetrics = [
    {
      title: 'Active Spaces',
      value: stats.adSpaces,
      period: 'Total',
      trend: 'up',
      icon: Target,
    },
    {
      title: 'Active Campaigns',
      value: stats.campaigns,
      period: 'Running',
      trend: 'up',
      icon: Megaphone,
    },
    {
      title: 'Total Revenue',
      value: `€${stats.revenue.toLocaleString()}`,
      period: 'This month',
      trend: stats.revenue > 0 ? 'up' : 'neutral',
      icon: Euro,
    },
    {
      title: 'Impressions',
      value: '0',
      period: 'Today',
      trend: 'neutral',
      icon: TrendingUp,
    },
    {
      title: 'Click Rate',
      value: '0%',
      period: 'Last 7 days',
      trend: 'neutral',
      icon: TrendingUp,
    },
    {
      title: 'Integrations',
      value: stats.integrations,
      period: 'Connected',
      trend: stats.integrations > 0 ? 'up' : 'neutral',
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your advertising business
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
          Key Metrics
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
                      Updated {Math.floor(Math.random() * 30) + 1} minutes ago
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