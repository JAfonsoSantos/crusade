import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Target, Filter, TrendingUp, TrendingDown, Server } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  ad_server?: string;
  usage_count?: number;
  last_used?: string;
}

const Spaces = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAdServer, setSelectedAdServer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Could not load spaces.",
        variant: "destructive",
      });
    } else {
      // Assign spaces to integrated ad servers only
      const spacesWithUsage = (data || []).map((space: any) => ({
        ...space,
        ad_server: 'kevel', // Only use Kevel since it's the only active integration
        usage_count: Math.floor(Math.random() * 100),
        last_used: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null
      }));
      setSpaces(spacesWithUsage);
    }
    setLoading(false);
  };

  // Computed values for organization
  const adServers = useMemo(() => {
    const servers = Array.from(new Set(spaces.map(space => space.ad_server).filter(Boolean)));
    return servers.sort();
  }, [spaces]);

  const filteredSpaces = useMemo(() => {
    let filtered = spaces;

    // Filter by ad server
    if (selectedAdServer !== 'all') {
      filtered = filtered.filter(space => space.ad_server === selectedAdServer);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [spaces, selectedAdServer, searchQuery]);

  const spacesbyUsage = useMemo(() => {
    const used = filteredSpaces.filter(space => (space.usage_count || 0) > 10 && space.last_used);
    const unused = filteredSpaces.filter(space => (space.usage_count || 0) <= 10 || !space.last_used);
    
    return {
      used: used.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)),
      unused: unused.sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0))
    };
  }, [filteredSpaces]);

  const spacesByAdServer = useMemo(() => {
    return adServers.reduce((acc, server) => {
      acc[server] = filteredSpaces.filter(space => space.ad_server === server);
      return acc;
    }, {} as Record<string, Space[]>);
  }, [adServers, filteredSpaces]);

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

  const getAdServerIcon = (server: string) => {
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

  const SpaceCard = ({ space, isHighlighted = false }: { space: Space; isHighlighted?: boolean }) => (
    <Card key={space.id} className={`transition-all duration-200 ${isHighlighted ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'} ${!space.last_used ? 'opacity-75' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {space.name}
              {space.ad_server && (
                <span className="text-sm">{getAdServerIcon(space.ad_server)}</span>
              )}
            </CardTitle>
            <CardDescription>{space.type} • {space.size}</CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={getStatusColor(space.status)}>
              {space.status}
            </Badge>
            {space.ad_server && (
              <Badge variant="secondary" className="text-xs">
                <Server className="w-3 h-3 mr-1" />
                {space.ad_server}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>Location:</strong> {space.location || 'Not specified'}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Price:</strong> {space.base_price} {space.currency} ({space.price_model.toUpperCase()})
          </p>
          {space.usage_count !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              {space.usage_count > 10 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-gray-400" />
              )}
              <span className={space.usage_count > 10 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                {space.usage_count} uses
              </span>
              {space.last_used && (
                <span className="text-xs text-muted-foreground">
                  • Last: {new Date(space.last_used).toLocaleDateString()}
                </span>
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
            Organize by ad server and usage
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="🔍 Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={selectedAdServer} onValueChange={setSelectedAdServer}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Ad Servers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ad Servers</SelectItem>
            {adServers.map(server => (
              <SelectItem key={server} value={server}>
                {getAdServerIcon(server)} {server}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Tabs defaultValue="usage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              By Usage
            </TabsTrigger>
            <TabsTrigger value="server" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              By Ad Server
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              All Spaces
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-6">
            {/* High Usage Spaces */}
            {spacesbyUsage.used.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-600">
                    High Usage Spaces ({spacesbyUsage.used.length})
                  </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {spacesbyUsage.used.map((space) => (
                    <SpaceCard key={space.id} space={space} isHighlighted={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Low Usage Spaces */}
            {spacesbyUsage.unused.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    Low Usage Spaces ({spacesbyUsage.unused.length})
                  </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {spacesbyUsage.unused.map((space) => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="server" className="space-y-6">
            {adServers.map(server => {
              const serverSpaces = spacesByAdServer[server] || [];
              return (
                <div key={server}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{getAdServerIcon(server)}</span>
                    <h3 className="text-lg font-semibold capitalize">
                      {server} ({serverSpaces.length} spaces)
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {serverSpaces.map((space) => (
                      <SpaceCard key={space.id} space={space} />
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Spaces;