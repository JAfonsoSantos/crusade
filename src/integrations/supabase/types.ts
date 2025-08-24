export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      _mv_refresh_flags: {
        Row: {
          key: string
          last_refresh_at: string | null
          last_request_at: string
        }
        Insert: {
          key: string
          last_refresh_at?: string | null
          last_request_at?: string
        }
        Update: {
          key?: string
          last_refresh_at?: string | null
          last_request_at?: string
        }
        Relationships: []
      }
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
          ad_server: string | null
          base_price: number | null
          clicks: number | null
          company_id: string
          created_at: string
          currency: string | null
          external_id: string | null
          id: string
          impressions: number | null
          is_active: boolean | null
          last_click: string | null
          last_impression: string | null
          location: string | null
          name: string
          price_model: string | null
          size: string | null
          status: string | null
          type: string
          updated_at: string
          usage_status: string | null
        }
        Insert: {
          ad_server?: string | null
          base_price?: number | null
          clicks?: number | null
          company_id: string
          created_at?: string
          currency?: string | null
          external_id?: string | null
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          last_click?: string | null
          last_impression?: string | null
          location?: string | null
          name: string
          price_model?: string | null
          size?: string | null
          status?: string | null
          type: string
          updated_at?: string
          usage_status?: string | null
        }
        Update: {
          ad_server?: string | null
          base_price?: number | null
          clicks?: number | null
          company_id?: string
          created_at?: string
          currency?: string | null
          external_id?: string | null
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          last_click?: string | null
          last_impression?: string | null
          location?: string | null
          name?: string
          price_model?: string | null
          size?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          usage_status?: string | null
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
      advertisers: {
        Row: {
          company_id: string
          created_at: string | null
          external_id: string | null
          id: string
          name: string
          source: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          name: string
          source?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          name?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisers_company_id_fkey"
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
          flight_id: string | null
          id: string
          start_date: string | null
        }
        Insert: {
          ad_space_id: string
          allocated_budget?: number | null
          campaign_id: string
          created_at?: string
          end_date?: string | null
          flight_id?: string | null
          id?: string
          start_date?: string | null
        }
        Update: {
          ad_space_id?: string
          allocated_budget?: number | null
          campaign_id?: string
          created_at?: string
          end_date?: string | null
          flight_id?: string | null
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
            foreignKeyName: "campaign_ad_spaces_ad_space_id_fkey"
            columns: ["ad_space_id"]
            isOneToOne: false
            referencedRelation: "v_flight_spaces"
            referencedColumns: ["ad_space_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["flight_id"]
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
      creatives: {
        Row: {
          asset_url: string | null
          click_url: string | null
          company_id: string
          created_at: string | null
          external_id: string | null
          flight_id: string
          id: string
          source: string | null
          template: Json | null
          type: Database["public"]["Enums"]["creative_type_enum"]
        }
        Insert: {
          asset_url?: string | null
          click_url?: string | null
          company_id: string
          created_at?: string | null
          external_id?: string | null
          flight_id: string
          id?: string
          source?: string | null
          template?: Json | null
          type: Database["public"]["Enums"]["creative_type_enum"]
        }
        Update: {
          asset_url?: string | null
          click_url?: string | null
          company_id?: string
          created_at?: string | null
          external_id?: string | null
          flight_id?: string
          id?: string
          source?: string | null
          template?: Json | null
          type?: Database["public"]["Enums"]["creative_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "creatives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "creatives_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "creatives_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "creatives_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "creatives_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "creatives_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["flight_id"]
          },
        ]
      }
      flight_products: {
        Row: {
          flight_id: string
          max_bid: number | null
          priority: number | null
          product_id: string
        }
        Insert: {
          flight_id: string
          max_bid?: number | null
          priority?: number | null
          product_id: string
        }
        Update: {
          flight_id?: string
          max_bid?: number | null
          priority?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          ad_server: string | null
          budget: number | null
          campaign_id: string
          clicks: number | null
          conversions: number | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string
          external_id: string | null
          id: string
          impressions: number | null
          name: string
          priority: number | null
          spend: number | null
          start_date: string
          status: string | null
          targeting_criteria: Json | null
          updated_at: string
        }
        Insert: {
          ad_server?: string | null
          budget?: number | null
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date: string
          external_id?: string | null
          id?: string
          impressions?: number | null
          name: string
          priority?: number | null
          spend?: number | null
          start_date: string
          status?: string | null
          targeting_criteria?: Json | null
          updated_at?: string
        }
        Update: {
          ad_server?: string | null
          budget?: number | null
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string
          external_id?: string | null
          id?: string
          impressions?: number | null
          name?: string
          priority?: number | null
          spend?: number | null
          start_date?: string
          status?: string | null
          targeting_criteria?: Json | null
          updated_at?: string
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
          {
            foreignKeyName: "integration_sync_history_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_integrations_sync_status"
            referencedColumns: ["integration_id"]
          },
          {
            foreignKeyName: "integration_sync_history_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_sync_health"
            referencedColumns: ["integration_id"]
          },
        ]
      }
      metrics_daily: {
        Row: {
          ad_space_id: string | null
          campaign_id: string | null
          clicks: number | null
          company_id: string
          conversions: number | null
          creative_id: string | null
          currency: string | null
          date: string
          flight_id: string | null
          id: number
          impressions: number | null
          product_id: string | null
          revenue: number | null
          source: string | null
          spend: number | null
        }
        Insert: {
          ad_space_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          company_id: string
          conversions?: number | null
          creative_id?: string | null
          currency?: string | null
          date: string
          flight_id?: string | null
          id?: number
          impressions?: number | null
          product_id?: string | null
          revenue?: number | null
          source?: string | null
          spend?: number | null
        }
        Update: {
          ad_space_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          company_id?: string
          conversions?: number | null
          creative_id?: string | null
          currency?: string | null
          date?: string
          flight_id?: string | null
          id?: number
          impressions?: number | null
          product_id?: string | null
          revenue?: number | null
          source?: string | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_ad_space_id_fkey"
            columns: ["ad_space_id"]
            isOneToOne: false
            referencedRelation: "ad_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_ad_space_id_fkey"
            columns: ["ad_space_id"]
            isOneToOne: false
            referencedRelation: "v_flight_spaces"
            referencedColumns: ["ad_space_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          advertiser_id: string | null
          amount: number | null
          close_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          last_activity_date: string | null
          name: string
          next_steps: string | null
          owner_id: string | null
          probability: number | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          advertiser_id?: string | null
          amount?: number | null
          close_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          last_activity_date?: string | null
          name: string
          next_steps?: string | null
          owner_id?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string | null
          amount?: number | null
          close_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          last_activity_date?: string | null
          name?: string
          next_steps?: string | null
          owner_id?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          opportunity_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          opportunity_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
          {
            foreignKeyName: "platform_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_integrations_sync_status"
            referencedColumns: ["integration_id"]
          },
          {
            foreignKeyName: "platform_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_sync_health"
            referencedColumns: ["integration_id"]
          },
        ]
      }
      product_catalog: {
        Row: {
          advertiser_id: string | null
          attributes: Json | null
          brand: string | null
          category: string | null
          company_id: string
          created_at: string | null
          currency: string | null
          external_id: string | null
          id: string
          price: number | null
          sku: string | null
          source: string | null
          title: string
          url: string | null
        }
        Insert: {
          advertiser_id?: string | null
          attributes?: Json | null
          brand?: string | null
          category?: string | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          external_id?: string | null
          id?: string
          price?: number | null
          sku?: string | null
          source?: string | null
          title: string
          url?: string | null
        }
        Update: {
          advertiser_id?: string | null
          attributes?: Json | null
          brand?: string | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          external_id?: string | null
          id?: string
          price?: number | null
          sku?: string | null
          source?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_catalog_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      sync_jobs: {
        Row: {
          company_id: string
          created_at: string | null
          cursor: Json | null
          error: string | null
          finished_at: string | null
          id: string
          integration_id: string | null
          kind: string
          scheduled_at: string | null
          scope: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          cursor?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string | null
          kind: string
          scheduled_at?: string | null
          scope?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          cursor?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string | null
          kind?: string
          scheduled_at?: string | null
          scope?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ad_server_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_integrations_sync_status"
            referencedColumns: ["integration_id"]
          },
          {
            foreignKeyName: "sync_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_sync_health"
            referencedColumns: ["integration_id"]
          },
        ]
      }
    }
    Views: {
      mv_campaign_pacing: {
        Row: {
          budget: number | null
          campaign_id: string | null
          campaign_name: string | null
          company_id: string | null
          currency: string | null
          days_elapsed: number | null
          days_total: number | null
          end_date: string | null
          pacing_index_pct: number | null
          pct_budget_spent: number | null
          pct_time_elapsed: number | null
          spend: number | null
          start_date: string | null
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
      mv_campaign_performance: {
        Row: {
          budget: number | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          ctr_pct: number | null
          currency: string | null
          cvr_pct: number | null
          end_date: string | null
          impressions: number | null
          spend: number | null
          start_date: string | null
          status: string | null
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
      mv_flight_performance: {
        Row: {
          ad_server: string | null
          campaign_id: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          ctr_pct: number | null
          cvr_pct: number | null
          end_date: string | null
          flight_id: string | null
          flight_name: string | null
          impressions: number | null
          priority: number | null
          spend: number | null
          start_date: string | null
          status: string | null
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
      mv_gantt_items: {
        Row: {
          ad_server: string | null
          campaign_id: string | null
          campaign_name: string | null
          company_id: string | null
          end_date: string | null
          flight_id: string | null
          flight_name: string | null
          priority: number | null
          start_date: string | null
          status: string | null
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
      v_campaign_kpis_30d: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          impressions: number | null
          revenue: number | null
          spend: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "metrics_daily_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_campaign_pacing: {
        Row: {
          budget: number | null
          campaign_id: string | null
          campaign_name: string | null
          company_id: string | null
          currency: string | null
          days_elapsed: number | null
          days_total: number | null
          end_date: string | null
          pacing_index_pct: number | null
          pct_budget_spent: number | null
          pct_time_elapsed: number | null
          spend: number | null
          start_date: string | null
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
      v_campaign_performance: {
        Row: {
          budget: number | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          ctr_pct: number | null
          currency: string | null
          cvr_pct: number | null
          end_date: string | null
          impressions: number | null
          spend: number | null
          start_date: string | null
          status: string | null
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
      v_campaign_totals: {
        Row: {
          budget: number | null
          campaign_end: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_start: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          currency: string | null
          impressions: number | null
          spend: number | null
          status: string | null
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
      v_flight_performance: {
        Row: {
          ad_server: string | null
          campaign_id: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          ctr_pct: number | null
          cvr_pct: number | null
          end_date: string | null
          flight_id: string | null
          flight_name: string | null
          impressions: number | null
          priority: number | null
          spend: number | null
          start_date: string | null
          status: string | null
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
      v_flight_products_count: {
        Row: {
          flight_id: string | null
          products_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "flight_products_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["flight_id"]
          },
        ]
      }
      v_flight_spaces: {
        Row: {
          ad_space_id: string | null
          ad_space_name: string | null
          assignment_end: string | null
          assignment_start: string | null
          base_price: number | null
          campaign_id: string | null
          company_id: string | null
          flight_id: string | null
          flight_name: string | null
          price_model: string | null
          space_currency: string | null
          space_location: string | null
          space_size: string | null
          space_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_pacing"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_ad_spaces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "fk_campaign_ad_spaces_flight"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["flight_id"]
          },
        ]
      }
      v_flight_timeseries_30d: {
        Row: {
          clicks: number | null
          company_id: string | null
          conversions: number | null
          date: string | null
          flight_id: string | null
          impressions: number | null
          revenue: number | null
          spend: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mv_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flight_performance"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_flights_gantt"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items"
            referencedColumns: ["flight_id"]
          },
          {
            foreignKeyName: "metrics_daily_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "v_gantt_items_fast"
            referencedColumns: ["flight_id"]
          },
        ]
      }
      v_flights_gantt: {
        Row: {
          ad_server: string | null
          campaign_id: string | null
          campaign_name: string | null
          company_id: string | null
          end_date: string | null
          external_id: string | null
          flight_id: string | null
          flight_name: string | null
          priority: number | null
          start_date: string | null
          status: string | null
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
      v_gantt_items: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          company_id: string | null
          end_date: string | null
          flight_id: string | null
          flight_name: string | null
          priority: number | null
          start_date: string | null
          status: string | null
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
      v_gantt_items_fast: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          end_date: string | null
          flight_id: string | null
          flight_name: string | null
          impressions: number | null
          priority: number | null
          revenue: number | null
          spend: number | null
          start_date: string | null
          status: string | null
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
      v_integrations_sync_status: {
        Row: {
          company_id: string | null
          duration_ms: number | null
          errors_count: number | null
          integration_id: string | null
          integration_status: string | null
          last_attempt_at: string | null
          last_attempt_status: string | null
          last_sync_at: string | null
          name: string | null
          provider: string | null
          synced_count: number | null
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
      v_platform_mappings_flat: {
        Row: {
          company_id: string | null
          created_at: string | null
          integration_id: string | null
          local_entity_id: string | null
          local_entity_type: string | null
          metadata: Json | null
          platform_entity_id: string | null
          platform_entity_type: string | null
          platform_parent_id: string | null
          platform_parent_type: string | null
          provider: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_server_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ad_server_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_integrations_sync_status"
            referencedColumns: ["integration_id"]
          },
          {
            foreignKeyName: "platform_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "v_sync_health"
            referencedColumns: ["integration_id"]
          },
        ]
      }
      v_sync_health: {
        Row: {
          company_id: string | null
          errors_count: number | null
          integration_id: string | null
          last_status: string | null
          last_sync_at: string | null
          name: string | null
          source: string | null
          synced_count: number | null
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
    }
    Functions: {
      _drop_policy_if_exists: {
        Args: { pol: unknown; tbl: unknown }
        Returns: undefined
      }
      current_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      refresh_all_materialized: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_gantt_fast: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      creative_type_enum: "banner" | "listing" | "video" | "html"
      status_enum: "draft" | "active" | "paused" | "ended"
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
    Enums: {
      creative_type_enum: ["banner", "listing", "video", "html"],
      status_enum: ["draft", "active", "paused", "ended"],
    },
  },
} as const
