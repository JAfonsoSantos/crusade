import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Settings, Trash2, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  provider: string;
  status: string;
  last_sync: string;
  created_at: string;
}

const Integrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'google_ad_manager',
    api_key: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    const { data, error } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Could not load integrations.",
        variant: "destructive",
      });
    } else {
      setIntegrations(data || []);
    }
    setLoading(false);
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

    const { error } = await supabase.from('ad_server_integrations').insert({
      name: formData.name,
      provider: formData.provider,
      api_key_encrypted: formData.api_key, // In production, this should be encrypted
      company_id: profile.company_id,
      status: 'active',
    });

    if (error) {
      toast({
        title: "Error",
        description: "Could not create integration.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Integration created successfully!",
      });
      setDialogOpen(false);
      setFormData({
        name: '',
        provider: 'google_ad_manager',
        api_key: '',
      });
      fetchIntegrations();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google_ad_manager':
        return 'Google Ad Manager';
      case 'amazon_publisher_services':
        return 'Amazon Publisher Services';
      case 'prebid':
        return 'Prebid.js';
      case 'openx':
        return 'OpenX';
      case 'kevel':
        return 'Kevel';
      case 'koddi':
        return 'Koddi';
      default:
        return provider;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigDialogOpen(true);
  };

  const handleUpdateApiKey = async (newApiKey: string) => {
    if (!selectedIntegration) return;

    const { error } = await supabase
      .from('ad_server_integrations')
      .update({ api_key_encrypted: newApiKey })
      .eq('id', selectedIntegration.id);

    if (error) {
      toast({
        title: "Error",
        description: "Could not update API key.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "API key updated successfully!",
      });
      setConfigDialogOpen(false);
      setSelectedIntegration(null);
      fetchIntegrations();
    }
  };

  const handleSync = async (integration: Integration) => {
    if (!['kevel', 'koddi'].includes(integration.provider)) {
      toast({
        title: "Not Supported",
        description: "Sync is currently only supported for Kevel and Koddi integrations.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(integration.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-kevel-inventory', {
        body: { integrationId: integration.id }
      });

      if (error) throw error;

      toast({
        title: "Sync Completed",
        description: data.message || `Synced ${data.synced} ad spaces successfully!`,
      });
      
      // Refresh integrations to show updated last_sync time
      fetchIntegrations();
      
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Could not sync with ad server.",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
          <p className="text-muted-foreground">
            Set up integrations with ad servers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Integration</DialogTitle>
              <DialogDescription>
                Set up a new integration with an ad server
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Integration Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Main Google Ad Manager"
                  required
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="provider">Provider</Label>
                <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_ad_manager">Google Ad Manager</SelectItem>
                    <SelectItem value="amazon_publisher_services">Amazon Publisher Services</SelectItem>
                    <SelectItem value="prebid">Prebid.js</SelectItem>
                    <SelectItem value="openx">OpenX</SelectItem>
                    <SelectItem value="kevel">Kevel</SelectItem>
                    <SelectItem value="koddi">Koddi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Enter your API key"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full">
                Create Integration
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Configure Integration Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Configure Integration</DialogTitle>
              <DialogDescription>
                Update API key for {selectedIntegration?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="new_api_key">New API Key</Label>
                <Input
                  id="new_api_key"
                  type="password"
                  placeholder="Enter your new API key"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      handleUpdateApiKey(target.value);
                    }
                  }}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => {
                  const input = document.getElementById('new_api_key') as HTMLInputElement;
                  handleUpdateApiKey(input.value);
                }}
              >
                Update API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{integration.name}</CardTitle>
                  <CardDescription>
                    {getProviderName(integration.provider)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {integration.status === 'active' ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  <Badge className={getStatusColor(integration.status)}>
                    {integration.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Last Sync:</strong><br />
                  {formatDate(integration.last_sync)}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSync(integration)}
                    disabled={syncing === integration.id}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing === integration.id ? 'animate-spin' : ''}`} />
                    {syncing === integration.id ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleConfigure(integration)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {integrations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No integrations</h3>
            <p className="text-muted-foreground text-center mb-4">
              Set up integrations with ad servers to automatically sync data.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              First Integration
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integrations;