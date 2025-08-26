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
import { Plus, Settings, Trash2, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight, Eye, Pause, Play } from 'lucide-react';
import SyncDetailsModal from '@/components/SyncDetailsModal';
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
  integration_type: string | null;
  status: string;
  last_sync: string | null;
  created_at: string;
  configuration?: any;
}

interface SyncDetails {
  timestamp: string;
  synced: number;
  errors: number;
  operations: any;
}

const CRM_PROVIDERS = ['salesforce', 'hubspot', 'pipedrive', 'vtex'] as const;

const Integrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<{[key: string]: any[]}>({});
  const [expandedSyncHistory, setExpandedSyncHistory] = useState<{[key: string]: boolean}>({});
  const [expandedSyncDetails, setExpandedSyncDetails] = useState<{[key: string]: boolean}>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);
  const [syncDetailsModal, setSyncDetailsModal] = useState<{open: boolean; syncDetails: SyncDetails | null; integrationName: string;}>({ open: false, syncDetails: null, integrationName: '' });
  const [deleting, setDeleting] = useState(false);
  const [configFormData, setConfigFormData] = useState({ name: '', api_key: '' });
  const [formData, setFormData] = useState({ name: '', integration_type: 'ad_server' as 'ad_server' | 'crm', provider: 'kevel', api_key: '' });
  const { toast } = useToast();

  useEffect(() => { fetchIntegrations(); }, []);

  const fetchIntegrations = async () => {
    const { data, error } = await supabase.from('ad_server_integrations').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: "Error", description: "Could not load integrations.", variant: "destructive" });
    else setIntegrations((data || []) as Integration[]);
    setLoading(false);
  };

  const fetchSyncHistory = async (integrationId: string) => {
    if (syncHistory[integrationId]) return;
    const { data, error } = await supabase.from('integration_sync_history').select('*').eq('integration_id', integrationId).order('sync_timestamp', { ascending: false }).limit(10);
    if (!error && data) setSyncHistory(prev => ({ ...prev, [integrationId]: data }));
  };

  const toggleSyncHistory = (integrationId: string) => {
    setExpandedSyncHistory(prev => ({ ...prev, [integrationId]: !prev[integrationId] }));
    if (!expandedSyncHistory[integrationId]) fetchSyncHistory(integrationId);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    const dt = new Date(dateString);
    if (isNaN(dt.getTime())) return 'Never';
    return dt.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'kevel': return 'Kevel';
      case 'koddi': return 'Koddi';
      case 'topsort': return 'Topsort';
      case 'google_ad_manager': return 'Google Ad Manager';
      case 'criteo': return 'Criteo';
      case 'citrusad': return 'CitrusAd';
      case 'moloko': return 'Moloko';
      case 'salesforce': return 'Salesforce';
      case 'hubspot': return 'HubSpot';
      case 'pipedrive': return 'Pipedrive';
      case 'vtex': return 'VTEX';
      default: return provider;
    }
  };

  const getProviderLogo = (provider: string) => {
    switch (provider) {
      case 'kevel': return kevelLogo;
      case 'koddi': return koddiLogo;
      case 'topsort': return topsortLogo;
      case 'google_ad_manager': return googleLogo;
      case 'criteo': return criteoLogo;
      case 'citrusad': return citrusadLogo;
      case 'moloko': return molokoLogo;
      case 'salesforce': return salesforceLogo;
      case 'hubspot': return hubspotLogo;
      case 'pipedrive': return pipedriveLogo;
      case 'vtex': return vtexLogo;
      default: return null;
    }
  };

  const derivedType = (i: Integration) => {
    if ((CRM_PROVIDERS as readonly string[]).includes(i.provider)) return 'crm';
    return i.integration_type || 'ad_server';
  };

  const handleSync = async (integration: Integration) => {
    if (integration.status === 'paused') {
      toast({ title: "Cannot Sync", description: "This integration is paused. Resume it first to sync.", variant: "destructive" });
      return;
    }
    setSyncing(integration.id);
    try {
      let data: any, error: any;
      if ((CRM_PROVIDERS as readonly string[]).includes(integration.provider)) {
        if (integration.provider === 'salesforce') {
          const resp = await supabase.functions.invoke('sync-salesforce', { body: { integrationId: integration.id } });
          data = resp.data; error = resp.error;
        } else {
          const resp = await supabase.functions.invoke('crm-universal-sync', { body: { integrationId: integration.id, provider: integration.provider } });
          data = resp.data; error = resp.error;
        }
      } else {
        const resp = await supabase.functions.invoke('sync-kevel-inventory', { body: { integrationId: integration.id } });
        data = resp.data; error = resp.error;
      }
      if (error) throw error;
      const syncDetails: SyncDetails = { timestamp: new Date().toISOString(), synced: data?.synced || 0, errors: data?.errors || 0, operations: data?.operations || {} };
      await supabase.from('ad_server_integrations').update({ last_sync: new Date().toISOString(), configuration: { ...(integration.configuration || {}), last_sync_details: syncDetails } as any }).eq('id', integration.id);
      toast({ title: "Sync Completed", description: `Synced ${syncDetails.synced} items${syncDetails.errors ? `, ${syncDetails.errors} errors` : ''}.`, variant: syncDetails.errors ? "destructive" : "default" });
      fetchIntegrations();
    } catch (err: any) {
      console.error('Sync error:', err);
      toast({ title: "Sync Failed", description: err?.message || "Could not sync.", variant: "destructive" });
    } finally { setSyncing(null); }
  };

  if (loading) return <div>Loading...</div>;
  const adServerIntegrations = integrations.filter(i => derivedType(i) === 'ad_server');
  const crmIntegrations = integrations.filter(i => derivedType(i) === 'crm');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Integrations</h1>

      <div>
        <h2 className="text-xl font-semibold mb-4">Ad Server Integrations</h2>
        {adServerIntegrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  {getProviderLogo(integration.provider) && <img src={getProviderLogo(integration.provider)!} alt={getProviderName(integration.provider)} className="w-6 h-6" />}
                  <CardTitle>{integration.name}</CardTitle>
                </div>
                <Button onClick={() => handleSync(integration)} disabled={syncing === integration.id}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing === integration.id ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p>Last Sync: {formatDate(integration.last_sync)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">CRM Integrations</h2>
        {crmIntegrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  {getProviderLogo(integration.provider) && <img src={getProviderLogo(integration.provider)!} alt={getProviderName(integration.provider)} className="w-6 h-6" />}
                  <CardTitle>{integration.name}</CardTitle>
                </div>
                <Button onClick={() => handleSync(integration)} disabled={syncing === integration.id}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing === integration.id ? 'animate-spin' : ''}`} />
                  CRM Sync
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p>Last Sync: {formatDate(integration.last_sync)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {syncDetailsModal.syncDetails && (
        <SyncDetailsModal
          open={syncDetailsModal.open}
          onOpenChange={(open) => setSyncDetailsModal({ ...syncDetailsModal, open })}
          syncDetails={syncDetailsModal.syncDetails}
          integrationName={syncDetailsModal.integrationName}
        />
      )}
    </div>
  );
};

export default Integrations;
