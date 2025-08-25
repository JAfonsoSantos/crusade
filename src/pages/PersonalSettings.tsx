import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User as UserIcon, Mail, Save, Upload, Camera, Globe } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useLanguage, Language } from '@/contexts/LanguageContext';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  company_id: string;
  avatar_url?: string;
}

const PersonalSettings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();

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
        title: t('common.error'),
        description: "Could not update email: " + emailError.message,
        variant: "destructive",
      });
        setSaving(false);
        return;
      }
    }

    if (profileError) {
      toast({
        title: t('common.error'),
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: t('common.error'), 
        description: "Image size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldFileName = profile.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${profile.user_id}/${oldFileName}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      // Refresh profile data
      await fetchProfile();

      toast({
        title: "Success",
        description: "Avatar updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('settings.personalSettings')}</h2>
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
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4 pb-6 border-b">
              <div className="relative">
                <UserAvatar
                  src={profile?.avatar_url}
                  name={formData.full_name}
                  size="lg"
                  className="cursor-pointer"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 p-0 rounded-full"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  title="Change avatar"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Change Avatar"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG up to 5MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

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
              {saving ? "Saving..." : t('common.save')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>
              Select your preferred language for the interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="language">{t('settings.language')}</Label>
              <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('language.en')}</SelectItem>
                  <SelectItem value="fr">{t('language.fr')}</SelectItem>
                  <SelectItem value="es">{t('language.es')}</SelectItem>
                  <SelectItem value="pt">{t('language.pt')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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