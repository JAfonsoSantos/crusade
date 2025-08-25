import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Settings, Trash2, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight, Eye, AlertCircle, CheckCircle, Info, Pause, Play } from 'lucide-react';
import kevelLogo from '@/assets/kevel-logo.png';
import koddiLogo from '@/assets/koddi-logo.png';
import topsortLogo from '@/assets/topsort-logo.png';
import googleLogo from '@/assets/google-logo.png';
import criteoLogo from '@/assets/criteo-logo.png';
import citrusadLogo from '@/assets/citrusad-logo.png';
import molokoLogo from '@/assets/moloko-logo.png';
import salesforceLogo from '@/assets/salesforce-logo.png';
import hubspotLogo from '@/assets/hubspot-logo.png';
import pipedriveLogo from '@/assets/pipedrive-logo.png';
import vtexLogo from '@/assets/vtex-logo.png';

interface Integration {
  id: string;
  name: string;
  provider: string;
  integration_type: string;
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [syncHistory, setSyncHistory] = useState<{[key: string]: any[]}>({});
  const [expandedSyncHistory, setExpandedSyncHistory] = useState<{[key: string]: boolean}>({});
  const [expandedSyncDetails, setExpandedSyncDetails] = useState<{[key: string]: boolean}>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [configFormData, setConfigFormData] = useState({
    name: '',
    api_key: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    integration_type: 'ad_server',
    provider: 'kevel',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
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
      // Ad Servers
      case 'kevel':
        return 'Kevel';
      case 'koddi':
        return 'Koddi';
      case 'topsort':
        return 'Topsort';
      case 'google_ad_manager':
        return 'Google Ad Manager';
      case 'criteo':
        return 'Criteo';
      case 'citrusad':
        return 'CitrusAd';
      case 'moloko':
        return 'Moloko';
      case 'amazon_publisher_services':
        return 'Amazon Publisher Services';
      case 'prebid':
        return 'Prebid.js';
      case 'openx':
        return 'OpenX';
      // CRMs
      case 'salesforce':
        return 'Salesforce';
      case 'hubspot':
        return 'HubSpot';
      case 'pipedrive':
        return 'Pipedrive';
      case 'vtex':
        return 'VTEX';
      default:
        return provider;
    }
  };

  const getProviderLogo = (provider: string) => {
    switch (provider) {
      // Ad Servers
      case 'kevel':
        return kevelLogo;
      case 'koddi':
        return koddiLogo;
      case 'topsort':
        return topsortLogo;
      case 'google_ad_manager':
        return googleLogo;
      case 'criteo':
        return criteoLogo;
      case 'citrusad':
        return citrusadLogo;
      case 'moloko':
        return molokoLogo;
      // CRMs
      case 'salesforce':
        return salesforceLogo;
      case 'hubspot':
        return hubspotLogo;
      case 'pipedrive':
        return pipedriveLogo;
      case 'vtex':
        return vtexLogo;
      default:
        return null;
    }
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigFormData({
      name: integration.name,
      api_key: ''
    });
    setConfigDialogOpen(true);
  };

  const handleUpdateIntegration = async () => {
    if (!selectedIntegration) return;

    const updateData: any = {};
    
    if (configFormData.name && configFormData.name !== selectedIntegration.name) {
      updateData.name = configFormData.name;
    }
    
    if (configFormData.api_key) {
      updateData.api_key_encrypted = configFormData.api_key;
    }

    if (Object.keys(updateData).length === 0) {
      toast({
        title: "No changes",
        description: "No changes were made.",
        variant: "default",
      });
      setConfigDialogOpen(false);
      return;
    }

    const { error } = await supabase
      .from('ad_server_integrations')
      .update(updateData)
      .eq('id', selectedIntegration.id);

    if (error) {
      toast({
        title: "Error",
        description: "Could not update integration.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Integration updated successfully!",
      });
      setConfigDialogOpen(false);
      setSelectedIntegration(null);
      setConfigFormData({ name: '', api_key: '' });
      fetchIntegrations();
    }
  };

  const handlePauseIntegration = async (integration: Integration) => {
    const { error } = await supabase
      .from('ad_server_integrations')
      .update({ status: 'paused' })
      .eq('id', integration.id);

    if (error) {
      toast({
        title: "Error",
        description: "Could not pause integration.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Integration paused successfully!",
      });
      fetchIntegrations();
    }
  };

  const handleResumeIntegration = async (integration: Integration) => {
    const { error } = await supabase
      .from('ad_server_integrations')
      .update({ status: 'active' })
      .eq('id', integration.id);

    if (error) {
      toast({
        title: "Error",
        description: "Could not resume integration.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Integration resumed successfully!",
      });
      fetchIntegrations();
    }
  };

  const handleSync = async (integration: Integration) => {
    if (integration.status === 'paused') {
      toast({
        title: "Cannot Sync",
        description: "This integration is paused. Resume it first to sync.",
        variant: "destructive",
      });
      return;
    }
    
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
      integration_type: formData.integration_type,
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
      setShowCreateDialog(false);
      setFormData({
        name: '',
        integration_type: 'ad_server',
        provider: 'kevel',
        api_key: '',
      });
      fetchIntegrations();
    }
  };

  const confirmDeleteIntegration = async () => {
    if (!integrationToDelete) return;

    setDeleting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-integration', {
        body: { integrationId: integrationToDelete.id }
      });

      if (error) throw error;

      toast({
        title: "Integration Deleted",
        description: `"${integrationToDelete.name}" and all related data have been removed from your Crusade account.`,
      });
      
      setDeleteDialogOpen(false);
      setIntegrationToDelete(null);
      fetchIntegrations();
      
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Could not delete integration.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteIntegration = (integration: Integration) => {
    setIntegrationToDelete(integration);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Integration
            </Button>
          </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>New Integration</DialogTitle>
                <DialogDescription>
                  Set up a new integration with an ad server or CRM system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="name">Integration Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Main Salesforce CRM"
                    required
                  />
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label>Integration Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.integration_type === 'ad_server' ? 'default' : 'outline'}
                      onClick={() => {
                        console.log('Setting to ad_server');
                        setFormData(prev => ({ 
                          ...prev, 
                          integration_type: 'ad_server', 
                          provider: 'kevel' 
                        }));
                      }}
                      className="flex-1"
                    >
                      Ad Server
                    </Button>
                    <Button
                      type="button"
                      variant={formData.integration_type === 'crm' ? 'default' : 'outline'}
                      onClick={() => {
                        console.log('Setting to crm');
                        setFormData(prev => ({ 
                          ...prev, 
                          integration_type: 'crm', 
                          provider: 'salesforce' 
                        }));
                      }}
                      className="flex-1"
                    >
                      CRM
                    </Button>
                  </div>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="provider">Provider</Label>
                  <Select 
                    key={`${formData.integration_type}-${formData.provider}`}
                    value={formData.provider} 
                    onValueChange={(value) => {
                      console.log('Provider changed to:', value);
                      setFormData(prev => ({ ...prev, provider: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.integration_type === 'ad_server' ? (
                        <>
                          <SelectItem value="kevel">Kevel</SelectItem>
                          <SelectItem value="koddi">Koddi</SelectItem>
                          <SelectItem value="topsort">Topsort</SelectItem>
                          <SelectItem value="google_ad_manager">Google Ad Manager</SelectItem>
                          <SelectItem value="criteo">Criteo</SelectItem>
                          <SelectItem value="citrusad">CitrusAd</SelectItem>
                          <SelectItem value="moloko">Moloko</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="salesforce">Salesforce</SelectItem>
                          <SelectItem value="hubspot">HubSpot</SelectItem>
                          <SelectItem value="pipedrive">Pipedrive</SelectItem>
                          <SelectItem value="vtex">VTEX</SelectItem>
                        </>
                      )}
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
      </div>

      {/* Configure Integration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configure Integration</DialogTitle>
            <DialogDescription>
              Update settings for {selectedIntegration?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="integration_name">Integration Name</Label>
              <Input
                id="integration_name"
                value={configFormData.name}
                onChange={(e) => setConfigFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter integration name"
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="new_api_key">New API Key (optional)</Label>
              <Input
                id="new_api_key"
                type="password"
                value={configFormData.api_key}
                onChange={(e) => setConfigFormData(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="Enter new API key (leave empty to keep current)"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleUpdateIntegration}
            >
              Update Integration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Integration Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete "{integrationToDelete?.name}"?
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">This action will permanently remove from your Crusade account:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>All campaigns created through this integration</li>
                      <li>All ad units and platform mappings</li>
                      <li>Complete sync history and configuration</li>
                      <li>Any related data specific to this ad server</li>
                    </ul>
                    <p className="font-medium mt-2 text-xs">
                      ⚠️ This will NOT affect your data on the ad server itself.
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteIntegration}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Integration'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6">
        {/* Group integrations by type */}
        {['ad_server', 'crm'].map(type => {
          const typeIntegrations = integrations.filter(i => i.integration_type === type);
          if (typeIntegrations.length === 0) return null;
          
          return (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {type === 'ad_server' ? 'Ad Servers' : 'CRM Systems'}
                </h2>
                <Badge variant="outline" className="text-xs">
                  {typeIntegrations.length} {typeIntegrations.length === 1 ? 'integration' : 'integrations'}
                </Badge>
              </div>
              <div className="grid gap-4">
                {typeIntegrations.map((integration) => (
                  <Card key={integration.id} className="transition-all duration-300 w-full">
                    <CardHeader>
                       <div className="flex justify-between items-start">
                         <div>
                           <div className="flex items-center gap-2">
                             <CardTitle className="text-lg">{integration.name}</CardTitle>
                             <Badge variant="secondary" className="text-xs">
                               {integration.integration_type === 'ad_server' ? 'Ad Server' : 'CRM'}
                             </Badge>
                           </div>
                           <CardDescription className="flex items-center gap-2">
                             {getProviderLogo(integration.provider) && (
                               <img src={getProviderLogo(integration.provider)} alt={getProviderName(integration.provider)} className="w-4 h-4" />
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
                           
                           {/* Action buttons on the right */}
                           <div className="flex items-center gap-1 ml-2">
                             <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleConfigure(integration)}>
                               <Settings className="h-4 w-4" />
                             </Button>
                             
                             {integration.status === 'active' && (
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                     <Pause className="h-4 w-4" />
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Pause Integration</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       Are you sure you want to pause "{integration.name}"? This will stop all sync operations until resumed.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                                     <AlertDialogAction onClick={() => handlePauseIntegration(integration)}>
                                       Pause Integration
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             )}
                             
                             {integration.status === 'paused' && (
                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleResumeIntegration(integration)}>
                                 <Play className="h-4 w-4" />
                               </Button>
                             )}
                             
                             <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteIntegration(integration)}>
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
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
                           {integration.integration_type === 'ad_server' && (
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => handleSync(integration)}
                               disabled={syncing === integration.id || integration.status === 'paused'}
                             >
                               <RefreshCw className={`mr-2 h-4 w-4 ${syncing === integration.id ? 'animate-spin' : ''}`} />
                               {syncing === integration.id ? 'Syncing...' : 
                                integration.status === 'paused' ? 'Paused' : 'Sync Now'}
                             </Button>
                           )}
                           {integration.integration_type === 'crm' && (
                             <Button 
                               variant="outline" 
                               size="sm" 
                               disabled
                             >
                               <RefreshCw className="mr-2 h-4 w-4" />
                               CRM Sync (Coming Soon)
                             </Button>
                           )}
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

                        {/* ... rest of the card content remains the same ... */}
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

                              {/* ... rest of sync details remain the same ... */}
                            </div>
                          </div>
                        )}

                        {/* Sync History Section */}
                        <Collapsible 
                          open={expandedSyncHistory[integration.id]} 
                          onOpenChange={() => toggleSyncHistory(integration.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full mt-2">
                              {expandedSyncHistory[integration.id] ? (
                                <ChevronDown className="mr-2 h-4 w-4" />
                              ) : (
                                <ChevronRight className="mr-2 h-4 w-4" />
                              )}
                              Sync History
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2 mt-2">
                            <div className="border rounded-md p-3 bg-muted/30">
                              {syncHistory[integration.id] ? (
                                syncHistory[integration.id].length > 0 ? (
                                  syncHistory[integration.id].map((sync, idx) => (
                                    <div key={idx} className="py-2 border-b last:border-b-0">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium">
                                          {formatDate(sync.sync_timestamp)}
                                        </span>
                                        <div className="flex gap-2">
                                          <Badge variant={sync.errors_count > 0 ? "destructive" : "secondary"} className="text-xs">
                                            {sync.synced_count} synced, {sync.errors_count} errors
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => setExpandedSyncDetails(prev => ({
                                              ...prev,
                                              [`${integration.id}-${idx}`]: !prev[`${integration.id}-${idx}`]
                                            }))}
                                          >
                                            {expandedSyncDetails[`${integration.id}-${idx}`] ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                      {expandedSyncDetails[`${integration.id}-${idx}`] && sync.operations && (
                                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                          {sync.operations.campaigns && (
                                            <div>
                                              Campaigns: {sync.operations.campaigns.existing || 0} existing, {sync.operations.campaigns.created} created, {sync.operations.campaigns.updated} updated
                                            </div>
                                          )}
                                          {sync.operations.ad_units && (
                                            <div>
                                              Ad Units: {sync.operations.ad_units.existing || 0} existing, {sync.operations.ad_units.created} created, {sync.operations.ad_units.updated} updated
                                            </div>
                                          )}
                                          {sync.operations.sites && (
                                            <div>
                                              Ad Spaces: {sync.operations.sites.existing || 0} existing, {sync.operations.sites.created} created, {sync.operations.sites.updated} updated
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
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {integrations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No integrations</h3>
            <p className="text-muted-foreground text-center mb-4">
              Set up integrations with ad servers and CRM systems to automatically sync data and manage campaigns.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateDialog(true)}>
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