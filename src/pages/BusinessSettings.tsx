import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Save, Users, Plus, Edit, Trash2, RotateCcw, ShieldCheck } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  email: string;
  website: string;
  industry: string;
  status: string;
}

interface CompanyUser {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  permissions?: {
    pipeline: boolean;
    campaigns: boolean;
    insights: boolean;
  };
}

interface UserFormData {
  full_name: string;
  email: string;
  role: string;
  permissions: {
    pipeline: boolean;
    campaigns: boolean;
    insights: boolean;
  };
}

const BusinessSettings = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    website: '',
    industry: '',
  });
  const [userFormData, setUserFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    role: 'user',
    permissions: {
      pipeline: false,
      campaigns: true,
      insights: false
    }
  });
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompany();
  }, []);

  useEffect(() => {
    if (hasCompany && isAdmin && company?.id) {
      fetchCompanyUsers();
    }
  }, [hasCompany, isAdmin, company?.id]);

  const fetchCompany = async () => {
    const { data: user } = await supabase.auth.getUser();
    
    if (user.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('user_id', user.user.id)
        .single();

      if (profile?.company_id) {
        setIsAdmin(profile.role === 'admin');
        
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (companyData) {
          setCompany(companyData);
          setHasCompany(true);
          setFormData({
            name: companyData.name || '',
            email: companyData.email || '',
            website: companyData.website || '',
            industry: companyData.industry || '',
          });
        } else {
          setHasCompany(false);
        }
      } else {
        setHasCompany(false);
      }
    }
    setLoading(false);
  };

  const fetchCompanyUsers = async () => {
    if (!company?.id) return;
    
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        full_name,
        role,
        permissions
      `)
      .eq('company_id', company.id);

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    // Convert users with proper permission typing
    const typedUsers: CompanyUser[] = (users || []).map(user => ({
      ...user,
      permissions: user.permissions && typeof user.permissions === 'object' && !Array.isArray(user.permissions) ? 
        {
          pipeline: Boolean((user.permissions as any).pipeline),
          campaigns: Boolean((user.permissions as any).campaigns),
          insights: Boolean((user.permissions as any).insights)
        } : undefined
    }));

    setCompanyUsers(typedUsers);
  };

  const handleSave = async () => {
    setSaving(true);
    
    if (company) {
      // Update existing company
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
        await fetchCompany();
      }
    } else {
      // Create new company
      const { data: user } = await supabase.auth.getUser();
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          email: formData.email,
          website: formData.website,
          industry: formData.industry,
        })
        .select()
        .single();

      if (companyError) {
        toast({
          title: "Error",
          description: "Could not create company.",
          variant: "destructive",
        });
      } else {
        // Update user profile with company_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ company_id: newCompany.id })
          .eq('user_id', user.user?.id);

        if (profileError) {
          toast({
            title: "Error",
            description: "Could not associate company with your profile.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Company created and associated successfully!",
          });
          await fetchCompany();
        }
      }
    }
    
    setSaving(false);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserFormData({ 
      full_name: '', 
      email: '', 
      role: 'user',
      permissions: {
        pipeline: false,
        campaigns: true,
        insights: false
      }
    });
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (user: CompanyUser) => {
    setEditingUser(user);
    setUserFormData({
      full_name: user.full_name || '',
      email: '', // We'll need to get this from auth.users or keep it empty for editing
      role: user.role,
      permissions: user.permissions || {
        pipeline: false,
        campaigns: true,
        insights: false
      }
    });
    setIsUserDialogOpen(true);
  };

  const handleUserSave = async () => {
    if (editingUser) {
      // Update existing user
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userFormData.full_name,
          role: userFormData.role,
          permissions: userFormData.permissions
        })
        .eq('id', editingUser.id);

      if (error) {
        toast({
          title: "Error",
          description: "Could not update user.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "User updated successfully!",
        });
        setIsUserDialogOpen(false);
        fetchCompanyUsers();
      }
    } else {
      // Create new user - this would require auth.admin.createUser which needs service role
      toast({
        title: "Info",
        description: "Creating new users requires additional setup. Contact your administrator.",
      });
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Could not delete user.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
      fetchCompanyUsers();
    }
  };

  const handlePasswordReset = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Password reset email sent!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not send password reset email.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Settings</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show to admins
  if (hasCompany && !isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Settings</h2>
          <p className="text-muted-foreground">Access restricted to administrators only.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-5 w-5" />
              You need administrator privileges to access business settings.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show create company form if no company exists
  if (hasCompany === false) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Settings</h2>
          <p className="text-muted-foreground">
            Create your company profile to manage business settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Company
            </CardTitle>
            <CardDescription>
              Set up your company information to start managing ad spaces and campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your company name"
                required
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="company_email">Company Email *</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter company email address"
                required
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

            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name || !formData.email} 
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {saving ? "Creating Company..." : "Create Company"}
            </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  // Show edit company form if company exists
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Business Settings</h2>
        <p className="text-muted-foreground">
          Manage your company information and user accounts
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

            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.email} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Update Company"}
            </Button>
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Company Users
                </CardTitle>
                <CardDescription>
                  Manage user accounts and permissions for your company.
                </CardDescription>
              </div>
              <Button onClick={handleAddUser}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Insights</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || 'No name'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Checkbox 
                          checked={user.role === 'admin' || user.permissions?.pipeline || false} 
                          disabled 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Checkbox 
                          checked={user.role === 'admin' || user.permissions?.campaigns || false} 
                          disabled 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Checkbox 
                          checked={user.role === 'admin' || user.permissions?.insights || false} 
                          disabled 
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePasswordReset(user.user_id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUserDelete(user.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {companyUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="user_name">Full Name</Label>
              <Input
                id="user_name"
                value={userFormData.full_name}
                onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            
            {!editingUser && (
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="user_email">Email</Label>
                <Input
                  id="user_email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            )}

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="user_role">Role</Label>
              <Select 
                value={userFormData.role} 
                onValueChange={(value) => {
                  const newPermissions = value === 'admin' ? 
                    { pipeline: true, campaigns: true, insights: true } :
                    { pipeline: false, campaigns: true, insights: false };
                  
                  setUserFormData({ 
                    ...userFormData, 
                    role: value,
                    permissions: newPermissions
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userFormData.role !== 'admin' && (
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pipeline-permission"
                      checked={userFormData.permissions.pipeline}
                      onCheckedChange={(checked) => 
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            pipeline: Boolean(checked)
                          }
                        })
                      }
                    />
                    <Label htmlFor="pipeline-permission" className="text-sm font-normal">
                      Pipeline - Access to sales pipeline management
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="campaigns-permission"
                      checked={userFormData.permissions.campaigns}
                      onCheckedChange={(checked) => 
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            campaigns: Boolean(checked)
                          }
                        })
                      }
                    />
                    <Label htmlFor="campaigns-permission" className="text-sm font-normal">
                      Campaigns - Access to campaign management
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="insights-permission"
                      checked={userFormData.permissions.insights}
                      onCheckedChange={(checked) => 
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            insights: Boolean(checked)
                          }
                        })
                      }
                    />
                    <Label htmlFor="insights-permission" className="text-sm font-normal">
                      Insights - Access to reports and analytics
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUserSave}>
              {editingUser ? 'Update User' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessSettings;