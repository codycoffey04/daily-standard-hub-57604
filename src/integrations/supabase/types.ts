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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
            referencedRelation: "premium_by_entry"
            referencedColumns: ["daily_entry_id"]
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
      coaching_episodes: {
        Row: {
          close_rate: number | null
          created_at: string
          created_by: string | null
          episode_content: string
          episode_summary: string | null
          episode_title: string
          error_message: string | null
          focus_theme: string
          focus_week_number: number | null
          generation_duration_ms: number | null
          id: string
          items: number | null
          metrics_id: string | null
          model_used: string | null
          override_reason: string | null
          premium: number | null
          producer_id: string
          published_at: string | null
          qhh: number | null
          quotes: number | null
          sales: number | null
          status: string
          tokens_used: number | null
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          close_rate?: number | null
          created_at?: string
          created_by?: string | null
          episode_content: string
          episode_summary?: string | null
          episode_title: string
          error_message?: string | null
          focus_theme: string
          focus_week_number?: number | null
          generation_duration_ms?: number | null
          id?: string
          items?: number | null
          metrics_id?: string | null
          model_used?: string | null
          override_reason?: string | null
          premium?: number | null
          producer_id: string
          published_at?: string | null
          qhh?: number | null
          quotes?: number | null
          sales?: number | null
          status?: string
          tokens_used?: number | null
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          close_rate?: number | null
          created_at?: string
          created_by?: string | null
          episode_content?: string
          episode_summary?: string | null
          episode_title?: string
          error_message?: string | null
          focus_theme?: string
          focus_week_number?: number | null
          generation_duration_ms?: number | null
          id?: string
          items?: number | null
          metrics_id?: string | null
          model_used?: string | null
          override_reason?: string | null
          premium?: number | null
          producer_id?: string
          published_at?: string | null
          qhh?: number | null
          quotes?: number | null
          sales?: number | null
          status?: string
          tokens_used?: number | null
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_episodes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_episodes_metrics_id_fkey"
            columns: ["metrics_id"]
            isOneToOne: false
            referencedRelation: "coaching_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_episodes_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_framework_config: {
        Row: {
          active: boolean
          config_data: Json
          config_type: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          config_data: Json
          config_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          config_data?: Json
          config_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_framework_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_metrics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          producer_metrics: Json
          raw_paste: string | null
          team_close_rate: number | null
          team_items: number | null
          team_premium: number | null
          team_qhh: number | null
          team_quotes: number | null
          team_sales: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          producer_metrics: Json
          raw_paste?: string | null
          team_close_rate?: number | null
          team_items?: number | null
          team_premium?: number | null
          team_qhh?: number | null
          team_quotes?: number | null
          team_sales?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          producer_metrics?: Json
          raw_paste?: string | null
          team_close_rate?: number | null
          team_items?: number | null
          team_premium?: number | null
          team_qhh?: number | null
          team_quotes?: number | null
          team_sales?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_metrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_scores: {
        Row: {
          call_outcome: string | null
          cross_sell_triggers_detected: Json | null
          episode_id: string | null
          id: string
          improvement_areas: Json | null
          overall_score: number | null
          scored_at: string
          specific_feedback: string | null
          step_1_opening: number | null
          step_2_discovery: number | null
          step_3_quoting: number | null
          step_4_ask_for_sale: number | null
          step_5_closing: number | null
          step_6_follow_up: number | null
          step_7_multi_line: number | null
          step_8_referral_ask: number | null
          strengths: Json | null
          transcript_id: string
        }
        Insert: {
          call_outcome?: string | null
          cross_sell_triggers_detected?: Json | null
          episode_id?: string | null
          id?: string
          improvement_areas?: Json | null
          overall_score?: number | null
          scored_at?: string
          specific_feedback?: string | null
          step_1_opening?: number | null
          step_2_discovery?: number | null
          step_3_quoting?: number | null
          step_4_ask_for_sale?: number | null
          step_5_closing?: number | null
          step_6_follow_up?: number | null
          step_7_multi_line?: number | null
          step_8_referral_ask?: number | null
          strengths?: Json | null
          transcript_id: string
        }
        Update: {
          call_outcome?: string | null
          cross_sell_triggers_detected?: Json | null
          episode_id?: string | null
          id?: string
          improvement_areas?: Json | null
          overall_score?: number | null
          scored_at?: string
          specific_feedback?: string | null
          step_1_opening?: number | null
          step_2_discovery?: number | null
          step_3_quoting?: number | null
          step_4_ask_for_sale?: number | null
          step_5_closing?: number | null
          step_6_follow_up?: number | null
          step_7_multi_line?: number | null
          step_8_referral_ask?: number | null
          strengths?: Json | null
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_scores_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "coaching_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_scores_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: true
            referencedRelation: "coaching_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_transcripts: {
        Row: {
          call_date: string | null
          call_direction: string | null
          call_duration_seconds: number | null
          created_at: string
          customer_phone: string | null
          episode_id: string | null
          extracted_text: string | null
          extraction_error: string | null
          extraction_status: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          producer_id: string
          uploaded_by: string | null
          week_start: string
        }
        Insert: {
          call_date?: string | null
          call_direction?: string | null
          call_duration_seconds?: number | null
          created_at?: string
          customer_phone?: string | null
          episode_id?: string | null
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          producer_id: string
          uploaded_by?: string | null
          week_start: string
        }
        Update: {
          call_date?: string | null
          call_direction?: string | null
          call_duration_seconds?: number | null
          created_at?: string
          customer_phone?: string | null
          episode_id?: string | null
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          producer_id?: string
          uploaded_by?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_transcripts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "coaching_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_transcripts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_transcripts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      csr_activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string | null
          created_by: string | null
          csr_profile_id: string
          customer_name: string | null
          id: string
          notes: string | null
          points: number
          quoted_household_id: string | null
          source: string
        }
        Insert: {
          activity_date: string
          activity_type: string
          created_at?: string | null
          created_by?: string | null
          csr_profile_id: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          points: number
          quoted_household_id?: string | null
          source: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string | null
          created_by?: string | null
          csr_profile_id?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          points?: number
          quoted_household_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "csr_activities_csr_profile_id_fkey"
            columns: ["csr_profile_id"]
            isOneToOne: false
            referencedRelation: "csr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csr_activities_quoted_household_id_fkey"
            columns: ["quoted_household_id"]
            isOneToOne: false
            referencedRelation: "quoted_households"
            referencedColumns: ["id"]
          },
        ]
      }
      csr_profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          source_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_name: string
          email: string
          id?: string
          source_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          source_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csr_profiles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "sources"
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
          framework_status: string | null
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
          framework_status?: string | null
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
          framework_status?: string | null
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
            referencedRelation: "premium_by_entry"
            referencedColumns: ["daily_entry_id"]
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
      detected_patterns: {
        Row: {
          auto_resolved: boolean | null
          context: Json
          created_at: string | null
          detected_at: string
          id: string
          pattern_type: string
          producer_id: string
          resolved_at: string | null
          severity: string
        }
        Insert: {
          auto_resolved?: boolean | null
          context?: Json
          created_at?: string | null
          detected_at?: string
          id?: string
          pattern_type: string
          producer_id: string
          resolved_at?: string | null
          severity: string
        }
        Update: {
          auto_resolved?: boolean | null
          context?: Json
          created_at?: string | null
          detected_at?: string
          id?: string
          pattern_type?: string
          producer_id?: string
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "detected_patterns_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lead_source_metrics: {
        Row: {
          attributed_to: string | null
          created_at: string
          email_metrics_id: string
          id: string
          is_csr_source: boolean | null
          items: number | null
          mapped_source_name: string | null
          points: number | null
          policies: number | null
          premium: number | null
          sales: number | null
          source_name_raw: string
          tds_source_id: string | null
        }
        Insert: {
          attributed_to?: string | null
          created_at?: string
          email_metrics_id: string
          id?: string
          is_csr_source?: boolean | null
          items?: number | null
          mapped_source_name?: string | null
          points?: number | null
          policies?: number | null
          premium?: number | null
          sales?: number | null
          source_name_raw: string
          tds_source_id?: string | null
        }
        Update: {
          attributed_to?: string | null
          created_at?: string
          email_metrics_id?: string
          id?: string
          is_csr_source?: boolean | null
          items?: number | null
          mapped_source_name?: string | null
          points?: number | null
          policies?: number | null
          premium?: number | null
          sales?: number | null
          source_name_raw?: string
          tds_source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_lead_source_metrics_email_metrics_id_fkey"
            columns: ["email_metrics_id"]
            isOneToOne: false
            referencedRelation: "email_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_lead_source_metrics_tds_source_id_fkey"
            columns: ["tds_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      email_metrics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          period_end: string
          period_start: string
          period_type: string
          producer_metrics: Json
          raw_lead_source_paste: string | null
          raw_production_paste: string | null
          raw_weekly_production_paste: string | null
          tds_activity_metrics: Json | null
          team_items: number | null
          team_policies: number | null
          team_premium: number | null
          team_qhh: number | null
          team_quotes: number | null
          team_sales: number | null
          updated_at: string
          weekly_producer_metrics: Json | null
          weekly_team_items: number | null
          weekly_team_policies: number | null
          weekly_team_premium: number | null
          weekly_team_sales: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          period_end: string
          period_start: string
          period_type: string
          producer_metrics?: Json
          raw_lead_source_paste?: string | null
          raw_production_paste?: string | null
          raw_weekly_production_paste?: string | null
          tds_activity_metrics?: Json | null
          team_items?: number | null
          team_policies?: number | null
          team_premium?: number | null
          team_qhh?: number | null
          team_quotes?: number | null
          team_sales?: number | null
          updated_at?: string
          weekly_producer_metrics?: Json | null
          weekly_team_items?: number | null
          weekly_team_policies?: number | null
          weekly_team_premium?: number | null
          weekly_team_sales?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          producer_metrics?: Json
          raw_lead_source_paste?: string | null
          raw_production_paste?: string | null
          raw_weekly_production_paste?: string | null
          tds_activity_metrics?: Json | null
          team_items?: number | null
          team_policies?: number | null
          team_premium?: number | null
          team_qhh?: number | null
          team_quotes?: number | null
          team_sales?: number | null
          updated_at?: string
          weekly_producer_metrics?: Json | null
          weekly_team_items?: number | null
          weekly_team_policies?: number | null
          weekly_team_premium?: number | null
          weekly_team_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_metrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_updates: {
        Row: {
          announcements: string | null
          comparison_data: Json | null
          created_at: string
          created_by: string | null
          email_metrics_id: string
          email_type: string
          generation_duration_ms: number | null
          html_content: string
          id: string
          markdown_content: string
          model_used: string | null
          period_end: string
          period_start: string
          previous_period_id: string | null
          subject_line: string
          tokens_used: number | null
        }
        Insert: {
          announcements?: string | null
          comparison_data?: Json | null
          created_at?: string
          created_by?: string | null
          email_metrics_id: string
          email_type: string
          generation_duration_ms?: number | null
          html_content: string
          id?: string
          markdown_content: string
          model_used?: string | null
          period_end: string
          period_start: string
          previous_period_id?: string | null
          subject_line: string
          tokens_used?: number | null
        }
        Update: {
          announcements?: string | null
          comparison_data?: Json | null
          created_at?: string
          created_by?: string | null
          email_metrics_id?: string
          email_type?: string
          generation_duration_ms?: number | null
          html_content?: string
          id?: string
          markdown_content?: string
          model_used?: string | null
          period_end?: string
          period_start?: string
          previous_period_id?: string | null
          subject_line?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_updates_email_metrics_id_fkey"
            columns: ["email_metrics_id"]
            isOneToOne: false
            referencedRelation: "email_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_updates_previous_period_id_fkey"
            columns: ["previous_period_id"]
            isOneToOne: false
            referencedRelation: "email_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_reviews: {
        Row: {
          action_items: string | null
          call_reviewed: string | null
          coaching_notes: string | null
          created_at: string | null
          created_by: string | null
          daily_entry_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          producer_id: string
          review_date: string
          reviewer_id: string | null
          sales_process_gaps: string[] | null
          strengths_noted: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: string | null
          call_reviewed?: string | null
          coaching_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_entry_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          producer_id: string
          review_date: string
          reviewer_id?: string | null
          sales_process_gaps?: string[] | null
          strengths_noted?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: string | null
          call_reviewed?: string | null
          coaching_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_entry_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          producer_id?: string
          review_date?: string
          reviewer_id?: string | null
          sales_process_gaps?: string[] | null
          strengths_noted?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "entry_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "manager_reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "premium_by_entry"
            referencedColumns: ["daily_entry_id"]
          },
          {
            foreignKeyName: "manager_reviews_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "yesterday_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "manager_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          customer_name: string | null
          daily_entry_id: string | null
          id: string
          is_bundle: boolean | null
          items_sold: number | null
          lead_id: string | null
          lead_source_id: string | null
          lines_quoted: number | null
          notes: string | null
          opted_into_hearsay: boolean | null
          phone: string | null
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
          customer_name?: string | null
          daily_entry_id?: string | null
          id?: string
          is_bundle?: boolean | null
          items_sold?: number | null
          lead_id?: string | null
          lead_source_id?: string | null
          lines_quoted?: number | null
          notes?: string | null
          opted_into_hearsay?: boolean | null
          phone?: string | null
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
          customer_name?: string | null
          daily_entry_id?: string | null
          id?: string
          is_bundle?: boolean | null
          items_sold?: number | null
          lead_id?: string | null
          lead_source_id?: string | null
          lines_quoted?: number | null
          notes?: string | null
          opted_into_hearsay?: boolean | null
          phone?: string | null
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
            referencedRelation: "premium_by_entry"
            referencedColumns: ["daily_entry_id"]
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
            referencedRelation: "premium_by_entry"
            referencedColumns: ["daily_entry_id"]
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
      sales_from_old_quotes: {
        Row: {
          created_at: string | null
          created_by: string | null
          daily_entry_id: string | null
          id: string
          items_sold: number
          lead_source_id: string
          notes: string | null
          premium: number
          zip_code: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          daily_entry_id?: string | null
          id?: string
          items_sold: number
          lead_source_id: string
          notes?: string | null
          premium: number
          zip_code?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          daily_entry_id?: string | null
          id?: string
          items_sold?: number
          lead_source_id?: string
          notes?: string | null
          premium?: number
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_from_old_quotes_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_from_old_quotes_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "entry_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "sales_from_old_quotes_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "premium_by_entry"
            referencedColumns: ["daily_entry_id"]
          },
          {
            foreignKeyName: "sales_from_old_quotes_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "yesterday_status"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "sales_from_old_quotes_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_costs: {
        Row: {
          cost: number
          created_at: string
          created_by: string | null
          id: string
          month: string
          notes: string | null
          source_id: string
          updated_at: string
        }
        Insert: {
          cost: number
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          notes?: string | null
          source_id: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          notes?: string | null
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_costs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
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
      premium_by_entry: {
        Row: {
          daily_entry_id: string | null
          entry_month: string | null
          producer_id: string | null
          total_premium: number | null
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
      _metrics_window: {
        Args: { from_date: string; to_date: string }
        Returns: {
          ft_source_id: string
          has_qh: boolean
          lead_id: string
          qh_is_sold: boolean
          qh_sold_items: number
          qh_sold_premium: number
          quotes_lines: number
        }[]
      }
      _month_bounds: {
        Args: { month_ym: string }
        Returns: {
          from_date: string
          to_date: string
        }[]
      }
      analytics_zip_performance_json: {
        Args: {
          p_date_end: string
          p_date_start: string
          p_include_unknown?: boolean
          p_min_quotes?: number
          p_producer_id?: string
          p_source_id?: string
        }
        Returns: Json
      }
      bump_daily_entry_source_for_pair: {
        Args: { _daily_entry_id: string; _source_id: string }
        Returns: undefined
      }
      bump_daily_entry_source_for_pair_v2: {
        Args: { _daily_entry_id: string; _source_id: string }
        Returns: undefined
      }
      calculate_framework_status: {
        Args: {
          p_items_total: number
          p_outbound_dials: number
          p_qhh_total: number
          p_talk_minutes: number
        }
        Returns: string
      }
      current_producer_id: { Args: never; Returns: string }
      debug_mtd_producer_metrics: {
        Args: never
        Returns: {
          debug_info: string
        }[]
      }
      elapsed_working_days_in_month: { Args: { d: string }; Returns: number }
      get_all_active_patterns: {
        Args: never
        Returns: {
          context: Json
          detected_at: string
          id: string
          pattern_type: string
          producer_id: string
          producer_name: string
          severity: string
        }[]
      }
      get_coaching_effectiveness_metrics: {
        Args: { p_days_back?: number }
        Returns: Json
      }
      get_common_weak_points: {
        Args: { from_date: string; producer_filter?: string; to_date: string }
        Returns: {
          affected_producers: number
          frequency: number
          gap_name: string
          producer_names: string
          recent_count: number
        }[]
      }
      get_conversion_funnel:
        | {
            Args: { from_date: string; to_date: string }
            Returns: {
              stage_name: string
              stage_no: number
              value: number
            }[]
          }
        | {
            Args: {
              from_date: string
              producer_filter: string
              source_filter: string
              to_date: string
            }
            Returns: {
              stage_name: string
              stage_no: number
              value: number
            }[]
          }
      get_csr_leaderboard: {
        Args: { p_year?: number }
        Returns: {
          csr_name: string
          csr_profile_id: string
          mtd_points: number
          rank: number
          wtd_points: number
          ytd_points: number
        }[]
      }
      get_csr_points_summary: {
        Args: { p_csr_profile_id?: string; p_period?: string }
        Returns: {
          activity_count: number
          csr_name: string
          csr_profile_id: string
          google_review_pts: number
          new_customer_referral_pts: number
          referral_closed_pts: number
          referral_quoted_pts: number
          retention_save_pts: number
          total_points: number
        }[]
      }
      get_current_csr_profile: {
        Args: never
        Returns: {
          csr_profile_id: string
          display_name: string
          email: string
          source_id: string
        }[]
      }
      get_execution_benchmarks_by_source: {
        Args: {
          from_date: string
          min_pair_dials: number
          min_pair_qhh: number
          min_pair_shh: number
          source_filter: string
          to_date: string
        }
        Returns: {
          attach_rate_excellent: number
          attach_rate_normal: number
          close_rate_excellent: number
          close_rate_normal: number
          quote_rate_excellent: number
          quote_rate_normal: number
          source_id: string
          source_name: string
          total_pairs: number
        }[]
      }
      get_execution_efficiency_metrics: {
        Args: {
          commission_pct: number
          from_date: string
          producer_filter: string
          source_filter: string
          to_date: string
        }
        Returns: {
          attach_rate: number
          close_rate_pcts: number
          dials: number
          est_commission: number
          households_sold: number
          items_sold: number
          policies_sold: number
          qhh: number
        }[]
      }
      get_execution_funnel:
        | {
            Args: { from_date: string; to_date: string }
            Returns: {
              dials: number
              households_sold: number
              items_sold: number
              lines_quoted: number
              policies_sold: number
              premium_total: number
              qhh: number
            }[]
          }
        | {
            Args: {
              from_date: string
              producer_filter?: string
              source_filter?: string
              to_date: string
            }
            Returns: {
              dials: number
              households_sold: number
              items_sold: number
              policies_sold: number
              premium_total: number
              qhh: number
            }[]
          }
      get_failing_zips_v2: {
        Args: { p_lookback_days?: number }
        Returns: {
          producer_id: string
          producer_name: string
          quotes: number
          sales: number
          zip_code: string
        }[]
      }
      get_focus_week_number: {
        Args: { cycle_start_date?: string; target_date: string }
        Returns: number
      }
      get_gap_analysis: { Args: { p_days_back?: number }; Returns: Json }
      get_items_by_source: {
        Args: { from_date: string; to_date: string }
        Returns: {
          items: number
          qhh: number
          quotes: number
          source_id: string
          source_name: string
        }[]
      }
      get_monthly_summary:
        | {
            Args: { from_date: string; to_date: string }
            Returns: {
              avg_qhh_per_producer: number
              avg_quotes_per_producer: number
              bottom_framework_entries: number
              framework_compliance_pct: number
              month_date: string
              month_name: string
              outside_framework_entries: number
              qhh_to_quote_conversion: number
              top_framework_entries: number
              total_dials: number
              total_entries: number
              total_items: number
              total_qhh: number
              total_quotes: number
              total_talk_minutes: number
              unique_producers: number
            }[]
          }
        | {
            Args: { p_month: number; p_year: number }
            Returns: {
              avg_quotes_per_household: number
              length: number
              total_dials: number
              total_qhh: number
              total_quotes: number
              total_talk_time: number
            }[]
          }
        | {
            Args: { target_month?: string }
            Returns: {
              avg_quotes_per_household: number
              total_dials: number
              total_qhh: number
              total_quotes: number
              total_talk_time: number
            }[]
          }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_outside_streaks: {
        Args: { p_lookback_days?: number }
        Returns: {
          avg_metrics: Json
          producer_id: string
          producer_name: string
          streak_days: number
          streak_end: string
          streak_start: string
        }[]
      }
      get_producer_baseline: {
        Args: { p_days_back?: number; p_producer_id: string }
        Returns: Json
      }
      get_producer_comparison: {
        Args: { from_date: string; to_date: string }
        Returns: {
          avg_daily_dials: number
          avg_daily_items: number
          avg_daily_qhh: number
          avg_daily_quotes: number
          avg_daily_talk_time: number
          bottom_framework_days: number
          framework_compliance_pct: number
          outside_framework_days: number
          producer_id: string
          producer_name: string
          top_framework_days: number
          total_days: number
          total_items: number
          total_qhh: number
          total_quotes: number
          total_sold_items: number
          total_sold_premium: number
        }[]
      }
      get_producer_current: {
        Args: { p_days_back?: number; p_producer_id: string }
        Returns: Json
      }
      get_producer_dashboard: {
        Args: { p_date?: string; p_producer_id: string }
        Returns: Json
      }
      get_producer_execution_leaderboard: {
        Args: {
          from_date: string
          min_dials?: number
          min_pair_dials?: number
          min_pair_qhh?: number
          min_pair_shh?: number
          min_qhh?: number
          min_shh?: number
          source_filter?: string
          to_date: string
        }
        Returns: {
          attach_bench_excellent: number
          attach_bench_normal: number
          attach_guidance: string
          attach_rate: number
          close_bench_excellent: number
          close_bench_normal: number
          close_guidance: string
          close_rate: number
          producer_id: string
          producer_name: string
          quote_bench_excellent: number
          quote_bench_normal: number
          quote_guidance: string
          quote_rate: number
          total_dials: number
          total_items: number
          total_premium: number
          total_qhh: number
          total_shh: number
        }[]
      }
      get_producer_patterns: {
        Args: { p_producer_id: string }
        Returns: {
          context: Json
          detected_at: string
          id: string
          pattern_type: string
          severity: string
        }[]
      }
      get_producer_progress: { Args: { p_days_back?: number }; Returns: Json }
      get_producer_trends_v3: {
        Args: { from_date: string; producer_ids?: string[]; to_date: string }
        Returns: {
          days_bottom: number
          days_outside: number
          days_top: number
          entry_date: string
          framework_status: string
          items: number
          outbound_dials: number
          producer_id: string
          producer_name: string
          qhh: number
          quotes: number
          sold_households: number
          sold_items: number
          sold_premium: number
          talk_minutes: number
        }[]
      }
      get_qhh_details_for_review:
        | {
            Args: never
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
        | {
            Args: { p_daily_entry_id: string }
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
      get_source_failure_streaks: {
        Args: { p_lookback_days?: number }
        Returns: {
          last_item_date: string
          producer_id: string
          producer_name: string
          source_id: string
          source_name: string
          streak_days: number
          total_qhh: number
        }[]
      }
      get_source_roi:
        | {
            Args: {
              from_date: string
              meeting_vc_goal?: boolean
              to_date: string
            }
            Returns: {
              cost_per_item: number
              cost_per_qhh: number
              items: number
              ltv_estimate: number
              qhh: number
              quotes: number
              recommendation: string
              roi: number
              sold_premium_total: number
              source_id: string
              source_name: string
              spend: number
            }[]
          }
        | {
            Args: {
              from_date: string
              meeting_vc_goal: boolean
              source_id_param: string
              to_date: string
            }
            Returns: {
              roi_data: Json
            }[]
          }
      get_week_end: { Args: { target_date: string }; Returns: string }
      get_week_start: { Args: { target_date: string }; Returns: string }
      get_weekly_coaching_trend: {
        Args: { p_weeks_back?: number }
        Returns: Json
      }
      get_ytd_performance: {
        Args: { from_ym: string; to_ym: string }
        Returns: {
          households_sold: number
          items_sold: number
          lines_quoted: number
          policies_sold: number
          qhh: number
          ym: string
        }[]
      }
      get_zero_item_streaks: {
        Args: { p_lookback_days?: number }
        Returns: {
          producer_id: string
          producer_name: string
          streak_days: number
          streak_end: string
          streak_start: string
          total_qhh_during_streak: number
        }[]
      }
      get_zip_performance: {
        Args: { from_date: string; to_date: string }
        Returns: {
          households_sold: number
          lines_quoted: number
          zip_code: string
        }[]
      }
      has_my_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_or_owner: { Args: { _user_id: string }; Returns: boolean }
      is_owner_manager: { Args: never; Returns: boolean }
      is_staff:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      jsonb_diff: { Args: { l: Json; r: Json }; Returns: Json }
      mtd_producer_metrics: {
        Args: { d?: string }
        Returns: {
          conversion: number
          items: number
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
      rebuild_all_rollups: { Args: never; Returns: undefined }
      recalc_daily_entry_items_and_sales: {
        Args: { p_daily_entry_id: string }
        Returns: undefined
      }
      refresh_recent_rollups: { Args: { p_days?: number }; Returns: undefined }
      refresh_rollups_for_daily_entry: {
        Args: { p_daily_entry_id: string }
        Returns: undefined
      }
      refresh_rollups_for_key: {
        Args: { p_entry_date: string; p_producer_id: string }
        Returns: undefined
      }
      resolve_pattern: {
        Args: { p_auto?: boolean; p_pattern_id: string }
        Returns: boolean
      }
      rpc_get_execution_benchmarks_by_source: {
        Args: {
          min_pair_dials?: number
          min_pair_qhh?: number
          min_pair_shh?: number
          month_ym: string
          source_filter?: string
        }
        Returns: {
          attach_rate_excellent: number
          attach_rate_normal: number
          close_rate_excellent: number
          close_rate_normal: number
          quote_rate_excellent: number
          quote_rate_normal: number
          source_id: string
          source_name: string
          total_pairs: number
        }[]
      }
      rpc_get_monthly_summary: {
        Args: { month_ym: string }
        Returns: {
          avg_quotes_per_household: number
          framework_compliance_pct: number
          total_dials: number
          total_qhh: number
          total_quotes: number
          total_talk_time: number
        }[]
      }
      rpc_get_top_sources_by_month: {
        Args: { metric_type: string; month_ym: string }
        Returns: {
          metric_value: number
          source_id: string
          source_name: string
        }[]
      }
      safe_is_manager_or_owner: { Args: never; Returns: boolean }
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
      sync_daily_entry_sources: {
        Args: { _from: string; _to: string }
        Returns: number
      }
      user_is_producer_of: {
        Args: { target_producer_id: string }
        Returns: boolean
      }
      working_days_in_month: { Args: { d: string }; Returns: number }
    }
    Enums: {
      app_role:
        | "owner"
        | "manager"
        | "producer"
        | "reviewer"
        | "sales_service"
        | "csr"
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
      app_role: [
        "owner",
        "manager",
        "producer",
        "reviewer",
        "sales_service",
        "csr",
      ],
    },
  },
} as const
