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
        }
        Insert: {
          id: string
          email: string
          name: string
          color_preference?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          color_preference?: string
          created_at?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
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