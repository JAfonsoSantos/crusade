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
import { Plus, Edit, Trash2, Megaphone, Calendar, Upload } from 'lucide-react';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pushingCampaign, setPushingCampaign] = useState<string | null>(null);
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
      .eq('provider', 'kevel')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching integrations:', error);
    } else {
      setIntegrations(data || []);
    }
  };

  const pushCampaignToKevel = async (campaignId: string) => {
    if (integrations.length === 0) {
      toast({
        title: "No Integrations",
        description: "Please set up a Kevel integration first.",
        variant: "destructive",
      });
      return;
    }

    setPushingCampaign(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke('push-campaign-to-kevel', {
        body: {
          campaignId,
          integrationId: integrations[0].id, // Use first active Kevel integration
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: data.message || "Campaign pushed to Kevel successfully!",
      });
    } catch (error) {
      console.error('Push campaign error:', error);
      toast({
        title: "Error",
        description: "Failed to push campaign to Kevel.",
        variant: "destructive",
      });
    } finally {
      setPushingCampaign(null);
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {campaign.description || 'No description'}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Budget:</strong> {campaign.budget} {campaign.currency}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => pushCampaignToKevel(campaign.id)}
                    disabled={pushingCampaign === campaign.id || integrations.length === 0}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {pushingCampaign === campaign.id ? 'Pushing...' : 'Push to Kevel'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
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