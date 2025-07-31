export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ad_server_integrations: {
        Row: {
          api_key_encrypted: string | null
          company_id: string
          configuration: Json | null
          created_at: string
          id: string
          last_sync: string | null
          name: string
          platform_config: Json | null
          provider: string
          status: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          company_id: string
          configuration?: Json | null
          created_at?: string
          id?: string
          last_sync?: string | null
          name: string
          platform_config?: Json | null
          provider: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          company_id?: string
          configuration?: Json | null
          created_at?: string
          id?: string
          last_sync?: string | null
          name?: string
          platform_config?: Json | null
          provider?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_server_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_spaces: {
        Row: {
          base_price: number | null
          company_id: string
          created_at: string
          currency: string | null
          id: string
          location: string | null
          name: string
          price_model: string | null
          size: string | null
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          company_id: string
          created_at?: string
          currency?: string | null
          id?: string
          location?: string | null
          name: string
          price_model?: string | null
          size?: string | null
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          company_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          location?: string | null
          name?: string
          price_model?: string | null
          size?: string | null
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_spaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ad_spaces: {
        Row: {
          ad_space_id: string
          allocated_budget: number | null
          campaign_id: string
          created_at: string
          end_date: string | null
          id: string
          start_date: string | null
        }
        Insert: {
          ad_space_id: string
          allocated_budget?: number | null
          campaign_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
        }
        Update: {
          ad_space_id?: string
          allocated_budget?: number | null
          campaign_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ad_spaces_ad_space_id_fkey"
            columns: ["ad_space_id"]
            isOneToOne: false
            referencedRelation: "ad_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string
          status: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      integration_sync_history: {
        Row: {
          created_at: string
          duration_ms: number | null
          errors_count: number
          id: string
          integration_id: string
          operations: Json | null
          status: string
          sync_timestamp: string
          synced_count: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          errors_count?: number
          id?: string
          integration_id: string
          operations?: Json | null
          status?: string
          sync_timestamp?: string
          synced_count?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          errors_count?: number
          id?: string
          integration_id?: string
          operations?: Json | null
          status?: string
          sync_timestamp?: string
          synced_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_history_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ad_server_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_mappings: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          local_entity_id: string
          local_entity_type: string
          metadata: Json | null
          platform_entity_id: string
          platform_entity_type: string
          platform_parent_id: string | null
          platform_parent_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          local_entity_id: string
          local_entity_type: string
          metadata?: Json | null
          platform_entity_id: string
          platform_entity_type: string
          platform_parent_id?: string | null
          platform_parent_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          local_entity_id?: string
          local_entity_type?: string
          metadata?: Json | null
          platform_entity_id?: string
          platform_entity_type?: string
          platform_parent_id?: string | null
          platform_parent_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ad_server_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
