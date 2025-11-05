// TypeScript definitions for Supabase database
// Generated from the SQL schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          color_preference: string
          created_at: string
          updated_at: string
          role: 'Admin' | 'Estimating' | 'APM' | null
        }
        Insert: {
          id: string
          email: string
          name: string
          color_preference?: string
          created_at?: string
          updated_at?: string
          role?: 'Admin' | 'Estimating' | 'APM' | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          color_preference?: string
          created_at?: string
          updated_at?: string
          role?: 'Admin' | 'Estimating' | 'APM' | null
        }
      }
      vendors: {
        Row: {
          id: number
          company_name: string
          address: string | null
          contact_person: string | null
          phone: string | null
          email: string | null
          notes: string | null
          specialty: string | null
          is_priority: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          company_name: string
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          specialty?: string | null
          is_priority?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          company_name?: string
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          specialty?: string | null
          is_priority?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      bids: {
        Row: {
          id: number
          title: string
          project_name: string
          project_email: string | null
          project_address: string | null
          general_contractor: string | null
          project_description: string | null
          due_date: string
          status: string
          priority: boolean
          estimated_value: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          assign_to: string | null
          file_location: string | null
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          completed_at: string | null
          on_hold: boolean
          on_hold_at: string | null
          on_hold_by: string | null
        }
        Insert: {
          id?: number
          title: string
          project_name: string
          project_email?: string | null
          project_address?: string | null
          general_contractor?: string | null
          project_description?: string | null
          due_date: string
          status?: string
          priority?: boolean
          estimated_value?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          assign_to?: string | null
          file_location?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          on_hold?: boolean
          on_hold_at?: string | null
          on_hold_by?: string | null
        }
        Update: {
          id?: number
          title?: string
          project_name?: string
          project_email?: string | null
          project_address?: string | null
          general_contractor?: string | null
          project_description?: string | null
          due_date?: string
          status?: string
          priority?: boolean
          estimated_value?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          assign_to?: string | null
          file_location?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          on_hold?: boolean
          on_hold_at?: string | null
          on_hold_by?: string | null
        }
      }
      bid_vendors: {
        Row: {
          id: number
          bid_id: number
          vendor_id: number
          email_sent_date: string | null
          response_received_date: string | null
          status: string
          follow_up_count: number
          last_follow_up_date: string | null
          response_notes: string | null
          responded_by: string | null
          is_priority: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          bid_id: number
          vendor_id: number
          email_sent_date?: string | null
          response_received_date?: string | null
          status?: string
          follow_up_count?: number
          last_follow_up_date?: string | null
          response_notes?: string | null
          responded_by?: string | null
          is_priority?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          bid_id?: number
          vendor_id?: number
          email_sent_date?: string | null
          response_received_date?: string | null
          status?: string
          follow_up_count?: number
          last_follow_up_date?: string | null
          response_notes?: string | null
          responded_by?: string | null
          is_priority?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      project_notes: {
        Row: {
          id: number
          bid_id: number
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          bid_id: number
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          bid_id?: number
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      email_logs: {
        Row: {
          id: number
          bid_id: number
          vendor_id: number | null
          email_type: string
          sent_date: string
          email_subject: string | null
          sent_successfully: boolean
          created_by: string | null
        }
        Insert: {
          id?: number
          bid_id: number
          vendor_id?: number | null
          email_type: string
          sent_date?: string
          email_subject?: string | null
          sent_successfully?: boolean
          created_by?: string | null
        }
        Update: {
          id?: number
          bid_id?: number
          vendor_id?: number | null
          email_type?: string
          sent_date?: string
          email_subject?: string | null
          sent_successfully?: boolean
          created_by?: string | null
        }
      }
      user_presence: {
        Row: {
          user_id: string
          is_online: boolean
          current_page: string | null
          last_seen: string
        }
        Insert: {
          user_id: string
          is_online?: boolean
          current_page?: string | null
          last_seen?: string
        }
        Update: {
          user_id?: string
          is_online?: boolean
          current_page?: string | null
          last_seen?: string
        }
      }
      activity_log: {
        Row: {
          id: number
          user_id: string | null
          action: string
          entity_type: string
          entity_id: number | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: number | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: number | null
          details?: Json | null
          created_at?: string
        }
      }
      vendor_buyouts: {
        Row: {
          id: number
          project_id: number
          vendor_id: number
          buyout_type: 'Submittal' | 'Buy#' | 'PO' | 'Revised Docs' | 'Closeout'
          description: string
          initial_contact_date: string | null
          last_follow_up_date: string | null
          next_follow_up_date: string
          follow_up_count: number
          status: 'Not Contacted' | 'Initial Contact Sent' | 'Follow-up Required' | 'Response Received' | 'Complete' | 'On Hold'
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          response_received_date: string | null
          expected_completion_date: string | null
          actual_completion_date: string | null
          notes: string | null
          contact_method: 'email' | 'phone' | 'in_person' | null
          contact_person: string | null
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          project_id: number
          vendor_id: number
          buyout_type: 'Submittal' | 'Buy#' | 'PO' | 'Revised Docs' | 'Closeout'
          description: string
          initial_contact_date?: string | null
          last_follow_up_date?: string | null
          next_follow_up_date: string
          follow_up_count?: number
          status?: 'Not Contacted' | 'Initial Contact Sent' | 'Follow-up Required' | 'Response Received' | 'Complete' | 'On Hold'
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          response_received_date?: string | null
          expected_completion_date?: string | null
          actual_completion_date?: string | null
          notes?: string | null
          contact_method?: 'email' | 'phone' | 'in_person' | null
          contact_person?: string | null
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          project_id?: number
          vendor_id?: number
          buyout_type?: 'Submittal' | 'Buy#' | 'PO' | 'Revised Docs' | 'Closeout'
          description?: string
          initial_contact_date?: string | null
          last_follow_up_date?: string | null
          next_follow_up_date?: string
          follow_up_count?: number
          status?: 'Not Contacted' | 'Initial Contact Sent' | 'Follow-up Required' | 'Response Received' | 'Complete' | 'On Hold'
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          response_received_date?: string | null
          expected_completion_date?: string | null
          actual_completion_date?: string | null
          notes?: string | null
          contact_method?: 'email' | 'phone' | 'in_person' | null
          contact_person?: string | null
          assigned_to?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      follow_up_logs: {
        Row: {
          id: number
          buyout_id: number
          contact_date: string
          contact_method: 'email' | 'phone' | 'in_person'
          contact_notes: string
          response_received: boolean
          next_follow_up_scheduled: string | null
          contacted_by: string
          created_at: string
        }
        Insert: {
          id?: number
          buyout_id: number
          contact_date: string
          contact_method: 'email' | 'phone' | 'in_person'
          contact_notes: string
          response_received?: boolean
          next_follow_up_scheduled?: string | null
          contacted_by: string
          created_at?: string
        }
        Update: {
          id?: number
          buyout_id?: number
          contact_date?: string
          contact_method?: 'email' | 'phone' | 'in_person'
          contact_notes?: string
          response_received?: boolean
          next_follow_up_scheduled?: string | null
          contacted_by?: string
          created_at?: string
        }
      }
      project_handoffs: {
        Row: {
          id: number
          bid_id: number
          transferred_from_user: string
          transferred_to_user: string
          transfer_date: string
          handoff_notes: string | null
          selected_vendors: Json | null
          initial_buyout_items: Json | null
          status: 'pending' | 'accepted' | 'completed'
          created_at: string
        }
        Insert: {
          id?: number
          bid_id: number
          transferred_from_user: string
          transferred_to_user: string
          transfer_date?: string
          handoff_notes?: string | null
          selected_vendors?: Json | null
          initial_buyout_items?: Json | null
          status?: 'pending' | 'accepted' | 'completed'
          created_at?: string
        }
        Update: {
          id?: number
          bid_id?: number
          transferred_from_user?: string
          transferred_to_user?: string
          transfer_date?: string
          handoff_notes?: string | null
          selected_vendors?: Json | null
          initial_buyout_items?: Json | null
          status?: 'pending' | 'accepted' | 'completed'
          created_at?: string
        }
      }
    }
    Views: {
      apm_daily_tasks: {
        Row: {
          task_id: number
          project_id: number
          vendor_id: number
          buyout_type: 'Submittal' | 'Buy#' | 'PO' | 'Revised Docs' | 'Closeout'
          description: string
          project_name: string
          project_address: string | null
          general_contractor: string | null
          project_title: string
          project_status: string
          vendor_company_name: string
          vendor_contact_person: string | null
          vendor_phone: string | null
          vendor_email: string | null
          vendor_specialty: string | null
          vendor_is_priority: boolean
          next_follow_up_date: string
          last_follow_up_date: string | null
          follow_up_count: number
          initial_contact_date: string | null
          days_until_due: number
          is_overdue: boolean
          followup_status: 'Not Contacted' | 'Initial Contact Sent' | 'Follow-up Required' | 'Response Received' | 'Complete' | 'On Hold'
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          assigned_to: string | null
          assigned_to_name: string | null
          assigned_to_email: string | null
          contact_method: 'email' | 'phone' | 'in_person' | null
          contact_person: string | null
          notes: string | null
          response_received_date: string | null
          expected_completion_date: string | null
          actual_completion_date: string | null
          task_created_at: string
          task_updated_at: string
        }
      }
      apm_project_summary: {
        Row: {
          project_id: number
          project_name: string
          project_address: string | null
          general_contractor: string | null
          project_title: string
          project_status: string
          due_date: string
          estimated_value: number | null
          project_manager_id: string | null
          project_manager_name: string | null
          project_manager_email: string | null
          total_buyout_items: number
          pending_items: number
          completed_items: number
          on_hold_items: number
          overdue_items: number
          tasks_due_today: number
          tasks_due_this_week: number
          completion_percentage: number
          critical_items: number
          high_priority_items: number
          project_created_at: string
          project_last_updated: string
          next_critical_date: string | null
          recent_activity_count: number
          unique_vendors_count: number
        }
      }
      apm_team_workload: {
        Row: {
          user_id: string
          user_name: string
          user_email: string
          assigned_projects: number
          total_assigned_buyouts: number
          active_buyouts: number
          overdue_follow_ups: number
          tasks_due_today: number
          tasks_due_this_week: number
          critical_tasks: number
          high_priority_tasks: number
          completed_buyouts: number
          completion_rate: number
          weekly_activity_count: number
        }
      }
      apm_dashboard_overview: {
        Row: {
          total_active_projects: number
          projects_with_buyouts: number
          total_buyout_items: number
          pending_buyouts: number
          completed_buyouts: number
          on_hold_buyouts: number
          overdue_follow_ups: number
          tasks_due_today: number
          tasks_due_this_week: number
          recent_completions: number
          active_team_members: number
          unique_vendors: number
          overall_completion_rate: number
          submittal_count: number
          po_count: number
          buy_number_count: number
          revised_docs_count: number
          closeout_count: number
        }
      }
      apm_recent_activity: {
        Row: {
          log_id: number
          contact_date: string
          contact_method: 'email' | 'phone' | 'in_person'
          response_received: boolean
          contacted_by: string
          contacted_by_name: string
          buyout_id: number
          buyout_type: 'Submittal' | 'Buy#' | 'PO' | 'Revised Docs' | 'Closeout'
          buyout_description: string
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          buyout_status: 'Not Contacted' | 'Initial Contact Sent' | 'Follow-up Required' | 'Response Received' | 'Complete' | 'On Hold'
          project_id: number
          project_name: string
          general_contractor: string | null
          vendor_id: number
          vendor_name: string
          vendor_contact: string | null
          contact_notes: string
          next_follow_up_scheduled: string | null
          activity_created_at: string
        }
      }
    }
    Functions: {
      get_bid_with_vendors: {
        Args: {
          bid_id_param: number
        }
        Returns: {
          bid_data: Json
          vendors_data: Json
        }[]
      }
      update_user_presence: {
        Args: {
          current_page_param?: string
        }
        Returns: undefined
      }
      log_activity: {
        Args: {
          action_param: string
          entity_type_param: string
          entity_id_param: number
          details_param?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper type for JSON fields
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]