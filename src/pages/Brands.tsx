import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Palette, Plus, Edit, Trash2, Search, Filter, Globe, Building2, ExternalLink } from 'lucide-react';
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface Brand {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
  advertiser_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  advertiser?: {
    name: string;
  };
}

interface Advertiser {
  id: string;
  name: string;
}

interface BrandFormData {
  name: string;
  description: string;
  logo_url: string;
  website: string;
  advertiser_id: string;
}

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    description: '',
    logo_url: '',
    website: '',
    advertiser_id: ''
  });
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    fetchBrands();
    fetchAdvertisers();
  }, []);

  useEffect(() => {
    let filtered = brands.filter(brand =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (selectedAdvertiser !== 'all') {
      filtered = filtered.filter(brand => brand.advertiser_id === selectedAdvertiser);
    }

    setFilteredBrands(filtered);
  }, [searchTerm, selectedAdvertiser, brands]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          advertiser:advertisers(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar marcas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvertisers = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setAdvertisers(data || []);
    } catch (error) {
      console.error('Error fetching advertisers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada.",
          variant: "destructive",
        });
        return;
      }

      if (editingBrand) {
        // Update
        const { error } = await supabase
          .from('brands')
          .update({
            name: formData.name,
            description: formData.description || null,
            logo_url: formData.logo_url || null,
            website: formData.website || null,
            advertiser_id: formData.advertiser_id
          })
          .eq('id', editingBrand.id);

        if (error) throw error;

        logActivity({
          action: 'update',
          resource_type: 'brand',
          details: { brand_name: formData.name }
        });

        toast({
          title: "Sucesso",
          description: "Marca atualizada com sucesso!",
        });
      } else {
        // Create
        const { error } = await supabase
          .from('brands')
          .insert({
            name: formData.name,
            description: formData.description || null,
            logo_url: formData.logo_url || null,
            website: formData.website || null,
            advertiser_id: formData.advertiser_id,
            company_id: profile.company_id
          });

        if (error) throw error;

        logActivity({
          action: 'create',
          resource_type: 'brand',
          details: { brand_name: formData.name }
        });

        toast({
          title: "Sucesso",
          description: "Marca criada com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingBrand(null);
      setFormData({ name: '', description: '', logo_url: '', website: '', advertiser_id: '' });
      fetchBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: "Erro",
        description: "Erro ao guardar marca.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Tem a certeza que pretende eliminar a marca "${brand.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brand.id);

      if (error) throw error;

      logActivity({
        action: 'delete',
        resource_type: 'brand',
        details: { brand_name: brand.name }
      });

      toast({
        title: "Sucesso",
        description: "Marca eliminada com sucesso!",
      });
      
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Erro",
        description: "Erro ao eliminar marca.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      website: brand.website || '',
      advertiser_id: brand.advertiser_id
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setFormData({ name: '', description: '', logo_url: '', website: '', advertiser_id: '' });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marcas</h2>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marcas</h2>
          <p className="text-muted-foreground">
            Gerencie as marcas dos seus anunciantes
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Marca
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Marcas</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brands.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Website</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {brands.filter(b => b.website).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Logo</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {brands.filter(b => b.logo_url).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar marcas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedAdvertiser} onValueChange={setSelectedAdvertiser}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os anunciantes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anunciantes</SelectItem>
                {advertisers.map(advertiser => (
                  <SelectItem key={advertiser.id} value={advertiser.id}>
                    {advertiser.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Brands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Marcas ({filteredBrands.length})</CardTitle>
          <CardDescription>
            Lista de todas as marcas registadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBrands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {brands.length === 0 
                ? "Nenhuma marca registada. Crie a primeira marca." 
                : "Nenhuma marca encontrada com os filtros aplicados."
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Anunciante</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={brand.logo_url || ''} />
                          <AvatarFallback>
                            {brand.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{brand.name}</div>
                          {brand.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {brand.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {brand.advertiser?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {brand.website ? (
                        <a 
                          href={brand.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          <span className="text-sm">Website</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(brand.created_at).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(brand)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? 'Editar Marca' : 'Nova Marca'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da marca"
                  required
                />
              </div>
              <div>
                <Label htmlFor="advertiser_id">Anunciante *</Label>
                <Select 
                  value={formData.advertiser_id} 
                  onValueChange={(value) => setFormData({ ...formData, advertiser_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um anunciante" />
                  </SelectTrigger>
                  <SelectContent>
                    {advertisers.map(advertiser => (
                      <SelectItem key={advertiser.id} value={advertiser.id}>
                        {advertiser.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da marca"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="logo_url">URL do Logo</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  type="url"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingBrand ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}