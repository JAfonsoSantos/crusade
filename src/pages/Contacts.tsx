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
import { Contact, Plus, Edit, Trash2, Search, Filter, Phone, Mail, Building2, Users, Linkedin, UserPlus } from 'lucide-react';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContactType {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  notes?: string | null;
  lead_source?: string | null;
  status: string;
  advertiser_id?: string | null;
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

interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  company_name: string;
  website: string;
  linkedin_url: string;
  notes: string;
  lead_source: string;
  status: string;
  advertiser_id: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [advertiserFilter, setAdvertiserFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactType | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_name: '',
    website: '',
    linkedin_url: '',
    notes: '',
    lead_source: 'manual',
    status: 'active',
    advertiser_id: ''
  });
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    fetchContacts();
    fetchAdvertisers();
  }, []);

  useEffect(() => {
    let filtered = contacts.filter(contact => {
      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return fullName.includes(searchLower) ||
        (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
        (contact.company_name && contact.company_name.toLowerCase().includes(searchLower)) ||
        (contact.job_title && contact.job_title.toLowerCase().includes(searchLower));
    });

    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.status === statusFilter);
    }

    if (advertiserFilter !== 'all') {
      filtered = filtered.filter(contact => contact.advertiser_id === advertiserFilter);
    }

    setFilteredContacts(filtered);
  }, [searchTerm, statusFilter, advertiserFilter, contacts]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          advertiser:advertisers(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contactos.",
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

      const contactData = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        job_title: formData.job_title || null,
        company_name: formData.company_name || null,
        website: formData.website || null,
        linkedin_url: formData.linkedin_url || null,
        notes: formData.notes || null,
        lead_source: formData.lead_source || 'manual',
        status: formData.status,
        advertiser_id: formData.advertiser_id || null,
        company_id: profile.company_id
      };

      if (editingContact) {
        // Update
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;

        logActivity({
          action: 'update',
          resource_type: 'contact',
          details: { contact_name: `${formData.first_name} ${formData.last_name}` }
        });

        toast({
          title: "Sucesso",
          description: "Contacto atualizado com sucesso!",
        });
      } else {
        // Create
        const { error } = await supabase
          .from('contacts')
          .insert(contactData);

        if (error) throw error;

        logActivity({
          action: 'create',
          resource_type: 'contact',
          details: { contact_name: `${formData.first_name} ${formData.last_name}` }
        });

        toast({
          title: "Sucesso",
          description: "Contacto criado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingContact(null);
      setFormData({
        first_name: '', last_name: '', email: '', phone: '', job_title: '', 
        company_name: '', website: '', linkedin_url: '', notes: '', 
        lead_source: 'manual', status: 'active', advertiser_id: ''
      });
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Erro",
        description: "Erro ao guardar contacto.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (contact: ContactType) => {
    const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    if (!confirm(`Tem a certeza que pretende eliminar o contacto "${contactName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id);

      if (error) throw error;

      logActivity({
        action: 'delete',
        resource_type: 'contact',
        details: { contact_name: contactName }
      });

      toast({
        title: "Sucesso",
        description: "Contacto eliminado com sucesso!",
      });
      
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Erro",
        description: "Erro ao eliminar contacto.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (contact: ContactType) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      job_title: contact.job_title || '',
      company_name: contact.company_name || '',
      website: contact.website || '',
      linkedin_url: contact.linkedin_url || '',
      notes: contact.notes || '',
      lead_source: contact.lead_source || 'manual',
      status: contact.status,
      advertiser_id: contact.advertiser_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingContact(null);
    setFormData({
      first_name: '', last_name: '', email: '', phone: '', job_title: '', 
      company_name: '', website: '', linkedin_url: '', notes: '', 
      lead_source: 'manual', status: 'active', advertiser_id: ''
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'lead': return 'destructive';
      default: return 'outline';
    }
  };

  const getLeadSourceColor = (source: string) => {
    switch (source) {
      case 'manual': return 'secondary';
      case 'hubspot': return 'default';
      case 'salesforce': return 'destructive';
      case 'linkedin': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contactos</h2>
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
          <h2 className="text-3xl font-bold tracking-tight">Contactos</h2>
          <p className="text-muted-foreground">
            Gerencie os seus contactos e leads
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Contacto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contactos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Contact className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.status === 'lead').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com LinkedIn</CardTitle>
            <Linkedin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.linkedin_url).length}
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
                  placeholder="Pesquisar contactos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
            <Select value={advertiserFilter} onValueChange={setAdvertiserFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Anunciante" />
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

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contactos ({filteredContacts.length})</CardTitle>
          <CardDescription>
            Lista de todos os contactos registados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {contacts.length === 0 
                ? "Nenhum contacto registado. Crie o primeiro contacto." 
                : "Nenhum contacto encontrado com os filtros aplicados."
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Anunciante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
                  const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();
                  
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{initials || 'C'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{fullName || 'Sem nome'}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {contact.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {contact.company_name && (
                            <div className="font-medium">{contact.company_name}</div>
                          )}
                          {contact.job_title && (
                            <div className="text-sm text-muted-foreground">{contact.job_title}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.advertiser?.name ? (
                          <Badge variant="outline">{contact.advertiser.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(contact.status)}>
                          {contact.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getLeadSourceColor(contact.lead_source || 'manual')}>
                          {contact.lead_source || 'manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(contact)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(contact)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contacto' : 'Novo Contacto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Primeiro Nome</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="João"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Último Nome</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Silva"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job_title">Cargo</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Marketing Manager"
                />
              </div>
              <div>
                <Label htmlFor="company_name">Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/joaosilva"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lead_source">Fonte</Label>
                <Select value={formData.lead_source} onValueChange={(value) => setFormData({ ...formData, lead_source: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="hubspot">HubSpot</SelectItem>
                    <SelectItem value="salesforce">Salesforce</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="advertiser_id">Anunciante</Label>
                <Select value={formData.advertiser_id} onValueChange={(value) => setFormData({ ...formData, advertiser_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {advertisers.map(advertiser => (
                      <SelectItem key={advertiser.id} value={advertiser.id}>
                        {advertiser.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas sobre este contacto..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingContact ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}