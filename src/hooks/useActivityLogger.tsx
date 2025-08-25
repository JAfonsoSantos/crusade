import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogActivityParams {
  action: string;
  details?: Record<string, any>;
  resource_type?: string;
  resource_id?: string;
}

export const useActivityLogger = () => {
  const logActivity = useCallback(async ({
    action,
    details = {},
    resource_type,
    resource_id
  }: LogActivityParams) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.warn('No session found for activity logging');
        return;
      }

      await supabase.functions.invoke('log-activity', {
        body: {
          action,
          details,
          resource_type,
          resource_id
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, []);

  return { logActivity };
};