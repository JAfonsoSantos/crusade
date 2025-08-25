import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyAvatar } from "./CompanyAvatar";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check } from "lucide-react";

interface SwitchCompanyModalProps {
  trigger: React.ReactNode;
  currentCompanyId: string;
  onCompanySwitch?: () => void;
}

type UserCompanyAccess = {
  id: string;
  company_id: string;
  role: string;
  is_current: boolean;
  companies: {
    id: string;
    name: string;
    email: string;
    website?: string;
    industry?: string;
    status: string;
  } | null;
};

export function SwitchCompanyModal({ trigger, currentCompanyId, onCompanySwitch }: SwitchCompanyModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies user has access to
  const { data: userCompanies = [], isLoading } = useQuery({
    queryKey: ["userCompanies"],
    queryFn: async () => {
      console.log("🔍 Fetching user companies...");
      const user = (await supabase.auth.getUser()).data.user;
      console.log("👤 User ID for company query:", user?.id);
      
      const { data, error } = await supabase
        .from("user_company_access")
        .select(`
          id,
          company_id,
          role,
          is_current,
          companies (
            id,
            name,
            email,
            website,
            industry,
            status
          )
        `)
        .eq("user_id", user?.id);

      if (error) {
        console.error("❌ Error fetching companies:", error);
        throw error;
      }
      
      console.log("📊 Companies fetched:", data);
      return data as UserCompanyAccess[];
    },
    enabled: isOpen,
  });

  // Filter companies based on search term
  const filteredCompanies = userCompanies.filter((access) => {
    // Skip entries where companies data is missing
    if (!access.companies) return false;
    
    return access.companies.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (access.companies.industry && access.companies.industry.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Switch company mutation
  const switchCompanyMutation = useMutation({
    mutationFn: async (newCompanyId: string) => {
      console.log("🚀 Starting switch company mutation for:", newCompanyId);
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");
      
      console.log("👤 User authenticated:", user.id);

      // First, set all is_current to false for this user
      console.log("⏰ Step 1: Setting all companies to not current");
      const { error: updateAllError } = await supabase
        .from("user_company_access")
        .update({ is_current: false })
        .eq("user_id", user.id);

      if (updateAllError) {
        console.error("❌ Error in step 1:", updateAllError);
        throw updateAllError;
      }
      console.log("✅ Step 1 completed");

      // Then set the selected company to current
      console.log("⏰ Step 2: Setting new company as current");
      const { error: setCurrentError } = await supabase
        .from("user_company_access")
        .update({ is_current: true })
        .eq("user_id", user.id)
        .eq("company_id", newCompanyId);

      if (setCurrentError) {
        console.error("❌ Error in step 2:", setCurrentError);
        throw setCurrentError;
      }
      console.log("✅ Step 2 completed");

      // Update the user's profile company_id
      console.log("⏰ Step 3: Updating profile company_id");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: newCompanyId })
        .eq("user_id", user.id);

      if (profileError) {
        console.error("❌ Error in step 3:", profileError);
        throw profileError;
      }
      console.log("✅ Step 3 completed - All done!");

      return newCompanyId;
    },
    onSuccess: (newCompanyId) => {
      console.log("🎉 Switch company success!", newCompanyId);
      toast({
        title: "Company switched",
        description: "Successfully switched to new company",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["userCompanies"] });
      
      setIsOpen(false);
      onCompanySwitch?.();
      
      // Refresh the page to update all data contexts
      console.log("🔄 Reloading page...");
      window.location.reload();
    },
    onError: (error) => {
      console.error("💥 Switch company mutation failed:", error);
      toast({
        title: "Error",
        description: "Failed to switch company",
        variant: "destructive",
      });
    },
  });

  const handleCompanySelect = (companyId: string) => {
    console.log("🔄 Attempting to switch to company:", companyId);
    console.log("🏢 Current company ID:", currentCompanyId);
    
    if (companyId !== currentCompanyId) {
      console.log("✅ Different company selected, proceeding with switch");
      switchCompanyMutation.mutate(companyId);
    } else {
      console.log("⚠️ Same company selected, ignoring");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Company
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Loading companies...
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {searchTerm ? "No companies found matching your search" : "No companies available"}
              </div>
            ) : (
              filteredCompanies.map((access) => (
                <div
                  key={access.company_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    access.company_id === currentCompanyId
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleCompanySelect(access.company_id)}
                >
                  <CompanyAvatar
                    companyName={access.companies?.name || "Unknown Company"}
                    size="sm"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {access.companies?.name || "Unknown Company"}
                    </div>
                    {access.companies?.industry && (
                      <div className="text-xs text-muted-foreground truncate">
                        {access.companies.industry}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {access.role === 'admin' && (
                      <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        Admin
                      </div>
                    )}
                    {access.company_id === currentCompanyId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}