import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, Target, Megaphone, Settings, TrendingUp, Users, Building2 } from 'lucide-react';

const Index = () => {
  const [stats, setStats] = useState({
    spaces: 0,
    campaigns: 0,
    integrations: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Index component mounted, fetching stats...');
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get user's company
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setLoading(false);
        return;
      }

      if (!profile?.company_id) {
        console.log('No company associated with user');
        setLoading(false);
        return;
      }

      // Fetch statistics in parallel
      const [spacesResult, campaignsResult, integrationsResult] = await Promise.all([
        supabase.from('ad_spaces').select('id', { count: 'exact' }).eq('company_id', profile.company_id),
        supabase.from('campaigns').select('id', { count: 'exact' }).eq('company_id', profile.company_id),
        supabase.from('ad_server_integrations').select('id', { count: 'exact' }).eq('company_id', profile.company_id)
      ]);

      if (spacesResult.error) console.error('Spaces error:', spacesResult.error);
      if (campaignsResult.error) console.error('Campaigns error:', campaignsResult.error);
      if (integrationsResult.error) console.error('Integrations error:', integrationsResult.error);

      setStats({
        spaces: spacesResult.count || 0,
        campaigns: campaignsResult.count || 0,
        integrations: integrationsResult.count || 0,
        revenue: 0 // TODO: Calculate from real data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create Ad Space',
      description: 'Add new space for advertisements',
      icon: Target,
      action: () => navigate('/ad-spaces'),
      color: 'bg-blue-500'
    },
    {
      title: 'New Campaign',
      description: 'Create advertising campaign',
      icon: Megaphone,
      action: () => navigate('/campaigns'),
      color: 'bg-green-500'
    },
    {
      title: 'Add Integration',
      description: 'Connect ad server',
      icon: Settings,
      action: () => navigate('/integrations'),
      color: 'bg-purple-500'
    },
    {
      title: 'View Dashboard',
      description: 'Analytics and reports',
      icon: LayoutDashboard,
      action: () => navigate('/dashboard'),
      color: 'bg-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Loading data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your Crusade CRM control panel
        </p>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Spaces</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.spaces}</div>
            <p className="text-xs text-muted-foreground">
              Available advertising spaces
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.campaigns}</div>
            <p className="text-xs text-muted-foreground">
              Created campaigns
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.revenue}</div>
            <p className="text-xs text-muted-foreground">
              Total revenue this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.integrations}</div>
            <p className="text-xs text-muted-foreground">
              Connected platforms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={action.action}>
                <CardHeader>
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Getting Started */}
      {stats.integrations === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Configure your advertising management system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Configure Integrations</h4>
              <p className="text-sm text-muted-foreground">
                Connect platforms like Kevel, Koddi or Topsort to manage campaigns.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/integrations')}>
                Configure Integrations
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Create Ad Spaces</h4>
              <p className="text-sm text-muted-foreground">
                Define the spaces where ads will be displayed.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/spaces')}>
                Create Spaces
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">3. Launch Campaigns</h4>
              <p className="text-sm text-muted-foreground">
                Create and manage advertising campaigns through integrated platforms.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Index;
