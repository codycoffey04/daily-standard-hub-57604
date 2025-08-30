import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          role: 'owner' | 'manager' | 'producer'
          producer_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          role: 'owner' | 'manager' | 'producer'
          producer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          role?: 'owner' | 'manager' | 'producer'
          producer_id?: string | null
          created_at?: string
        }
      }
      producers: {
        Row: {
          id: string
          display_name: string
          email: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          display_name: string
          email: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          email?: string
          active?: boolean
          created_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          name: string
          active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      daily_entries: {
        Row: {
          id: string
          producer_id: string
          entry_date: string
          entry_month: string
          outbound_dials: number
          talk_minutes: number
          qhh_total: number
          items_total: number
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          locked_after: string
        }
        Insert: {
          id?: string
          producer_id: string
          entry_date: string
          entry_month?: string
          outbound_dials?: number
          talk_minutes?: number
          qhh_total?: number
          items_total?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          locked_after?: string
        }
        Update: {
          id?: string
          producer_id?: string
          entry_date?: string
          entry_month?: string
          outbound_dials?: number
          talk_minutes?: number
          qhh_total?: number
          items_total?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          locked_after?: string
        }
      }
      daily_entry_sources: {
        Row: {
          id: string
          daily_entry_id: string
          source_id: string
          qhh: number
          quotes: number
          items: number
        }
        Insert: {
          id?: string
          daily_entry_id: string
          source_id: string
          qhh?: number
          quotes?: number
          items?: number
        }
        Update: {
          id?: string
          daily_entry_id?: string
          source_id?: string
          qhh?: number
          quotes?: number
          items?: number
        }
      }
      reviews: {
        Row: {
          id: string
          daily_entry_id: string
          reviewer_id: string
          status: 'approved' | 'flagged'
          notes: string | null
          attachments: any[]
          has_issues: boolean
          created_at: string
        }
        Insert: {
          id?: string
          daily_entry_id: string
          reviewer_id: string
          status: 'approved' | 'flagged'
          notes?: string | null
          attachments?: any[]
          has_issues?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          daily_entry_id?: string
          reviewer_id?: string
          status?: 'approved' | 'flagged'
          notes?: string | null
          attachments?: any[]
          has_issues?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      entry_status: {
        Row: {
          entry_id: string
          producer_id: string
          entry_date: string
          met_dials: boolean
          met_talk: boolean
          met_qhh: boolean
          met_items: boolean
          met_count: number
          framework_status: 'Top' | 'Bottom' | 'Outside'
        }
      }
      yesterday_status: {
        Row: {
          entry_id: string
          producer_id: string
          entry_date: string
          met_dials: boolean
          met_talk: boolean
          met_qhh: boolean
          met_items: boolean
          met_count: number
          framework_status: 'Top' | 'Bottom' | 'Outside'
        }
      }
    }
    Functions: {
      mtd_producer_metrics: {
        Args: { d?: string }
        Returns: {
          producer_id: string
          producer_name: string
          qhh: number
          quotes: number
          items: number
          conversion: number
          vc_pace: number
          vc_badge: 'Green' | 'Amber' | 'Red'
          yesterday_status: 'Top' | 'Bottom' | 'Outside' | null
        }[]
      }
      save_daily_entry: {
        Args: {
          p_producer_email: string
          p_entry_date: string
          p_outbound_dials: number
          p_talk_minutes: number
          p_items_total: number
          p_by_source: any
        }
        Returns: string
      }
    }
  }
}