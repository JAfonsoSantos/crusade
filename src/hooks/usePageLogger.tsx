import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useActivityLogger } from './useActivityLogger';
import { supabase } from '@/integrations/supabase/client';

// Mapa de rotas para nomes mais amigáveis
const routeNames: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/pipeline': 'Pipeline',
  '/deals': 'Deals',
  '/spaces': 'Ad Spaces',
  '/campaigns': 'Campaigns',
  '/forecast': 'Forecast',
  '/reports': 'Reports',
  '/integrations': 'Integrations',
  '/personal-settings': 'Personal Settings',
  '/business-settings': 'Business Settings',
  '/demo-site': 'Demo Site',
  '/auth': 'Authentication',
  '/reset-password': 'Reset Password'
};

export const usePageLogger = () => {
  const location = useLocation();
  const { logActivity } = useActivityLogger();
  const previousPath = useRef<string>('');

  useEffect(() => {
    // Verifica se há utilizador autenticado antes de fazer log
    const checkAuthAndLog = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Só faz log se houver utilizador autenticado
        if (!session?.user) {
          return;
        }

        const currentPath = location.pathname;
        
        // Evita log duplicado na primeira renderização ou mesma página
        if (previousPath.current === currentPath) {
          return;
        }

        // Obtém nome amigável da rota
        const getPageName = (path: string): string => {
          // Verifica rotas exatas primeiro
          if (routeNames[path]) {
            return routeNames[path];
          }
          
          // Verifica padrões de rota (ex: /deals/:id)
          if (path.startsWith('/deals/')) {
            return 'Deal Detail';
          }
          
          if (path.startsWith('/user-logs/')) {
            return 'User Activity Logs';
          }
          
          // Fallback para rota desconhecida
          return path.split('/').filter(Boolean).map(segment => 
            segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
          ).join(' ') || 'Unknown Page';
        };

        const pageName = getPageName(currentPath);

        // Log da navegação
        logActivity({
          action: 'page_visit',
          details: {
            page: pageName,
            path: currentPath,
            search: location.search,
            previousPage: previousPath.current ? getPageName(previousPath.current) : null,
            previousPath: previousPath.current || null,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || null
          },
          resource_type: 'page',
          resource_id: currentPath
        });

        // Atualiza referência para próxima navegação
        previousPath.current = currentPath;
      } catch (error) {
        console.error('Error in page logging:', error);
      }
    };

    checkAuthAndLog();
  }, [location.pathname, location.search, logActivity]);
};