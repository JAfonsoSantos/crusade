import { useState, useEffect } from 'react';
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
import { Plus, Edit, Trash2, Megaphone, Calendar, Upload, ExternalLink, Loader2, PlayCircle, PauseCircle, RefreshCw } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  status: string;
  created_at: string;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pushingCampaigns, setPushingCampaigns] = useState<Set<string>>(new Set());
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: 'EUR',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchIntegrations();
  }, []);

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Could not load campaigns.",
        variant: "destructive",
      });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const fetchIntegrations = async () => {
    const { data, error } = await supabase
      .from('ad_server_integrations')
      .select('*')
      .in('provider', ['kevel', 'koddi', 'topsort'])
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching integrations:', error);
    } else {
      setIntegrations(data || []);
    }
  };

  const pushCampaignToKevel = async (campaignId: string, integrationId: string) => {
    setPushingCampaigns(prev => new Set([...prev, campaignId]));
    try {
      // Use universal campaign push for both Kevel and Koddi
      const { data, error } = await supabase.functions.invoke('universal-campaign-push', {
        body: {
          campaignId,
          integrationId,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: data.message || `Campaign pushed to ${data.platform} successfully!`,
      });
      
      // Refresh integrations to get updated platform_config
      await fetchIntegrations();
    } catch (error) {
      console.error('Push campaign error:', error);
      toast({
        title: "Error",
        description: "Failed to push campaign to ad platform.",
        variant: "destructive",
      });
    } finally {
      setPushingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const toggleCampaignInKevel = async (campaignId: string, integrationId: string, activate: boolean) => {
    setPushingCampaigns(prev => new Set([...prev, campaignId]));
    try {
      const { data, error } = await supabase.functions.invoke('toggle-campaign-kevel', {
        body: {
          campaignId,
          integrationId,
          activate,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Campaign ${activate ? 'activated' : 'paused'} in Kevel successfully!`,
      });
    } catch (error) {
      console.error('Toggle campaign error:', error);
      toast({
        title: "Error",
        description: "Failed to toggle campaign in Kevel.",
        variant: "destructive",
      });
    } finally {
      setPushingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const syncAllIntegrations = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-sync-kevel');

      if (error) {
        throw error;
      }

      toast({
        title: "Sync Complete",
        description: data.message || `Synced ${data.total_synced} items from ${data.integrations_processed} integrations`,
      });
      
      // Refresh integrations and campaigns to show updated data
      await Promise.all([fetchIntegrations(), fetchCampaigns()]);
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with ad platforms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user?.id)
      .single();

    if (!profile?.company_id) {
      toast({
        title: "Error",
        description: "Company profile not found. Set up your company first.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('campaigns').insert({
      ...formData,
      budget: parseFloat(formData.budget),
      company_id: profile.company_id,
      created_by: user.user?.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Could not create campaign.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign created successfully!",
      });
      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        budget: '',
        currency: 'EUR',
      });
      fetchCampaigns();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">
            Manage your advertising campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={syncAllIntegrations}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync with Platforms
              </>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new advertising campaign
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Summer 2024 Campaign"
                    required
                  />
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Campaign description..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  Create Campaign
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {campaign.name}
                  </CardTitle>
                  {campaign.description && (
                    <p className="text-muted-foreground mt-1">
                      {campaign.description}
                    </p>
                  )}
                </div>
                <Badge 
                  variant={
                    campaign.status === 'active' ? 'default' : 
                    campaign.status === 'paused' ? 'secondary' : 
                    'outline'
                  }
                  className={getStatusColor(campaign.status)}
                >
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(campaign.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(campaign.end_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-medium">
                    {campaign.budget ? 
                      `${campaign.currency} ${campaign.budget.toLocaleString()}` : 
                      'Not set'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(campaign.created_at)}</p>
                </div>
              </div>

              {/* Universal Platform Integration Status */}
              {integrations.map(integration => {
                const platformConfig = integration.platform_config as any || {}
                const campaignData = platformConfig.campaigns?.[campaign.id]
                
                if (!campaignData) return null
                
                return (
                  <div key={integration.id} className="bg-muted/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)} Integration
                      </Badge>
                      <Badge variant={campaignData.status === 'synced' ? 'default' : 'secondary'}>
                        {campaignData.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Platform ID:</span>
                        <p className="font-mono">{campaignData.platform_id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hierarchy:</span>
                        <p className="text-xs">{campaignData.hierarchy}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Sync:</span>
                        <p>{campaignData.created_at ? formatDate(campaignData.created_at) : 'Never'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {integrations
                  .filter(i => ['kevel', 'koddi', 'topsort'].includes(i.provider) && i.status === 'active')
                  .map(integration => {
                    const platformConfig = integration.platform_config as any || {}
                    const campaignData = platformConfig.campaigns?.[campaign.id]
                    const isInPlatform = !!campaignData?.platform_id
                    
                    return (
                      <div key={integration.id} className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => pushCampaignToKevel(campaign.id, integration.id)}
                          disabled={pushingCampaigns.has(campaign.id)}
                        >
                          {pushingCampaigns.has(campaign.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Pushing...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {isInPlatform ? `Update in ${integration.provider}` : `Push to ${integration.provider}`}
                            </>
                          )}
                        </Button>
                        
                        {isInPlatform && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleCampaignInKevel(campaign.id, integration.id, campaign.status !== 'active')}
                            disabled={pushingCampaigns.has(campaign.id)}
                          >
                            {campaign.status === 'active' ? (
                              <>
                                <PauseCircle className="h-4 w-4 mr-2" />
                                Pause in {integration.provider}
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Activate in {integration.provider}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )
                  })
                }
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first campaign to start promoting your ads.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Campaign
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Campaigns;