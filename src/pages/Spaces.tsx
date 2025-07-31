import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Target, RefreshCw, Eye, MousePointer, TrendingUp, Activity, Clock } from 'lucide-react';

interface Space {
  id: string;
  name: string;
  type: string;
  size: string;
  location: string;
  base_price: number;
  currency: string;
  price_model: string;
  status: string;
  created_at: string;
  ad_server: string;
  external_id?: string;
  impressions: number;
  clicks: number;
  last_impression?: string;
  last_click?: string;
  usage_status: 'active' | 'past_used' | 'unused';
}

const Spaces = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshingUsage, setRefreshingUsage] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'banner',
    size: '',
    location: '',
    base_price: '',
    currency: 'EUR',
    price_model: 'cpm',
    ad_server: 'kevel',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    const { data, error } = await supabase
      .from('ad_spaces')
      .select('*')
      .order('usage_status', { ascending: false })
      .order('impressions', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Could not load spaces.",
        variant: "destructive",
      });
    } else {
      // Type assertion to handle the database response
      const typedSpaces: Space[] = (data || []).map(space => ({
        ...space,
        usage_status: space.usage_status as 'active' | 'past_used' | 'unused'
      }));
      setSpaces(typedSpaces);
    }
    setLoading(false);
  };

  const spacesByAdServer = useMemo(() => {
    const filtered = spaces.filter(space => 
      space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filtered.reduce((acc, space) => {
      if (!acc[space.ad_server]) {
        acc[space.ad_server] = {
          active: [],
          past_used: [],
          unused: []
        };
      }
      acc[space.ad_server][space.usage_status].push(space);
      return acc;
    }, {} as Record<string, { active: Space[], past_used: Space[], unused: Space[] }>);

    return grouped;
  }, [spaces, searchQuery]);

  const refreshUsageData = async (spaceId: string) => {
    setRefreshingUsage(prev => [...prev, spaceId]);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-space-usage', {
        body: { spaceId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Usage data updated successfully!",
      });
      
      // Refresh the spaces list
      fetchSpaces();
    } catch (error) {
      console.error('Error refreshing usage data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh usage data.",
        variant: "destructive",
      });
    } finally {
      setRefreshingUsage(prev => prev.filter(id => id !== spaceId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.company_id) {
      toast({
        title: "Error",
        description: "Company profile not found. Set up your company first.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('ad_spaces').insert({
      ...formData,
      base_price: parseFloat(formData.base_price),
      company_id: profile.company_id,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Could not create space.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Space created successfully!",
      });
      setDialogOpen(false);
      setFormData({
        name: '',
        type: 'banner',
        size: '',
        location: '',
        base_price: '',
        currency: 'EUR',
        price_model: 'cpm',
        ad_server: 'kevel',
      });
      fetchSpaces();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'past_used':
        return 'bg-yellow-100 text-yellow-800';
      case 'unused':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAdServerLogo = (server: string) => {
    switch (server) {
      case 'kevel':
        return '🎯';
      case 'google':
        return '🟦';
      case 'criteo':
        return '🟧';
      case 'koddi':
        return '🟩';
      default:
        return '📡';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const SpaceCard = ({ space }: { space: Space }) => (
    <Card className={`transition-all duration-200 hover:shadow-md ${space.usage_status === 'active' ? 'ring-2 ring-green-200' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {space.name}
              <Badge className={getUsageStatusColor(space.usage_status)}>
                {space.usage_status.replace('_', ' ')}
              </Badge>
            </CardTitle>
            <CardDescription>{space.type} • {space.size}</CardDescription>
          </div>
          <Badge className={getStatusColor(space.status)}>
            {space.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>Location:</strong> {space.location || 'Not specified'}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Price:</strong> {space.base_price} {space.currency} ({space.price_model.toUpperCase()})
          </p>
          
          {/* Usage Statistics */}
          {space.ad_server === 'kevel' && (space.impressions > 0 || space.clicks > 0) && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Activity className="w-4 h-4" />
                Usage Statistics
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span>{formatNumber(space.impressions)} impressions</span>
                </div>
                <div className="flex items-center gap-1">
                  <MousePointer className="w-3 h-3 text-green-600" />
                  <span>{formatNumber(space.clicks)} clicks</span>
                </div>
              </div>
              
              {space.last_impression && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last activity: {new Date(space.last_impression).toLocaleDateString()}
                </p>
              )}
              
              {space.clicks > 0 && space.impressions > 0 && (
                <p className="text-xs text-muted-foreground">
                  CTR: {((space.clicks / space.impressions) * 100).toFixed(2)}%
                </p>
              )}
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            {space.ad_server === 'kevel' && space.external_id && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshUsageData(space.id)}
                disabled={refreshingUsage.includes(space.id)}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshingUsage.includes(space.id) ? 'animate-spin' : ''}`} />
                Refresh Usage
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Spaces</h2>
          <p className="text-muted-foreground">
            Organized by ad server and usage status
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Space
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Space</DialogTitle>
              <DialogDescription>
                Add a new advertising space to your inventory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Homepage Banner"
                  required
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="native">Native</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="ad_server">Ad Server</Label>
                <Select value={formData.ad_server} onValueChange={(value) => setFormData({ ...formData, ad_server: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kevel">🎯 Kevel</SelectItem>
                    <SelectItem value="google">🟦 Google Ad Manager</SelectItem>
                    <SelectItem value="criteo">🟧 Criteo</SelectItem>
                    <SelectItem value="koddi">🟩 Koddi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="Ex: 728x90, 300x250"
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Top of page, Sidebar"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="price">Base Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Select value={formData.price_model} onValueChange={(value) => setFormData({ ...formData, price_model: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpm">CPM</SelectItem>
                      <SelectItem value="cpc">CPC</SelectItem>
                      <SelectItem value="cpa">CPA</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                Create Space
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="🔍 Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      {spaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No spaces</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by creating your first space to begin generating revenue.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Space
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(spacesByAdServer).map(([adServer, categories]) => (
            <div key={adServer} className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getAdServerLogo(adServer)}</span>
                <h3 className="text-2xl font-bold capitalize">{adServer}</h3>
                <Badge variant="secondary">
                  {categories.active.length + categories.past_used.length + categories.unused.length} spaces
                </Badge>
              </div>

              {/* Active Spaces */}
              {categories.active.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h4 className="text-lg font-semibold text-green-600">
                      Currently Used ({categories.active.length})
                    </h4>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.active.map((space) => (
                      <SpaceCard key={space.id} space={space} />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Used Spaces */}
              {categories.past_used.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <h4 className="text-lg font-semibold text-yellow-600">
                      Used in the Past ({categories.past_used.length})
                    </h4>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.past_used.map((space) => (
                      <SpaceCard key={space.id} space={space} />
                    ))}
                  </div>
                </div>
              )}

              {/* Unused Spaces */}
              {categories.unused.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-gray-400" />
                    <h4 className="text-lg font-semibold text-muted-foreground">
                      Unused ({categories.unused.length})
                    </h4>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-75">
                    {categories.unused.map((space) => (
                      <SpaceCard key={space.id} space={space} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Spaces;