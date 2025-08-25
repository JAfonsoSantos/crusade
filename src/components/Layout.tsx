import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { LayoutDashboard, Target, Megaphone, Settings, ChevronDown, User as UserIcon, Building2, LogOut, Users, TrendingUp, RefreshCw, Globe, Handshake, Palette, Contact, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

const Layout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session?.user && location.pathname !== '/auth') {
          navigate('/auth');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user && location.pathname !== '/auth') {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const pipelineItems = [
    { name: 'Deals', href: '/pipeline', icon: Handshake },
    { name: 'Advertisers', href: '/advertisers', icon: Building2 },
    { name: 'Brands', href: '/brands', icon: Palette },
    { name: 'Contacts', href: '/contacts', icon: Contact },
  ];

  const campaignItems = [
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
    { name: 'Flights', href: '/flights', icon: Target },
    { name: 'Spaces', href: '/spaces', icon: Target },
    { name: 'Creatives', href: '/creatives', icon: Image },
  ];

  const regularNavigation = [
    { name: 'Forecast', href: '/forecast', icon: TrendingUp },
  ];

  const isPipelineActive = pipelineItems.some(item => location.pathname === item.href);
  const isCampaignActive = campaignItems.some(item => location.pathname === item.href);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-lg font-semibold hover:text-foreground/80 transition-colors"
            >
              Crusade CRM
            </button>
          </div>
          
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {/* Pipeline Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center space-x-2 transition-colors hover:text-foreground/80',
                    isPipelineActive ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span>Pipeline</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-background border border-border shadow-lg z-50">
                {pipelineItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Campaigns Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center space-x-2 transition-colors hover:text-foreground/80',
                    isCampaignActive ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  <Megaphone className="h-4 w-4" />
                  <span>Campaigns</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-background border border-border shadow-lg z-50">
                {campaignItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Regular Navigation Items */}
            {regularNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    'flex items-center space-x-2 transition-colors hover:text-foreground/80',
                    isActive ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              title="Sync with Platforms"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              title="Demo Site"
              onClick={() => navigate('/demo-site')}
            >
              <Globe className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <span className="text-sm">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-lg">
                <DropdownMenuItem onClick={() => navigate('/personal-settings')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Personal Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/business-settings')}>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Business Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/integrations')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Integrations</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;