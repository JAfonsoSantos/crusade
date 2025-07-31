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

  const cleanupKevelData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-kevel-data')
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to cleanup Kevel data",
          variant: "destructive",
        });
        console.error('Cleanup error:', error)
        return
      }

      toast({
        title: "Success",
        description: data.message,
      });
      console.log('Cleanup result:', data.deleted)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cleanup Kevel data",
        variant: "destructive",
      });
      console.error('Cleanup error:', error)
    }
  }

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
      setShowCreateDialog(false);
      setFormData({
        name: '',
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
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="kevel">Kevel</SelectItem>
                      <SelectItem value="koddi">Koddi</SelectItem>
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
      </div>

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

      <div className="grid gap-4 grid-cols-1">
        {integrations.map((integration) => (
          <Card key={integration.id} className="transition-all duration-300 w-full">
            <CardHeader>
               <div className="flex justify-between items-start">
                 <div>
                   <CardTitle className="text-lg">{integration.name}</CardTitle>
                   <CardDescription className="flex items-center gap-2">
                     {integration.provider}
                   </CardDescription>
                 </div>
                 <div className="flex items-center gap-2">
                   {integration.status === 'active' ? (
                     <Wifi className="h-4 w-4 text-green-600" />
                   ) : (
                     <WifiOff className="h-4 w-4 text-red-600" />
                   )}
                   <Badge variant={integration.status === 'active' ? 'default' : 'secondary'}>
                     {integration.status}
                   </Badge>
                   
                   {/* Action buttons */}
                   <div className="flex items-center gap-1 ml-2">
                     <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteIntegration(integration)}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
               </div>
            </CardHeader>
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