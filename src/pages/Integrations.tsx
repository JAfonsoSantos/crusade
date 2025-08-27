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

/** FIX version + enhancements: summaries per entity and history drill-down */
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

interface SyncDetailsShape {
  timestamp: string;
  synced: number;
  errors: number;
  operations: Record<string, any>;
}

async function callEdgeFunction(fn: string, body: any) {
  try {
    const resp = await supabase.functions.invoke(fn, { body });
    if ((resp as any)?.error?.name === 'FunctionsFetchError') throw (resp as any).error;
    return resp as any;
  } catch {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL || (window as any).__SUPABASE_URL__;
    const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (window as any).__SUPABASE_ANON_KEY__;
    const session = await supabase.auth.getSession();
    const access = session.data.session?.access_token;
    const r = await fetch(`${url}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anon ? { apikey: anon } : {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json: any; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!r.ok) return { data: null, error: new Error(json?.error || JSON.stringify(json)) };
    return { data: json, error: null };
  }
}

const CRM_SET = new Set(['salesforce', 'hubspot', 'pipedrive', 'vtex']);

/** Compact summary for last_sync_details.operations */
function summarizeOps(ops?: any): string[] {
  if (!ops || typeof ops !== "object") return [];
  return Object.entries(ops).map(([entity, bucket]: any) => {
    const parts: string[] = [];
    if (bucket.created) parts.push(`${bucket.created} created`);
    if (bucket.updated) parts.push(`${bucket.updated} updated`);
    if (bucket.deleted) parts.push(`${bucket.deleted} deleted`);
    if (bucket.upserted) parts.push(`${bucket.upserted} upserted`);
    if (bucket.fetched || bucket.existing) parts.push(`${bucket.fetched||bucket.existing} fetched`);
    if (bucket.errors && (Array.isArray(bucket.errors) ? bucket.errors.length : bucket.errors > 0))
      parts.push(`${Array.isArray(bucket.errors)?bucket.errors.length:bucket.errors} errors`);
    return `${entity}: ${parts.join(", ")}`;
  });
}

function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<{[key: string]: any[]}>({});
  const [expandedSyncHistory, setExpandedSyncHistory] = useState<{[key: string]: boolean}>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);
  const [syncDetailsModal, setSyncDetailsModal] = useState<{ open: boolean; syncDetails: SyncDetailsShape | null; integrationName: string; }>({ open: false, syncDetails: null, integrationName: '' });
  const [deleting, setDeleting] = useState(false);
  const [configFormData, setConfigFormData] = useState({ name: '', api_key: '' });
  const [formData, setFormData] = useState({ name: '', integration_type: 'ad_server' as 'ad_server' | 'crm', provider: 'kevel', api_key: '' });
  const { toast } = useToast();

  useEffect(() => { fetchIntegrations(); }, []);

  async function fetchIntegrations() {
    const { data, error } = await supabase.from('ad_server_integrations').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: 'Could not load integrations.', variant: 'destructive' });
    else setIntegrations((data || []) as Integration[]);
    setLoading(false);
  }

  async function fetchSyncHistory(integrationId: string) {
    if (syncHistory[integrationId]) return;
    const { data } = await supabase
      .from('integration_sync_history')
      .select('*')
      .eq('integration_id', integrationId)
      .order('sync_timestamp', { ascending: false })
      .limit(10);
    if (data) setSyncHistory(prev => ({ ...prev, [integrationId]: data }));
  }

  function toggleSyncHistory(integrationId: string) {
    setExpandedSyncHistory(prev => ({ ...prev, [integrationId]: !prev[integrationId] }));
    if (!expandedSyncHistory[integrationId]) fetchSyncHistory(integrationId);
  }

  function formatDate(dateString?: string | null) {
    if (!dateString) return 'Never';
    const dt = new Date(dateString);
    if (isNaN(dt.getTime())) return 'Never';
    return dt.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getProviderName(provider: string) {
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
  }

  function getProviderLogo(provider: string) {
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
  }

  const derivedType = (i: Integration) => (CRM_SET.has(i.provider) ? 'crm' : (i.integration_type || 'ad_server'));

  async function handleSync(integration: Integration) {
    if (integration.status === 'paused') {
      toast({ title: 'Cannot Sync', description: 'This integration is paused. Resume it first to sync.', variant: 'destructive' });
      return;
    }
    setSyncing(integration.id);
    try {
      let data: any, error: any;
      if (derivedType(integration) === 'crm') {
        if (integration.provider === 'salesforce') {
          const resp = await callEdgeFunction('sync-salesforce', { integrationId: integration.id });
          data = resp.data; error = resp.error;
        } else {
          const resp = await callEdgeFunction('crm-universal-sync', { integrationId: integration.id, provider: integration.provider });
          data = resp.data; error = resp.error;
        }
      } else {
        const resp = await callEdgeFunction('sync-kevel-inventory', { integrationId: integration.id });
        data = resp.data; error = resp.error;
      }
      if (error) throw error;

      const syncDetails: SyncDetailsShape = {
        timestamp: new Date().toISOString(),
        synced: data?.synced || 0,
        errors: data?.errors || 0,
        operations: data?.operations || {}
      };
      await supabase.from('ad_server_integrations').update({
        last_sync: new Date().toISOString(),
        configuration: { ...(integration.configuration || {}), last_sync_details: syncDetails } as any
      }).eq('id', integration.id);
      toast({ title: 'Sync Completed', description: `Synced ${syncDetails.synced} items${syncDetails.errors ? `, ${syncDetails.errors} errors` : ''}.`, variant: syncDetails.errors ? 'destructive' : 'default' });
      fetchIntegrations();
    } catch (err: any) {
      toast({ title: 'Sync Failed', description: err?.message || 'Could not sync.', variant: 'destructive' });
    } finally { setSyncing(null); }
  }

  function handleConfigure(integration: Integration) {
    setSelectedIntegration(integration);
    setConfigFormData({ name: integration.name, api_key: '' });
    setConfigDialogOpen(true);
  }

  async function handleUpdateIntegration() {
    if (!selectedIntegration) return;
    const updateData: any = {};
    if (configFormData.name && configFormData.name !== selectedIntegration.name) updateData.name = configFormData.name;
    if (configFormData.api_key) updateData.api_key_encrypted = configFormData.api_key;
    if (Object.keys(updateData).length === 0) { setConfigDialogOpen(false); return; }
    const { error } = await supabase.from('ad_server_integrations').update(updateData).eq('id', selectedIntegration.id);
    if (error) toast({ title: 'Error', description: 'Could not update integration.', variant: 'destructive' });
    else { setConfigDialogOpen(false); setSelectedIntegration(null); setConfigFormData({ name: '', api_key: '' }); fetchIntegrations(); }
  }

  /** HOISTED declaration — fixes "not defined" */
  async function handleCreateIntegration() {
    const { data: profile, error: pErr } = await supabase.from('profiles').select('company_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single();
    if (pErr || !profile?.company_id) { toast({ title: 'Error', description: 'Could not find company for user.', variant: 'destructive' }); return; }
    const { error } = await supabase.from('ad_server_integrations').insert([{
      name: formData.name,
      provider: formData.provider,
      integration_type: formData.integration_type,
      api_key_encrypted: formData.api_key,
      status: 'inactive',
      company_id: profile.company_id
    }]);
    if (error) { toast({ title: 'Error', description: 'Could not create integration.', variant: 'destructive' }); }
    else { setShowCreateDialog(false); setFormData({ name: '', integration_type: 'ad_server', provider: 'kevel', api_key: '' }); fetchIntegrations(); }
  }

  async function handlePauseIntegration(integration: Integration) {
    const { error } = await supabase.from('ad_server_integrations').update({ status: 'paused' }).eq('id', integration.id);
    if (!error) fetchIntegrations();
  }
  async function handleResumeIntegration(integration: Integration) {
    const { error } = await supabase.from('ad_server_integrations').update({ status: 'active' }).eq('id', integration.id);
    if (!error) fetchIntegrations();
  }

  async function handleDeleteIntegration() {
    if (!integrationToDelete) return;
    setDeleting(true);
    try {
      const resp = await callEdgeFunction('delete-integration', { integrationId: integrationToDelete.id });
      if (resp.error) throw resp.error;
      setDeleteDialogOpen(false);
      setIntegrationToDelete(null);
      fetchIntegrations();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Could not delete integration.', variant: 'destructive' });
    } finally { setDeleting(false); }
  }

  function openSyncDetails(integration: Integration) {
    const syncDetails = integration.configuration?.last_sync_details;
    if (syncDetails) setSyncDetailsModal({ open: true, syncDetails, integrationName: integration.name });
  }

  if (loading) return <div>Loading...</div>;

  const adServerIntegrations = integrations.filter(i => derivedType(i) === 'ad_server');
  const crmIntegrations = integrations.filter(i => derivedType(i) === 'crm');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Integration</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Integration</DialogTitle>
              <DialogDescription>Connect your ad server or CRM to sync data automatically.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label htmlFor="name">Name</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="My Integration" /></div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.integration_type} onValueChange={(value) => setFormData({ ...formData, integration_type: value as 'ad_server' | 'crm' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ad_server">Ad Server</SelectItem><SelectItem value="crm">CRM</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div><Label htmlFor="api_key">API Key</Label><Input id="api_key" type="password" value={formData.api_key} onChange={(e) => setFormData({ ...formData, api_key: e.target.value })} placeholder="Enter API key (optional)" /></div>
              <div className="flex gap-2"><Button onClick={handleCreateIntegration} className="flex-1">Create Integration</Button><Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">Cancel</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ad Server Integrations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ad Server Integrations</h2>
        {adServerIntegrations.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No ad server integrations configured yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {adServerIntegrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getProviderLogo(integration.provider) && (<img src={getProviderLogo(integration.provider)!} alt={getProviderName(integration.provider)} className="w-8 h-8 object-contain" />)}
                      <div><CardTitle className="text-lg">{integration.name}</CardTitle><CardDescription>{getProviderName(integration.provider)}</CardDescription></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(integration.status)}>
                        {integration.status === 'active' && <Wifi className="w-3 h-3 mr-1" />}
                        {integration.status === 'inactive' && <WifiOff className="w-3 h-3 mr-1" />}
                        {integration.status === 'paused' && <Pause className="w-3 h-3 mr-1" />}
                        {integration.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSync(integration)} disabled={syncing === integration.id}><RefreshCw className={`w-4 h-4 ${syncing === integration.id ? 'animate-spin' : ''}`} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleConfigure(integration)}><Settings className="w-4 h-4" /></Button>
                        {integration.status === 'paused' ? (<Button variant="ghost" size="sm" onClick={() => handleResumeIntegration(integration)}><Play className="w-4 h-4" /></Button>) : (<Button variant="ghost" size="sm" onClick={() => handlePauseIntegration(integration)}><Pause className="w-4 h-4" /></Button>)}
                        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" onClick={() => setIntegrationToDelete(integration)}><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Integration</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this integration? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteIntegration} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Last Sync:</span><span>{formatDate(integration.last_sync)}</span></div>
                    {integration.configuration?.last_sync_details && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Sync Details:</span>
                          <Button variant="outline" size="sm" onClick={() => openSyncDetails(integration)}><Eye className="w-3 h-3 mr-1" />See Details</Button>
                        </div>
                        {/* entity summary */}
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          {summarizeOps(integration.configuration.last_sync_details.operations).map((line, idx) => (
                            <div key={idx}>• {line}</div>
                          ))}
                        </div>
                      </>
                    )}
                    <Collapsible open={!!expandedSyncHistory[integration.id]} onOpenChange={() => toggleSyncHistory(integration.id)}>
                      <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-between"><span className="text-sm">Sync History</span>{expandedSyncHistory[integration.id] ? (<ChevronDown className="w-4 h-4" />) : (<ChevronRight className="w-4 h-4" />)}</Button></CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {syncHistory[integration.id]?.length > 0 ? (
                          syncHistory[integration.id].map((sync: any, index: number) => (
                            <div key={index} className="text-xs p-2 bg-muted rounded flex justify-between items-center gap-2">
                              <span>{formatDate(sync.sync_timestamp)}</span>
                              <span>{sync.synced_count} synced, {sync.errors_count} errors</span>
                              <div className="flex items-center gap-2">
                                {/* show ops summary inline if present */}
                                {sync.operations && (
                                  <div className="hidden sm:block text-muted-foreground">
                                    {summarizeOps(sync.operations).slice(0,2).map((s: string, i: number) => <span key={i} className="ml-2">• {s}</span>)}
                                  </div>
                                )}
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => setSyncDetailsModal({
                                    open: true,
                                    integrationName: integration.name,
                                    syncDetails: {
                                      timestamp: sync.sync_timestamp,
                                      synced: sync.synced_count || 0,
                                      errors: sync.errors_count || 0,
                                      operations: sync.operations || {}
                                    }
                                  })}
                                >
                                  See Ops
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">No sync history available</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CRM Integrations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">CRM Integrations</h2>
        {crmIntegrations.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No CRM integrations configured yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {crmIntegrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getProviderLogo(integration.provider) && (<img src={getProviderLogo(integration.provider)!} alt={getProviderName(integration.provider)} className="w-8 h-8 object-contain" />)}
                      <div><CardTitle className="text-lg">{integration.name}</CardTitle><CardDescription>{getProviderName(integration.provider)}</CardDescription></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(integration.status)}>
                        {integration.status === 'active' && <Wifi className="w-3 h-3 mr-1" />}
                        {integration.status === 'inactive' && <WifiOff className="w-3 h-3 mr-1" />}
                        {integration.status === 'paused' && <Pause className="w-3 h-3 mr-1" />}
                        {integration.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSync(integration)} disabled={syncing === integration.id}><RefreshCw className={`w-4 h-4 ${syncing === integration.id ? 'animate-spin' : ''}`} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleConfigure(integration)}><Settings className="w-4 h-4" /></Button>
                        {integration.status === 'paused' ? (<Button variant="ghost" size="sm" onClick={() => handleResumeIntegration(integration)}><Play className="w-4 h-4" /></Button>) : (<Button variant="ghost" size="sm" onClick={() => handlePauseIntegration(integration)}><Pause className="w-4 h-4" /></Button>)}
                        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" onClick={() => setIntegrationToDelete(integration)}><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Integration</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this integration? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteIntegration} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Last Sync:</span><span>{formatDate(integration.last_sync)}</span></div>
                    {integration.configuration?.last_sync_details && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Sync Details:</span>
                          <Button variant="outline" size="sm" onClick={() => openSyncDetails(integration)}><Eye className="w-3 h-3 mr-1" />See Details</Button>
                        </div>
                        {/* entity summary */}
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          {summarizeOps(integration.configuration.last_sync_details.operations).map((line, idx) => (
                            <div key={idx}>• {line}</div>
                          ))}
                        </div>
                      </>
                    )}
                    <Collapsible open={!!expandedSyncHistory[integration.id]} onOpenChange={() => toggleSyncHistory(integration.id)}>
                      <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-between"><span className="text-sm">Sync History</span>{expandedSyncHistory[integration.id] ? (<ChevronDown className="w-4 h-4" />) : (<ChevronRight className="w-4 h-4" />)}</Button></CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {syncHistory[integration.id]?.length > 0 ? (
                          syncHistory[integration.id].map((sync: any, index: number) => (
                            <div key={index} className="text-xs p-2 bg-muted rounded flex justify-between items-center gap-2">
                              <span>{formatDate(sync.sync_timestamp)}</span>
                              <span>{sync.synced_count} synced, {sync.errors_count} errors</span>
                              <div className="flex items-center gap-2">
                                {sync.operations && (
                                  <div className="hidden sm:block text-muted-foreground">
                                    {summarizeOps(sync.operations).slice(0,2).map((s: string, i: number) => <span key={i} className="ml-2">• {s}</span>)}
                                  </div>
                                )}
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => setSyncDetailsModal({
                                    open: true,
                                    integrationName: integration.name,
                                    syncDetails: {
                                      timestamp: sync.sync_timestamp,
                                      synced: sync.synced_count || 0,
                                      errors: sync.errors_count || 0,
                                      operations: sync.operations || {}
                                    }
                                  })}
                                >
                                  See Ops
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">No sync history available</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Config dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configure Integration</DialogTitle><DialogDescription>Update the settings for this integration.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="config_name">Name</Label><Input id="config_name" value={configFormData.name} onChange={(e) => setConfigFormData({ ...configFormData, name: e.target.value })} placeholder="Integration name" /></div>
            <div><Label htmlFor="config_api_key">API Key (leave empty to keep current)</Label><Input id="config_api_key" type="password" value={configFormData.api_key} onChange={(e) => setConfigFormData({ ...configFormData, api_key: e.target.value })} placeholder="Enter new API key" /></div>
            <div className="flex gap-2"><Button onClick={handleUpdateIntegration} className="flex-1">Update Integration</Button><Button variant="outline" onClick={() => setConfigDialogOpen(false)} className="flex-1">Cancel</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync details modal */}
      <SyncDetailsModal open={syncDetailsModal.open} onOpenChange={(open) => setSyncDetailsModal(prev => ({ ...prev, open }))} syncDetails={syncDetailsModal.syncDetails as any} integrationName={syncDetailsModal.integrationName} />
    </div>
  );
}

export default Integrations;
