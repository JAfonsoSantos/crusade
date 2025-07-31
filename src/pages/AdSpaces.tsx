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
import { Plus, Edit, Trash2, Target } from 'lucide-react';

interface AdSpace {
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
}

const AdSpaces = () => {
  const [adSpaces, setAdSpaces] = useState<AdSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'banner',
    size: '',
    location: '',
    base_price: '',
    currency: 'EUR',
    price_model: 'cpm',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAdSpaces();
  }, []);

  const fetchAdSpaces = async () => {
    const { data, error } = await supabase
      .from('ad_spaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os espaços publicitários.",
        variant: "destructive",
      });
    } else {
      setAdSpaces(data || []);
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

    const { error } = await supabase.from('ad_spaces').insert({
      ...formData,
      base_price: parseFloat(formData.base_price),
      company_id: profile.company_id,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o espaço publicitário.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Espaço publicitário criado com sucesso!",
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
      });
      fetchAdSpaces();
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

  if (loading) {
    return <div>A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Espaços Publicitários</h2>
          <p className="text-muted-foreground">
            Gerencie os seus espaços publicitários disponíveis
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Espaço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Espaço</DialogTitle>
              <DialogDescription>
                Adicione um novo espaço publicitário ao seu inventário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Banner Homepage"
                  required
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="native">Nativo</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="size">Tamanho</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="Ex: 728x90, 300x250"
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Topo da página, Sidebar"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="price">Preço Base</Label>
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
                  <Label htmlFor="model">Modelo</Label>
                  <Select value={formData.price_model} onValueChange={(value) => setFormData({ ...formData, price_model: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpm">CPM</SelectItem>
                      <SelectItem value="cpc">CPC</SelectItem>
                      <SelectItem value="cpa">CPA</SelectItem>
                      <SelectItem value="fixed">Fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                Criar Espaço
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adSpaces.map((space) => (
          <Card key={space.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{space.name}</CardTitle>
                  <CardDescription>{space.type} • {space.size}</CardDescription>
                </div>
                <Badge className={getStatusColor(space.status)}>
                  {space.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Localização:</strong> {space.location || 'Não especificada'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Preço:</strong> {space.base_price} {space.currency} ({space.price_model.toUpperCase()})
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {adSpaces.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum espaço publicitário</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando o seu primeiro espaço publicitário para começar a gerar receita.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Espaço
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdSpaces;