import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Key, CheckCircle } from 'lucide-react';

export default function SalesforceOAuth() {
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const handleStartOAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-oauth-start');
      
      if (error) {
        console.error('Error starting OAuth:', error);
        return;
      }
      
      if (data?.authUrl) {
        setAuthUrl(data.authUrl);
        // Open in new window
        window.open(data.authUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to start OAuth:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configuração OAuth do Salesforce
          </CardTitle>
          <CardDescription>
            Configure a autenticação do Salesforce para sincronizar dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Credenciais Configuradas</p>
                <p className="text-sm text-muted-foreground">
                  Consumer Key e Consumer Secret já foram adicionados
                </p>
              </div>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50">
              <p className="font-medium text-orange-800">Próximo Passo</p>
              <p className="text-sm text-orange-700">
                Agora precisamos obter o Refresh Token através do fluxo OAuth
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleStartOAuth} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Iniciando...' : 'Iniciar Autenticação OAuth'}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            
            {authUrl && (
              <div className="text-center text-sm text-muted-foreground">
                <p>Uma nova janela foi aberta para autenticação.</p>
                <p>Se não abriu automaticamente, 
                  <a 
                    href={authUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    clique aqui
                  </a>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground">Instruções:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Clique no botão acima para iniciar o OAuth</li>
              <li>Faça login na sua conta Salesforce</li>
              <li>Autorize a aplicação</li>
              <li>Copie o Refresh Token que será exibido</li>
              <li>Adicione o token aos secrets do Supabase</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}