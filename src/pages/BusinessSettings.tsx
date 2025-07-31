import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Globe, Mail, Save, Users } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  email: string;
  website: string;
  industry: string;
  status: string;
}

const BusinessSettings = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    website: '',
    industry: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    const { data: user } = await supabase.auth.getUser();
    
    if (user.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();

      if (profile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (companyData) {
          setCompany(companyData);
          setFormData({
            name: companyData.name || '',
            email: companyData.email || '',
            website: companyData.website || '',
            industry: companyData.industry || '',
          });
        }
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);
    
    const { error } = await supabase
      .from('companies')
      .update({
        name: formData.name,
        email: formData.email,
        website: formData.website,
        industry: formData.industry,
      })
      .eq('id', company.id);

    if (error) {
      toast({
        title: "Error",
        description: "Could not update company information.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Company information updated successfully!",
      });
      await fetchCompany(); // Refresh company data
    }
    
    setSaving(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Settings</h2>
          <p className="text-muted-foreground">
            No company found. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Business Settings</h2>
        <p className="text-muted-foreground">
          Manage your company information and business preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Update your company details and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your company name"
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="company_email">Company Email</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter company email address"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.yourcompany.com"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Select 
                value={formData.industry} 
                onValueChange={(value) => setFormData({ ...formData, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advertising">Advertising & Marketing</SelectItem>
                  <SelectItem value="media">Media & Publishing</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="finance">Finance & Banking</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="travel">Travel & Tourism</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
              <Users className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription>
              View your company account status and details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Status:</span>
              <span className="text-sm text-green-600 capitalize font-medium">
                {company.status || 'Active'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Company ID:</span>
              <span className="text-sm text-muted-foreground font-mono">
                {company.id.slice(0, 8)}...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessSettings;