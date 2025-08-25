import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ShieldX, MessageSquare, Send } from 'lucide-react';
import { usePermissions, UserPermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

interface AccessDeniedProps {
  module: keyof UserPermissions;
  title: string;
  description?: string;
}

export const AccessDenied = ({ module, title, description }: AccessDeniedProps) => {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const { requestAccess } = usePermissions();
  const { toast } = useToast();

  const handleRequestAccess = async () => {
    setRequesting(true);
    
    const result = await requestAccess(module, message);
    
    if (result.success) {
      toast({
        title: "Solicitação enviada!",
        description: "O administrador foi notificado da sua solicitação de acesso.",
      });
      setIsRequestOpen(false);
      setMessage('');
    } else {
      toast({
        title: "Erro",
        description: result.error || "Erro ao enviar solicitação.",
        variant: "destructive",
      });
    }
    
    setRequesting(false);
  };

  const moduleLabels = {
    pipeline: 'Pipeline',
    campaigns: 'Campanhas', 
    insights: 'Insights'
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <ShieldX className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Acesso Restrito</CardTitle>
          <CardDescription>
            Não tem permissões para aceder ao módulo <strong>{moduleLabels[module]}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {description || 'Contacte o administrador para solicitar acesso a esta funcionalidade.'}
          </p>
          
          <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                Solicitar Acesso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Acesso ao {moduleLabels[module]}</DialogTitle>
                <DialogDescription>
                  Envie uma mensagem ao administrador explicando porque precisa de acesso a este módulo.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem (opcional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Explique porque precisa de acesso a este módulo..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsRequestOpen(false)}
                  disabled={requesting}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRequestAccess}
                  disabled={requesting}
                >
                  {requesting ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Solicitação
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};