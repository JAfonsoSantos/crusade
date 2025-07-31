import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User as UserIcon, Mail, Save } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  company_id: string;
}

const PersonalSettings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: user } = await supabase.auth.getUser();
    
    if (user.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          email: user.user.email || '',
        });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    
    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: formData.full_name })
      .eq('user_id', profile.user_id);

    // Update email if changed
    const { data: user } = await supabase.auth.getUser();
    if (user.user && formData.email !== user.user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: formData.email
      });
      
      if (emailError) {
        toast({
          title: "Error",
          description: "Could not update email: " + emailError.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    if (profileError) {
      toast({
        title: "Error",
        description: "Could not update profile.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      await fetchProfile(); // Refresh profile data
    }
    
    setSaving(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Personal Settings</h2>
        <p className="text-muted-foreground">
          Manage your personal account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and display preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email address"
              />
              <p className="text-xs text-muted-foreground">
                Changing your email will require verification
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              View your account details and role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Role:</span>
              <span className="text-sm text-muted-foreground capitalize">
                {profile?.role || 'User'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Account ID:</span>
              <span className="text-sm text-muted-foreground font-mono">
                {profile?.user_id.slice(0, 8)}...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonalSettings;