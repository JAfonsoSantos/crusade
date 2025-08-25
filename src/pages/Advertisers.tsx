import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Plus, Edit, Trash2, Search, Filter, Users, BarChart3 } from 'lucide-react';
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface Advertiser {
  id: string;
  name: string;
  external_id?: string | null;
  source?: string | null;
  created_at: string;
  company_id: string;
}

interface AdvertiserFormData {
  name: string;
  external_id: string;
  source: string;
}

export default function Advertisers() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [filteredAdvertisers, setFilteredAdvertisers] = useState<Advertiser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState<Advertiser | null>(null);
  const [formData, setFormData] = useState<AdvertiserFormData>({
    name: '',
    external_id: '',
    source: 'manual'
  });
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  useEffect(() => {
    const filtered = advertisers.filter(advertiser =>
      advertiser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (advertiser.external_id && advertiser.external_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredAdvertisers(filtered);
  }, [searchTerm, advertisers]);

  const fetchAdvertisers = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvertisers(data || []);
    } catch (error) {
      console.error('Error fetching advertisers:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar anunciantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

      if (editingAdvertiser) {
        // Update
        const { error } = await supabase
          .from('advertisers')
          .update({
            name: formData.name,
            external_id: formData.external_id || null,
            source: formData.source
          })
          .eq('id', editingAdvertiser.id);

        if (error) throw error;

        logActivity({
          action: 'update',
          resource_type: 'advertiser',
          details: { advertiser_name: formData.name }
        });

        toast({
          title: "Sucesso",
          description: "Anunciante atualizado com sucesso!",
        });
      } else {
        // Create
        const { error } = await supabase
          .from('advertisers')
          .insert({
            name: formData.name,
            external_id: formData.external_id || null,
            source: formData.source,
            company_id: profile.company_id
          });

        if (error) throw error;

        logActivity({
          action: 'create',
          resource_type: 'advertiser',
          details: { advertiser_name: formData.name }
        });

        toast({
          title: "Sucesso",
          description: "Anunciante criado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingAdvertiser(null);
      setFormData({ name: '', external_id: '', source: 'manual' });
      fetchAdvertisers();
    } catch (error) {
      console.error('Error saving advertiser:', error);
      toast({
        title: "Erro",
        description: "Erro ao guardar anunciante.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (advertiser: Advertiser) => {
    if (!confirm(`Tem a certeza que pretende eliminar o anunciante "${advertiser.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('advertisers')
        .delete()
        .eq('id', advertiser.id);

      if (error) throw error;

      logActivity({
        action: 'delete',
        resource_type: 'advertiser',
        details: { advertiser_name: advertiser.name }
      });

      toast({
        title: "Sucesso",
        description: "Anunciante eliminado com sucesso!",
      });
      
      fetchAdvertisers();
    } catch (error) {
      console.error('Error deleting advertiser:', error);
      toast({
        title: "Erro",
        description: "Erro ao eliminar anunciante.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (advertiser: Advertiser) => {
    setEditingAdvertiser(advertiser);
    setFormData({
      name: advertiser.name,
      external_id: advertiser.external_id || '',
      source: advertiser.source || 'manual'
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingAdvertiser(null);
    setFormData({ name: '', external_id: '', source: 'manual' });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Anunciantes</h2>
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
          <h2 className="text-3xl font-bold tracking-tight">Anunciantes</h2>
          <p className="text-muted-foreground">
            Gerencie os seus anunciantes e clientes
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Anunciante
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anunciantes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{advertisers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fontes Externas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {advertisers.filter(a => a.external_id).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criados Manualmente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {advertisers.filter(a => a.source === 'manual').length}
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
                  placeholder="Pesquisar anunciantes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advertisers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Anunciantes ({filteredAdvertisers.length})</CardTitle>
          <CardDescription>
            Lista de todos os anunciantes registados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAdvertisers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {advertisers.length === 0 
                ? "Nenhum anunciante registado. Crie o primeiro anunciante." 
                : "Nenhum anunciante encontrado com os filtros aplicados."
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>ID Externo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvertisers.map((advertiser) => (
                  <TableRow key={advertiser.id}>
                    <TableCell className="font-medium">{advertiser.name}</TableCell>
                    <TableCell>
                      {advertiser.external_id ? (
                        <Badge variant="outline">{advertiser.external_id}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={advertiser.source === 'manual' ? 'secondary' : 'default'}>
                        {advertiser.source || 'manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(advertiser.created_at).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(advertiser)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(advertiser)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAdvertiser ? 'Editar Anunciante' : 'Novo Anunciante'}
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
                  placeholder="Nome do anunciante"
                  required
                />
              </div>
              <div>
                <Label htmlFor="external_id">ID Externo</Label>
                <Input
                  id="external_id"
                  value={formData.external_id}
                  onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                  placeholder="ID de sistema externo"
                />
              </div>
              <div>
                <Label htmlFor="source">Fonte</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="manual, hubspot, salesforce..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingAdvertiser ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}