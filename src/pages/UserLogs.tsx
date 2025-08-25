import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Search, Filter, Clock, User, Shield, Database, FileText, Settings, LogIn, LogOut, Edit, Trash2, Plus, Eye } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/AccessDenied';
import { useToast } from '@/hooks/use-toast';

interface ActivityLog {
  id: string;
  action: string;
  details: any; // Changed from Record<string, any> to any to match Supabase Json type
  ip_address?: string | null;
  user_agent?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  session_id?: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name?: string;
  email?: string;
  role: string;
  created_at: string;
}

export default function UserLogs() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Check permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDenied 
      module="insights" 
      title="User Activity Logs"
      description="Apenas administradores podem aceder aos logs de atividade dos utilizadores."
    />;
  }

  useEffect(() => {
    if (!userId) return;

    const fetchUserAndLogs = async () => {
      try {
        setLoading(true);

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            user_id,
            full_name,
            role,
            created_at
          `)
          .eq('user_id', userId)
          .single();

        if (profileError) throw profileError;

        // Set profile without email initially
        setUserProfile({
          ...profile,
          email: 'N/A' // We'll get the email separately if needed
        });

        // Fetch activity logs
        const { data: logsData, error: logsError } = await supabase
          .from('user_activity_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(500);

        if (logsError) throw logsError;
        setLogs((logsData || []) as ActivityLog[]);

      } catch (error) {
        console.error('Error fetching user logs:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar os logs do utilizador.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndLogs();
  }, [userId, toast]);

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      'login': LogIn,
      'logout': LogOut,
      'create': Plus,
      'update': Edit,
      'delete': Trash2,
      'view': Eye,
      'settings': Settings,
      'auth': Shield,
      'database': Database,
    };

    const ActionIcon = iconMap[action.toLowerCase()] || FileText;
    return <ActionIcon className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      'login': 'bg-green-100 text-green-800',
      'logout': 'bg-gray-100 text-gray-800',
      'create': 'bg-blue-100 text-blue-800',
      'update': 'bg-orange-100 text-orange-800',
      'delete': 'bg-red-100 text-red-800',
      'view': 'bg-purple-100 text-purple-800',
      'settings': 'bg-yellow-100 text-yellow-800',
    };

    return colorMap[action.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const logDate = new Date(log.created_at);
      const now = new Date();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      switch (dateFilter) {
        case 'today':
          matchesDate = logDate.toDateString() === now.toDateString();
          break;
        case 'week':
          matchesDate = (now.getTime() - logDate.getTime()) <= (7 * dayInMs);
          break;
        case 'month':
          matchesDate = (now.getTime() - logDate.getTime()) <= (30 * dayInMs);
          break;
      }
    }
    
    return matchesSearch && matchesAction && matchesDate;
  });

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/business-settings')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às Definições
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Logs de Atividade</h1>
          <p className="text-muted-foreground">
            Histórico de atividade de {userProfile?.full_name || userProfile?.email || 'Utilizador'}
          </p>
        </div>
      </div>

      {/* User Info Card */}
      {userProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Utilizador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Nome</div>
                <div className="text-lg">{userProfile.full_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="text-lg">{userProfile.email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Role</div>
                <Badge variant="outline" className="capitalize">
                  {userProfile.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar nas ações ou detalhes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas as ações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Atividade ({filteredLogs.length} registos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {logs.length === 0 
                ? "Não existem logs de atividade para este utilizador."
                : "Não foram encontrados logs que correspondam aos filtros aplicados."
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div key={log.id}>
                  <div className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Detalhes:</div>
                          <pre className="text-xs bg-muted p-2 rounded text-wrap overflow-hidden">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {log.resource_type && (
                          <Badge variant="outline" className="text-xs">
                            Tipo: {log.resource_type}
                          </Badge>
                        )}
                        {log.ip_address && (
                          <Badge variant="outline" className="text-xs">
                            IP: {log.ip_address}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < filteredLogs.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}