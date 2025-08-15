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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          customer_contact: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          end_time: string
          id: string
          notes: string | null
          professional_id: string | null
          service_id: string
          start_time: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_contact: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          end_time: string
          id?: string
          notes?: string | null
          professional_id?: string | null
          service_id: string
          start_time: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_contact?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          professional_id?: string | null
          service_id?: string
          start_time?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_stats: {
        Row: {
          created_at: string | null
          failed_backups: number | null
          id: string
          last_backup_at: string | null
          next_scheduled_backup: string | null
          successful_backups: number | null
          tenant_id: string | null
          total_backups: number | null
          total_size: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          failed_backups?: number | null
          id?: string
          last_backup_at?: string | null
          next_scheduled_backup?: string | null
          successful_backups?: number | null
          tenant_id?: string | null
          total_backups?: number | null
          total_size?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          failed_backups?: number | null
          id?: string
          last_backup_at?: string | null
          next_scheduled_backup?: string | null
          successful_backups?: number | null
          tenant_id?: string | null
          total_backups?: number | null
          total_size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          backup_type: string
          completed_at: string | null
          compression_ratio: number | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          file_path: string | null
          file_size: number | null
          id: string
          name: string
          retention_days: number | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          compression_ratio?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name: string
          retention_days?: number | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          compression_ratio?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name?: string
          retention_days?: number | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string | null
          closed: boolean
          created_at: string
          id: string
          open_time: string | null
          tenant_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          close_time?: string | null
          closed?: boolean
          created_at?: string
          id?: string
          open_time?: string | null
          tenant_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          close_time?: string | null
          closed?: boolean
          created_at?: string
          id?: string
          open_time?: string | null
          tenant_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          contact: string
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          scheduled_at: string
          status: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          scheduled_at: string
          status?: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          scheduled_at?: string
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_owner: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_owner?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_owner?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenues: {
        Row: {
          amount_cents: number
          appointment_id: string | null
          created_at: string
          id: string
          professional_name: string | null
          revenue_date: string
          service_name: string | null
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          professional_name?: string | null
          revenue_date?: string
          service_name?: string | null
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          professional_name?: string | null
          revenue_date?: string
          service_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenues_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_config: {
        Row: {
          block_duration: number | null
          brute_force_protection: boolean | null
          created_at: string | null
          ddos_protection: boolean | null
          geo_blocking: boolean | null
          id: string
          rate_limit_enabled: boolean | null
          requests_per_day: number | null
          requests_per_hour: number | null
          requests_per_minute: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          block_duration?: number | null
          brute_force_protection?: boolean | null
          created_at?: string | null
          ddos_protection?: boolean | null
          geo_blocking?: boolean | null
          id?: string
          rate_limit_enabled?: boolean | null
          requests_per_day?: number | null
          requests_per_hour?: number | null
          requests_per_minute?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          block_duration?: number | null
          brute_force_protection?: boolean | null
          created_at?: string | null
          ddos_protection?: boolean | null
          geo_blocking?: boolean | null
          id?: string
          rate_limit_enabled?: boolean | null
          requests_per_day?: number | null
          requests_per_hour?: number | null
          requests_per_minute?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          description: string
          id: string
          ip_address: unknown | null
          resolved: boolean | null
          severity: string
          tenant_id: string | null
          timestamp: string | null
          type: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          ip_address?: unknown | null
          resolved?: boolean | null
          severity: string
          tenant_id?: string | null
          timestamp?: string | null
          type: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: unknown | null
          resolved?: boolean | null
          severity?: string
          tenant_id?: string | null
          timestamp?: string | null
          type?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_stats: {
        Row: {
          blocked_ips: number | null
          created_at: string | null
          ddos_attempts: number | null
          id: string
          last_24_hours: number | null
          rate_limit_hits: number | null
          security_score: number | null
          suspicious_activities: number | null
          tenant_id: string | null
          total_events: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_ips?: number | null
          created_at?: string | null
          ddos_attempts?: number | null
          id?: string
          last_24_hours?: number | null
          rate_limit_hits?: number | null
          security_score?: number | null
          suspicious_activities?: number | null
          tenant_id?: string | null
          total_events?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_ips?: number | null
          created_at?: string | null
          ddos_attempts?: number | null
          id?: string
          last_24_hours?: number | null
          rate_limit_hits?: number | null
          security_score?: number | null
          suspicious_activities?: number | null
          tenant_id?: string | null
          total_events?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price_cents: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          price_cents: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          processed: boolean | null
          processing_attempts: number | null
          stripe_data: Json
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          processed?: boolean | null
          processing_attempts?: number | null
          stripe_data: Json
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          processed?: boolean | null
          processing_attempts?: number | null
          stripe_data?: Json
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          payment_completed: boolean | null
          plan_selected: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          theme_selected: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          payment_completed?: boolean | null
          plan_selected?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          theme_selected?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          payment_completed?: boolean | null
          plan_selected?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          theme_selected?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_tier: string | null
          status: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string | null
          status?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string | null
          status?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          description: string
          id: string
          resolved_at: string | null
          severity: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          resolved_at?: string | null
          severity: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          created_at: string | null
          health_score: number | null
          id: string
          last_check_at: string | null
          next_check_at: string | null
          overall_status: string
          tenant_id: string | null
          updated_at: string | null
          uptime_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_check_at?: string | null
          next_check_at?: string | null
          overall_status?: string
          tenant_id?: string | null
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_check_at?: string | null
          next_check_at?: string | null
          overall_status?: string
          tenant_id?: string | null
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_health_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_name: string
          metric_type: string
          metric_value: number
          tenant_id: string | null
          timestamp: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_name: string
          metric_type: string
          metric_value: number
          tenant_id?: string | null
          timestamp?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_name?: string
          metric_type?: string
          metric_value?: number
          tenant_id?: string | null
          timestamp?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          payment_completed: boolean | null
          phone: string | null
          plan: string
          plan_selected: string | null
          plan_status: string | null
          plan_tier: string | null
          slug: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          theme_variant: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          payment_completed?: boolean | null
          phone?: string | null
          plan?: string
          plan_selected?: string | null
          plan_status?: string | null
          plan_tier?: string | null
          slug: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          theme_variant?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_completed?: boolean | null
          phone?: string | null
          plan?: string
          plan_selected?: string | null
          plan_status?: string | null
          plan_tier?: string | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          theme_variant?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_blocks: {
        Row: {
          created_at: string
          end_time: string
          id: string
          professional_id: string | null
          reason: string | null
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          professional_id?: string | null
          reason?: string | null
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          professional_id?: string | null
          reason?: string | null
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_two_factor: {
        Row: {
          created_at: string | null
          email: string | null
          enabled: boolean | null
          id: string
          method_type: string
          phone_number: string | null
          secret_key: string | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          enabled?: boolean | null
          id?: string
          method_type: string
          phone_number?: string | null
          secret_key?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          enabled?: boolean | null
          id?: string
          method_type?: string
          phone_number?: string | null
          secret_key?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      associate_payment_to_tenant: {
        Args: {
          p_plan_tier: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      auto_confirm_appointments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_and_confirm_appointments: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          appointment_id: string
          customer_name: string
          scheduled_at: string
          service_name: string
          status: string
        }[]
      }
      check_auto_confirmation_access: {
        Args: { tenant_id: string }
        Returns: boolean
      }
      check_bulk_actions_access: {
        Args: { tenant_id: string }
        Returns: boolean
      }
      check_financial_dashboard_access: {
        Args: { tenant_id: string }
        Returns: boolean
      }
      check_professional_limit: {
        Args: { tenant_id: string }
        Returns: boolean
      }
      check_user_permissions: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      create_tenant_for_checkout: {
        Args: {
          p_email: string
          p_plan_tier: string
          p_theme_variant?: string
          p_user_id: string
        }
        Returns: {
          stripe_customer_id: string
          tenant_id: string
        }[]
      }
      get_auto_confirmation_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          auto_confirmed: number
          cancelled: number
          manually_confirmed: number
          pending: number
          total_appointments: number
        }[]
      }
      get_plan_limits: {
        Args: { p_user_id: string }
        Returns: {
          has_advanced_analytics: boolean
          has_auto_confirmation: boolean
          has_financial_dashboard: boolean
          max_professionals: number
          max_services: number
        }[]
      }
      handle_stripe_session: {
        Args: {
          p_customer_email: string
          p_customer_id: string
          p_period_end: string
          p_period_start: string
          p_plan_tier: string
          p_price_id: string
          p_product_id: string
          p_subscription_id: string
          p_subscription_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      handle_subscription_deleted: {
        Args: { p_new_status: string; p_subscription_id: string }
        Returns: undefined
      }
      process_stripe_payment_event: {
        Args: {
          p_event_id: string
          p_plan_tier: string
          p_stripe_customer_id: string
          p_stripe_price_id: string
          p_stripe_product_id: string
          p_stripe_subscription_id: string
          p_tenant_id: string
        }
        Returns: boolean
      }
      sync_all_payment_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_tenant_plan: {
        Args: { new_plan: string; tenant_uuid: string }
        Returns: undefined
      }
      update_tenant_subscription: {
        Args: {
          p_subscribed: boolean
          p_subscription_tier: string
          p_user_id: string
        }
        Returns: undefined
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
