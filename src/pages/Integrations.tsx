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
import { Plus, Settings, Trash2, Wifi, WifiOff } from 'lucide-react';

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
        title: "Erro",
        description: "Não foi possível carregar as integrações.",
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
        title: "Erro",
        description: "Perfil de empresa não encontrado. Configure sua empresa primeiro.",
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
        title: "Erro",
        description: "Não foi possível criar a integração.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Integração criada com sucesso!",
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
      default:
        return provider;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div>A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integrações</h2>
          <p className="text-muted-foreground">
            Configure integrações com servidores de anúncios
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Integração
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nova Integração</DialogTitle>
              <DialogDescription>
                Configure uma nova integração com servidor de anúncios
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Nome da Integração</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Google Ad Manager Principal"
                  required
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="provider">Provedor</Label>
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
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="api_key">Chave API</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Insira a sua chave API"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full">
                Criar Integração
              </Button>
            </form>
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
                  <strong>Última Sincronização:</strong><br />
                  {formatDate(integration.last_sync)}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
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
            <h3 className="text-lg font-semibold mb-2">Nenhuma integração</h3>
            <p className="text-muted-foreground text-center mb-4">
              Configure integrações com servidores de anúncios para sincronizar dados automaticamente.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Primeira Integração
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integrations;