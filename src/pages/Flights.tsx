import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Calendar, BarChart3, Play, Pause, Edit } from 'lucide-react';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useLanguage } from '@/contexts/LanguageContext';

interface Flight {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: number;
  budget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  currency: string;
  campaigns: {
    id: string;
    name: string;
    company_id: string;
  };
}

interface GroupedFlights {
  [campaignName: string]: {
    campaignId: string;
    flights: Flight[];
  };
}

export default function Flights() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const { t } = useLanguage();

  useEffect(() => {
    fetchFlights();
  }, []);

  useEffect(() => {
    const filtered = flights.filter(flight =>
      flight.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.campaigns.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFlights(filtered);
  }, [searchTerm, flights]);

  const fetchFlights = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from('flights')
        .select(`
          id,
          name,
          start_date,
          end_date,
          status,
          priority,
          budget,
          spend,
          impressions,
          clicks,
          conversions,
          currency,
          campaigns!inner(id, name, company_id)
        `)
        .eq('campaigns.company_id', profile.company_id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setFlights(data || []);
    } catch (error) {
      console.error('Error fetching flights:', error);
      toast({
        title: t('common.error'),
        description: t('flights.error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`status.${status}`) || status;
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
  };

  const groupFlightsByCampaign = (flights: Flight[]): GroupedFlights => {
    return flights.reduce((acc, flight) => {
      const campaignName = flight.campaigns.name;
      if (!acc[campaignName]) {
        acc[campaignName] = {
          campaignId: flight.campaigns.id,
          flights: []
        };
      }
      acc[campaignName].flights.push(flight);
      return acc;
    }, {} as GroupedFlights);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('flights.title')}</h2>
          <p className="text-muted-foreground">{t('flights.loading')}</p>
        </div>
      </div>
    );
  }

  const groupedFlights = groupFlightsByCampaign(filteredFlights);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('flights.title')}</h2>
          <p className="text-muted-foreground">
            {t('flights.description')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('flights.total')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flights.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('flights.active')}</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flights.filter(f => f.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('flights.totalImpressions')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flights.reduce((sum, f) => sum + f.impressions, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('flights.totalSpend')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(flights.reduce((sum, f) => sum + f.spend, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('flights.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('flights.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flights by Campaign */}
      {Object.keys(groupedFlights).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            {flights.length === 0 
              ? t('flights.noFlights')
              : t('flights.noFilteredFlights')
            }
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFlights).map(([campaignName, { campaignId, flights }]) => (
            <Card key={campaignId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('flights.campaign')}: {campaignName}</span>
                  <Badge variant="outline">{flights.length} {t('flights.title').toLowerCase()}</Badge>
                </CardTitle>
                <CardDescription>
                  {t('flights.campaignFlights')} {campaignName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {flights.map((flight) => (
                    <div key={flight.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-lg">{flight.name}</h4>
                          <Badge className={getStatusColor(flight.status)}>
                            {getStatusLabel(flight.status)}
                          </Badge>
                          <Badge variant="outline">
                            {t('flights.priority')} {flight.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">{t('flights.period')}</p>
                          <p className="font-medium">
                            {new Date(flight.start_date).toLocaleDateString()} - {new Date(flight.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('flights.budget')}</p>
                          <p className="font-medium">
                            {flight.budget ? formatCurrency(flight.budget, flight.currency) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('flights.spend')}</p>
                          <p className="font-medium">
                            {formatCurrency(flight.spend, flight.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CTR</p>
                          <p className="font-medium">
                            {calculateCTR(flight.clicks, flight.impressions)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <p className="text-blue-600 font-medium">{flight.impressions.toLocaleString()}</p>
                          <p className="text-blue-500">{t('flights.impressions')}</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="text-green-600 font-medium">{flight.clicks.toLocaleString()}</p>
                          <p className="text-green-500">{t('flights.clicks')}</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <p className="text-purple-600 font-medium">{flight.conversions.toLocaleString()}</p>
                          <p className="text-purple-500">{t('flights.conversions')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}