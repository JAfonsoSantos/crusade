import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Settings, Trash2, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight, Eye, AlertCircle, CheckCircle, Info } from 'lucide-react';
import kevelLogo from '@/assets/kevel-logo.png';

interface Integration {
  id: string;
  name: string;
  provider: string;
  status: string;
  last_sync: string;
  created_at: string;
  configuration?: any;
}

interface SyncDetails {
  timestamp: string;
  synced: number;
  errors: number;
  operations: {
    campaigns?: { created: number; updated: number; existing: number; errors: string[] };
    ad_units?: { created: number; updated: number; existing: number; errors: string[] };
    sites?: { created: number; updated: number; existing: number; errors: string[] };
  };
}

const Integrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [syncHistory, setSyncHistory] = useState<{[key: string]: any[]}>({});
  const [expandedSyncHistory, setExpandedSyncHistory] = useState<{[key: string]: boolean}>({});
  const [expandedSyncDetails, setExpandedSyncDetails] = useState<{[key: string]: boolean}>({});
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
      setIntegrations((data || []) as Integration[]);
    }
    setLoading(false);
  };

  const fetchSyncHistory = async (integrationId: string) => {
    if (syncHistory[integrationId]) return; // Already loaded
    
    const { data, error } = await supabase
      .from('integration_sync_history')
      .select('*')
      .eq('integration_id', integrationId)
      .order('sync_timestamp', { ascending: false })
      .limit(10);

    if (!error && data) {
      setSyncHistory(prev => ({
        ...prev,
        [integrationId]: data
      }));
    }
  };

  const toggleSyncHistory = (integrationId: string) => {
    setExpandedSyncHistory(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }));
    
    if (!expandedSyncHistory[integrationId]) {
      fetchSyncHistory(integrationId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      case 'topsort':
        return 'Topsort';
      default:
        return provider;
    }
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
    if (!['kevel', 'koddi', 'topsort'].includes(integration.provider)) {
      toast({
        title: "Not Supported",
        description: "Sync is currently only supported for Kevel, Koddi, and Topsort integrations.",
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

      // Parse the detailed response
      const syncDetails: SyncDetails = {
        timestamp: new Date().toISOString(),
        synced: data.synced || 0,
        errors: data.errors || 0,
        operations: {
          campaigns: data.operations?.campaigns || { created: 0, updated: 0, existing: 0, errors: [] },
          ad_units: data.operations?.ad_units || { created: 0, updated: 0, existing: 0, errors: [] },
          sites: data.operations?.sites || { created: 0, updated: 0, existing: 0, errors: [] }
        }
      };

      // Update integration with sync details
      await supabase
        .from('ad_server_integrations')
        .update({ 
          configuration: { 
            ...integration.configuration,
            last_sync_details: syncDetails 
          } as any
        })
        .eq('id', integration.id);

      toast({
        title: "Sync Completed",
        description: `Successfully synced ${data.synced} items. ${data.errors > 0 ? `${data.errors} errors occurred.` : 'No errors.'}`,
        variant: data.errors > 0 ? "destructive" : "default",
      });
      
      // Refresh integrations to show updated details
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

  const toggleDetails = (integrationId: string) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(integrationId)) {
      newExpanded.delete(integrationId);
    } else {
      newExpanded.add(integrationId);
    }
    setExpandedDetails(newExpanded);
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
                    <SelectItem value="topsort">Topsort</SelectItem>
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

      <div className="grid gap-4 grid-cols-1">
        {integrations.map((integration) => (
          <Card key={integration.id} className="transition-all duration-300 w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                 <div>
                   <CardTitle className="text-lg">{integration.name}</CardTitle>
                   <CardDescription className="flex items-center gap-2">
                     {integration.provider === 'kevel' && (
                       <img src={kevelLogo} alt="Kevel" className="w-4 h-4" />
                     )}
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
                  {integration.configuration?.last_sync_details && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleDetails(integration.id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      See Details
                    </Button>
                  )}
                </div>

                {/* Sync Details Section */}
                {expandedDetails.has(integration.id) && integration.configuration?.last_sync_details && (
                  <div className="mt-4 border-t pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          Last Sync Details
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(integration.configuration.last_sync_details.timestamp)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Synced: {integration.configuration.last_sync_details.synced}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Errors: {integration.configuration.last_sync_details.errors}</span>
                        </div>
                      </div>

                      {/* Operations Details */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-sm text-muted-foreground">Operations by Category</h5>
                        <div className="grid gap-3">
                          {integration.configuration.last_sync_details.operations.campaigns && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-sm text-blue-900 dark:text-blue-100">Campaigns</span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm text-blue-800 dark:text-blue-200">
                                <span>Existing: {integration.configuration.last_sync_details.operations.campaigns.existing || 0}</span>
                                <span>Created: {integration.configuration.last_sync_details.operations.campaigns.created}</span>
                                <span>Updated: {integration.configuration.last_sync_details.operations.campaigns.updated}</span>
                              </div>
                              {integration.configuration.last_sync_details.operations.campaigns.errors.length > 0 && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</span>
                                  <ul className="text-sm text-red-600 dark:text-red-400 mt-1 space-y-1">
                                    {integration.configuration.last_sync_details.operations.campaigns.errors.map((error, idx) => (
                                      <li key={idx} className="text-xs">• {error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {integration.configuration.last_sync_details.operations.ad_units && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4 text-purple-600" />
                                <span className="font-medium text-sm text-purple-900 dark:text-purple-100">Ad Units</span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm text-purple-800 dark:text-purple-200">
                                <span>Existing: {integration.configuration.last_sync_details.operations.ad_units.existing || 0}</span>
                                <span>Created: {integration.configuration.last_sync_details.operations.ad_units.created}</span>
                                <span>Updated: {integration.configuration.last_sync_details.operations.ad_units.updated}</span>
                              </div>
                              {integration.configuration.last_sync_details.operations.ad_units.errors.length > 0 && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</span>
                                  <ul className="text-sm text-red-600 dark:text-red-400 mt-1 space-y-1">
                                    {integration.configuration.last_sync_details.operations.ad_units.errors.map((error, idx) => (
                                      <li key={idx} className="text-xs">• {error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {integration.configuration.last_sync_details.operations.sites && (
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4 text-orange-600" />
                                <span className="font-medium text-sm text-orange-900 dark:text-orange-100">Sites</span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm text-orange-800 dark:text-orange-200">
                                <span>Existing: {integration.configuration.last_sync_details.operations.sites.existing || 0}</span>
                                <span>Created: {integration.configuration.last_sync_details.operations.sites.created}</span>
                                <span>Updated: {integration.configuration.last_sync_details.operations.sites.updated}</span>
                              </div>
                              {integration.configuration.last_sync_details.operations.sites.errors.length > 0 && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</span>
                                  <ul className="text-sm text-red-600 dark:text-red-400 mt-1 space-y-1">
                                    {integration.configuration.last_sync_details.operations.sites.errors.map((error, idx) => (
                                      <li key={idx} className="text-xs">• {error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                         </div>
                       </div>

                       {/* Sync History Section */}
                       <div className="mt-6 pt-4 border-t">
                         <div className="flex items-center justify-between mb-3">
                           <h5 className="font-medium text-sm text-muted-foreground">Sync History</h5>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => toggleSyncHistory(integration.id)}
                             className="p-0 h-auto"
                           >
                             {expandedSyncHistory[integration.id] ? (
                               <ChevronDown className="h-4 w-4" />
                             ) : (
                               <ChevronRight className="h-4 w-4" />
                             )}
                           </Button>
                         </div>

                         {expandedSyncHistory[integration.id] && (
                           <div className="space-y-2">
                             {syncHistory[integration.id] ? (
                               syncHistory[integration.id].length > 0 ? (
                                 syncHistory[integration.id].map((sync) => (
                                   <div key={sync.id} className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-md border">
                                     <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                                         <div className={`w-2 h-2 rounded-full ${sync.status === 'completed' ? 'bg-green-500' : sync.status === 'completed_with_errors' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                         <span className="text-sm font-medium">
                                           {formatDate(sync.sync_timestamp)}
                                         </span>
                                         <span className="text-xs text-muted-foreground">
                                           {sync.synced_count} synced, {sync.errors_count} errors
                                         </span>
                                       </div>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => setExpandedSyncDetails(prev => ({
                                           ...prev,
                                           [sync.id]: !prev[sync.id]
                                         }))}
                                         className="p-0 h-auto"
                                       >
                                         {expandedSyncDetails[sync.id] ? (
                                           <ChevronDown className="h-3 w-3" />
                                         ) : (
                                           <ChevronRight className="h-3 w-3" />
                                         )}
                                       </Button>
                                     </div>
                                     
                                     {expandedSyncDetails[sync.id] && sync.operations && (
                                       <div className="mt-3 pt-3 border-t space-y-2">
                                         {sync.operations.campaigns && (
                                           <div className="text-xs text-blue-700 dark:text-blue-300">
                                             Campaigns: {sync.operations.campaigns.existing || 0} existing, {sync.operations.campaigns.created} created, {sync.operations.campaigns.updated} updated
                                           </div>
                                         )}
                                         {sync.operations.ad_units && (
                                           <div className="text-xs text-purple-700 dark:text-purple-300">
                                             Ad Units: {sync.operations.ad_units.existing || 0} existing, {sync.operations.ad_units.created} created, {sync.operations.ad_units.updated} updated
                                           </div>
                                         )}
                                         {sync.operations.sites && (
                                           <div className="text-xs text-orange-700 dark:text-orange-300">
                                             Sites: {sync.operations.sites.existing || 0} existing, {sync.operations.sites.created} created, {sync.operations.sites.updated} updated
                                           </div>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 ))
                               ) : (
                                 <p className="text-sm text-muted-foreground">No sync history available</p>
                               )
                             ) : (
                               <p className="text-sm text-muted-foreground">Loading history...</p>
                             )}
                           </div>
                         )}
                       </div>
                     </div>
                  </div>
                )}
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
              Set up integrations with ad servers to automatically sync data and manage campaigns.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Integration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integrations;