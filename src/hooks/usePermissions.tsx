import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserPermissions {
  pipeline: boolean;
  campaigns: boolean;
  insights: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (user.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, permissions')
          .eq('user_id', user.user.id)
          .single();

        if (error) {
          console.error('Error fetching permissions:', error);
          return;
        }

        setIsAdmin(profile?.role === 'admin');
        
        // Admin has all permissions
        if (profile?.role === 'admin') {
          setPermissions({
            pipeline: true,
            campaigns: true,
            insights: true
          });
        } else {
          // Use stored permissions or default
          const defaultPermissions: UserPermissions = {
            pipeline: false,
            campaigns: true,
            insights: false
          };
          
          if (profile?.permissions && typeof profile.permissions === 'object' && !Array.isArray(profile.permissions)) {
            const storedPermissions = profile.permissions as Record<string, any>;
            const userPermissions: UserPermissions = {
              pipeline: Boolean(storedPermissions.pipeline),
              campaigns: Boolean(storedPermissions.campaigns),
              insights: Boolean(storedPermissions.insights)
            };
            setPermissions(userPermissions);
          } else {
            setPermissions(defaultPermissions);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: keyof UserPermissions): boolean => {
    if (isAdmin) return true;
    if (!permissions) return false;
    return permissions[module];
  };

  const requestAccess = async (module: keyof UserPermissions, message?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase.functions.invoke('request-access', {
        body: {
          module_name: module,
          message: message || `Requesting access to ${module.charAt(0).toUpperCase() + module.slice(1)}`
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error requesting access:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    permissions,
    isAdmin,
    loading,
    hasPermission,
    requestAccess,
    refetch: fetchPermissions
  };
};