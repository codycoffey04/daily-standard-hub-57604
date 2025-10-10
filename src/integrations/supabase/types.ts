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
      accountability_reviews: {
        Row: {
          activities_achieved: string[] | null
          activity_comments: string | null
          call_recording_reviewed: string | null
          call_takeaways: string | null
          course_corrections_addressed: boolean | null
          created_at: string | null
          daily_entry_id: string | null
          expansion_topics: string | null
          id: string
          metrics_achieved: boolean | null
          quick_meeting_notes: string | null
          reviewer_id: string | null
          sales_checklist: string | null
          weak_steps: string[] | null
        }
        Insert: {
          activities_achieved?: string[] | null
          activity_comments?: string | null
          call_recording_reviewed?: string | null
          call_takeaways?: string | null
          course_corrections_addressed?: boolean | null
          created_at?: string | null
          daily_entry_id?: string | null
          expansion_topics?: string | null
          id?: string
          metrics_achieved?: boolean | null
          quick_meeting_notes?: string | null
          reviewer_id?: string | null
          sales_checklist?: string | null
          weak_steps?: string[] | null
        }
        Update: {
          activities_achieved?: string[] | null
          activity_comments?: string | null
          call_recording_reviewed?: string | null
          call_takeaways?: string | null
          course_corrections_addressed?: boolean | null
          created_at?: string | null
          daily_entry_id?: string | null
          expansion_topics?: string | null
          id?: string
          metrics_achieved?: boolean | null
          quick_meeting_notes?: string | null
          reviewer_id?: string | null
          sales_checklist?: string | null
          weak_steps?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "accountability_reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: true
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: true
            referencedRelation: "entry_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "accountability_reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: true
            referencedRelation: "yesterday_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "accountability_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          entry_month: string
          id: string
          items_total: number
          locked_after: string
          outbound_dials: number
          producer_id: string
          qhh_total: number
          sales_total: number
          talk_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date: string
          entry_month: string
          id?: string
          items_total?: number
          locked_after?: string
          outbound_dials?: number
          producer_id: string
          qhh_total?: number
          sales_total?: number
          talk_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_month?: string
          id?: string
          items_total?: number
          locked_after?: string
          outbound_dials?: number
          producer_id?: string
          qhh_total?: number
          sales_total?: number
          talk_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entry_sources: {
        Row: {
          daily_entry_id: string
          id: string
          items: number
          qhh: number
          quotes: number
          sales: number
          source_id: string
        }
        Insert: {
          daily_entry_id: string
          id?: string
          items?: number
          qhh?: number
          quotes?: number
          sales?: number
          source_id: string
        }
        Update: {
          daily_entry_id?: string
          id?: string
          items?: number
          qhh?: number
          quotes?: number
          sales?: number
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_entry_sources_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entry_sources_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "entry_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "daily_entry_sources_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "yesterday_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "daily_entry_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          email: string
          id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          email: string
          id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string
          display_name: string
          email: string
          id: string
          producer_id: string | null
          role: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          display_name: string
          email: string
          id?: string
          producer_id?: string | null
          role: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          producer_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      quoted_households: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_carrier: string | null
          daily_entry_id: string | null
          id: string
          is_bundle: boolean | null
          items_sold: number | null
          lead_id: string | null
          lead_source_id: string | null
          lines_quoted: number | null
          notes: string | null
          opted_into_hearsay: boolean | null
          product_lines: string[]
          qcn: string | null
          quick_action_status: string
          quoted_premium: number
          zip_code: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_carrier?: string | null
          daily_entry_id?: string | null
          id?: string
          is_bundle?: boolean | null
          items_sold?: number | null
          lead_id?: string | null
          lead_source_id?: string | null
          lines_quoted?: number | null
          notes?: string | null
          opted_into_hearsay?: boolean | null
          product_lines: string[]
          qcn?: string | null
          quick_action_status: string
          quoted_premium: number
          zip_code: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_carrier?: string | null
          daily_entry_id?: string | null
          id?: string
          is_bundle?: boolean | null
          items_sold?: number | null
          lead_id?: string | null
          lead_source_id?: string | null
          lines_quoted?: number | null
          notes?: string | null
          opted_into_hearsay?: boolean | null
          product_lines?: string[]
          qcn?: string | null
          quick_action_status?: string
          quoted_premium?: number
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "quoted_households_new_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quoted_households_new_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quoted_households_new_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "entry_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "quoted_households_new_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "yesterday_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "quoted_households_new_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      quoted_households_backup_20251013: {
        Row: {
          created_at: string | null
          created_by: string | null
          daily_entry_id: string | null
          full_name: string | null
          id: string | null
          items_sold: number | null
          lead_source_id: string | null
          notes: string | null
          opted_into_hearsay: boolean | null
          phone_number: string | null
          policies_quoted: number | null
          quick_action_status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          daily_entry_id?: string | null
          full_name?: string | null
          id?: string | null
          items_sold?: number | null
          lead_source_id?: string | null
          notes?: string | null
          opted_into_hearsay?: boolean | null
          phone_number?: string | null
          policies_quoted?: number | null
          quick_action_status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          daily_entry_id?: string | null
          full_name?: string | null
          id?: string | null
          items_sold?: number | null
          lead_source_id?: string | null
          notes?: string | null
          opted_into_hearsay?: boolean | null
          phone_number?: string | null
          policies_quoted?: number | null
          quick_action_status?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          attachments: Json
          created_at: string
          daily_entry_id: string
          has_issues: boolean
          id: string
          notes: string | null
          reviewer_id: string
          status: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          daily_entry_id: string
          has_issues?: boolean
          id?: string
          notes?: string | null
          reviewer_id: string
          status: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          daily_entry_id?: string
          has_issues?: boolean
          id?: string
          notes?: string | null
          reviewer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "entry_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "yesterday_status"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      entry_status: {
        Row: {
          created_at: string | null
          entry_date: string | null
          entry_id: string | null
          framework_status: string | null
          items_total: number | null
          met_count: number | null
          met_dials: boolean | null
          met_items: boolean | null
          met_qhh: boolean | null
          met_talk: boolean | null
          outbound_dials: number | null
          producer_id: string | null
          qhh_total: number | null
          talk_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entry_date?: string | null
          entry_id?: string | null
          framework_status?: never
          items_total?: number | null
          met_count?: never
          met_dials?: never
          met_items?: never
          met_qhh?: never
          met_talk?: never
          outbound_dials?: number | null
          producer_id?: string | null
          qhh_total?: number | null
          talk_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entry_date?: string | null
          entry_id?: string | null
          framework_status?: never
          items_total?: number | null
          met_count?: never
          met_dials?: never
          met_items?: never
          met_qhh?: never
          met_talk?: never
          outbound_dials?: number | null
          producer_id?: string | null
          qhh_total?: number | null
          talk_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      yesterday_status: {
        Row: {
          created_at: string | null
          entry_date: string | null
          entry_id: string | null
          framework_status: string | null
          items_total: number | null
          met_count: number | null
          met_dials: boolean | null
          met_items: boolean | null
          met_qhh: boolean | null
          met_talk: boolean | null
          outbound_dials: number | null
          producer_id: string | null
          qhh_total: number | null
          talk_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entry_date?: string | null
          entry_id?: string | null
          framework_status?: never
          items_total?: number | null
          met_count?: never
          met_dials?: never
          met_items?: never
          met_qhh?: never
          met_talk?: never
          outbound_dials?: number | null
          producer_id?: string | null
          qhh_total?: number | null
          talk_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entry_date?: string | null
          entry_id?: string | null
          framework_status?: never
          items_total?: number | null
          met_count?: never
          met_dials?: never
          met_items?: never
          met_qhh?: never
          met_talk?: never
          outbound_dials?: number | null
          producer_id?: string | null
          qhh_total?: number | null
          talk_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_producer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_qhh_details_for_review: {
        Args: Record<PropertyKey, never> | { p_daily_entry_id: string }
        Returns: {
          current_carrier: string
          id: string
          is_bundle: boolean
          lead_id: string
          lead_source_id: string
          lines_quoted: number
          notes: string
          opted_into_hearsay: boolean
          product_lines: string[]
          qcn: string
          quick_action_status: string
          quoted_premium: number
          source_name: string
          zip_code: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_or_owner: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_owner_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      jsonb_diff: {
        Args: { l: Json; r: Json }
        Returns: Json
      }
      mtd_producer_metrics: {
        Args: { d?: string }
        Returns: {
          conversion: number
          items: number
          office_total_items: number
          office_vc_badge: string
          office_vc_pace: number
          producer_id: string
          producer_name: string
          qhh: number
          quotes: number
          sales: number
          vc_badge: string
          vc_pace: number
          yesterday_status: string
        }[]
      }
      safe_is_manager_or_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      save_daily_entry: {
        Args: {
          p_by_source?: Json
          p_entry_date: string
          p_items_total: number
          p_outbound_dials: number
          p_producer_email: string
          p_sales_total?: number
          p_talk_minutes: number
        }
        Returns: string
      }
      user_is_producer_of: {
        Args: { target_producer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "producer" | "reviewer"
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
      app_role: ["owner", "manager", "producer", "reviewer"],
    },
  },
} as const
