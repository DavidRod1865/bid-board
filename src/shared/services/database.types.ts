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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      apm_phases: {
        Row: {
          created_at: string
          follow_up_date: string | null
          history: Json | null
          id: number
          last_revision_date: string | null
          notes: string | null
          phase_name: Database["public"]["Enums"]["apm_phase_name"]
          project_vendor_id: number
          received_date: string | null
          requested_date: string | null
          revision_count: number
          status: Database["public"]["Enums"]["apm_phase_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          follow_up_date?: string | null
          history?: Json | null
          id?: number
          last_revision_date?: string | null
          notes?: string | null
          phase_name: Database["public"]["Enums"]["apm_phase_name"]
          project_vendor_id: number
          received_date?: string | null
          requested_date?: string | null
          revision_count?: number
          status?: Database["public"]["Enums"]["apm_phase_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          follow_up_date?: string | null
          history?: Json | null
          id?: number
          last_revision_date?: string | null
          notes?: string | null
          phase_name?: Database["public"]["Enums"]["apm_phase_name"]
          project_vendor_id?: number
          received_date?: string | null
          requested_date?: string | null
          revision_count?: number
          status?: Database["public"]["Enums"]["apm_phase_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apm_phases_project_vendor_id_fkey"
            columns: ["project_vendor_id"]
            isOneToOne: false
            referencedRelation: "project_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      est_responses: {
        Row: {
          cost_amount: number | null
          created_at: string | null
          email_sent_date: string | null
          follow_up_date: string | null
          id: number
          is_priority: boolean | null
          project_vendor_id: number
          response_due_date: string | null
          response_notes: string | null
          response_received_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cost_amount?: number | null
          created_at?: string | null
          email_sent_date?: string | null
          follow_up_date?: string | null
          id?: number
          is_priority?: boolean | null
          project_vendor_id: number
          response_due_date?: string | null
          response_notes?: string | null
          response_received_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cost_amount?: number | null
          created_at?: string | null
          email_sent_date?: string | null
          follow_up_date?: string | null
          id?: number
          is_priority?: boolean | null
          project_vendor_id?: number
          response_due_date?: string | null
          response_notes?: string | null
          response_received_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "est_responses_project_vendor_id_fkey"
            columns: ["project_vendor_id"]
            isOneToOne: false
            referencedRelation: "project_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_financials: {
        Row: {
          buy_number: string | null
          created_at: string | null
          estimated_amount: number | null
          final_amount: number | null
          id: number
          po_number: string | null
          project_vendor_id: number
          updated_at: string | null
        }
        Insert: {
          buy_number?: string | null
          created_at?: string | null
          estimated_amount?: number | null
          final_amount?: number | null
          id?: number
          po_number?: string | null
          project_vendor_id: number
          updated_at?: string | null
        }
        Update: {
          buy_number?: string | null
          created_at?: string | null
          estimated_amount?: number | null
          final_amount?: number | null
          id?: number
          po_number?: string | null
          project_vendor_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_financials_project_vendor_id_fkey"
            columns: ["project_vendor_id"]
            isOneToOne: false
            referencedRelation: "project_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          bid_id: number | null
          content: string
          created_at: string | null
          id: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bid_id?: number | null
          content: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bid_id?: number | null
          content?: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_vendors: {
        Row: {
          assigned_by_user: string | null
          created_at: string | null
          id: number
          is_priority: boolean | null
          project_id: number
          updated_at: string | null
          vendor_id: number
        }
        Insert: {
          assigned_by_user?: string | null
          created_at?: string | null
          id?: number
          is_priority?: boolean | null
          project_id: number
          updated_at?: string | null
          vendor_id: number
        }
        Update: {
          assigned_by_user?: string | null
          created_at?: string | null
          id?: number
          is_priority?: boolean | null
          project_id?: number
          updated_at?: string | null
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_vendors_assigned_by_user_fkey"
            columns: ["assigned_by_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_apm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          added_to_procore: boolean | null
          apm_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assign_to: string | null
          created_at: string | null
          created_by: string | null
          department: Database["public"]["Enums"]["department"] | null
          est_activity_cycle: Database["public"]["Enums"]["activity_cycle"]
          est_due_date: string | null
          file_location: string | null
          gc_system: Database["public"]["Enums"]["gc_system_type"] | null
          general_contractor: number | null
          id: number
          made_by_apm: boolean | null
          old_general_contractor: string | null
          project_address: string | null
          project_description: string | null
          project_history: Json | null
          project_name: string
          project_start_date: string | null
          sent_to_apm: boolean | null
          status: string
          updated_at: string | null
        }
        Insert: {
          added_to_procore?: boolean | null
          apm_activity_cycle?:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assign_to?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["department"] | null
          est_activity_cycle?: Database["public"]["Enums"]["activity_cycle"]
          est_due_date?: string | null
          file_location?: string | null
          gc_system?: Database["public"]["Enums"]["gc_system_type"] | null
          general_contractor?: number | null
          id?: number
          made_by_apm?: boolean | null
          old_general_contractor?: string | null
          project_address?: string | null
          project_description?: string | null
          project_history?: Json | null
          project_name: string
          project_start_date?: string | null
          sent_to_apm?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          added_to_procore?: boolean | null
          apm_activity_cycle?:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assign_to?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["department"] | null
          est_activity_cycle?: Database["public"]["Enums"]["activity_cycle"]
          est_due_date?: string | null
          file_location?: string | null
          gc_system?: Database["public"]["Enums"]["gc_system_type"] | null
          general_contractor?: number | null
          id?: number
          made_by_apm?: boolean | null
          old_general_contractor?: string | null
          project_address?: string | null
          project_description?: string | null
          project_history?: Json | null
          project_name?: string
          project_start_date?: string | null
          sent_to_apm?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_assign_to_fkey"
            columns: ["assign_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_general_contractor_fkey"
            columns: ["general_contractor"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth0_id: string | null
          color_preference: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          auth0_id?: string | null
          color_preference?: string | null
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          auth0_id?: string | null
          color_preference?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_contacts: {
        Row: {
          contact_name: string
          contact_title: string | null
          contact_type: Database["public"]["Enums"]["contact_type_enum"] | null
          created_at: string | null
          email: string | null
          id: number
          is_emergency_contact: boolean | null
          is_primary: boolean | null
          notes: string | null
          phone: string | null
          updated_at: string | null
          vendor_id: number
        }
        Insert: {
          contact_name: string
          contact_title?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type_enum"] | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          vendor_id: number
        }
        Update: {
          contact_name?: string
          contact_title?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type_enum"] | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          company_name: string
          created_at: string | null
          created_by: string | null
          id: number
          insurance_expiry_date: string | null
          insurance_file_name: string | null
          insurance_file_path: string | null
          insurance_file_size: number | null
          insurance_file_uploaded_at: string | null
          insurance_notes: string | null
          is_priority: boolean | null
          notes: string | null
          primary_contact_id: number | null
          specialty: string | null
          updated_at: string | null
          vendor_type: Database["public"]["Enums"]["vendor_type_enum"] | null
        }
        Insert: {
          address?: string | null
          company_name: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          insurance_expiry_date?: string | null
          insurance_file_name?: string | null
          insurance_file_path?: string | null
          insurance_file_size?: number | null
          insurance_file_uploaded_at?: string | null
          insurance_notes?: string | null
          is_priority?: boolean | null
          notes?: string | null
          primary_contact_id?: number | null
          specialty?: string | null
          updated_at?: string | null
          vendor_type?: Database["public"]["Enums"]["vendor_type_enum"] | null
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          insurance_expiry_date?: string | null
          insurance_file_name?: string | null
          insurance_file_path?: string | null
          insurance_file_size?: number | null
          insurance_file_uploaded_at?: string | null
          insurance_notes?: string | null
          is_priority?: boolean | null
          notes?: string | null
          primary_contact_id?: number | null
          specialty?: string | null
          updated_at?: string | null
          vendor_type?: Database["public"]["Enums"]["vendor_type_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_primary_contact_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "vendor_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      projects_active: {
        Row: {
          added_to_procore: boolean | null
          apm_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assign_to: string | null
          assigned_user: Json | null
          completed_responses: number | null
          created_at: string | null
          created_by: string | null
          created_by_user: Json | null
          department: Database["public"]["Enums"]["department"] | null
          est_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          est_due_date: string | null
          file_location: string | null
          gc_system: Database["public"]["Enums"]["gc_system_type"] | null
          general_contractor: number | null
          id: number | null
          made_by_apm: boolean | null
          old_general_contractor: string | null
          priority_vendors: number | null
          project_address: string | null
          project_description: string | null
          project_history: Json | null
          project_name: string | null
          project_start_date: string | null
          sent_to_apm: boolean | null
          status: string | null
          updated_at: string | null
          vendor_count: number | null
          vendors_data: Json | null
          vendors_with_costs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_assign_to_fkey"
            columns: ["assign_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_general_contractor_fkey"
            columns: ["general_contractor"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_apm: {
        Row: {
          added_to_procore: boolean | null
          apm_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assign_to: string | null
          assigned_user: Json | null
          completed_responses: number | null
          created_at: string | null
          created_by: string | null
          created_by_user: Json | null
          department: Database["public"]["Enums"]["department"] | null
          est_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          est_due_date: string | null
          file_location: string | null
          gc_system: Database["public"]["Enums"]["gc_system_type"] | null
          general_contractor: number | null
          id: number | null
          made_by_apm: boolean | null
          old_general_contractor: string | null
          priority_vendors: number | null
          project_address: string | null
          project_description: string | null
          project_history: Json | null
          project_name: string | null
          project_start_date: string | null
          sent_to_apm: boolean | null
          status: string | null
          updated_at: string | null
          vendor_count: number | null
          vendors_data: Json | null
          vendors_with_costs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_assign_to_fkey"
            columns: ["assign_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_general_contractor_fkey"
            columns: ["general_contractor"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_complete: {
        Row: {
          added_to_procore: boolean | null
          apm_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assign_to: string | null
          assigned_user: Json | null
          completed_responses: number | null
          created_at: string | null
          created_by: string | null
          created_by_user: Json | null
          department: Database["public"]["Enums"]["department"] | null
          est_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          est_due_date: string | null
          file_location: string | null
          gc_system: Database["public"]["Enums"]["gc_system_type"] | null
          general_contractor: number | null
          id: number | null
          made_by_apm: boolean | null
          old_general_contractor: string | null
          priority_vendors: number | null
          project_address: string | null
          project_description: string | null
          project_history: Json | null
          project_name: string | null
          project_start_date: string | null
          sent_to_apm: boolean | null
          status: string | null
          updated_at: string | null
          vendor_count: number | null
          vendors_data: Json | null
          vendors_with_costs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_assign_to_fkey"
            columns: ["assign_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_general_contractor_fkey"
            columns: ["general_contractor"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_dashboard: {
        Row: {
          added_to_procore: boolean | null
          apm_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assigned_to_name: string | null
          completed_responses: number | null
          created_at: string | null
          created_by_color: string | null
          created_by_name: string | null
          department: Database["public"]["Enums"]["department"] | null
          est_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          est_due_date: string | null
          gc_system: Database["public"]["Enums"]["gc_system_type"] | null
          id: number | null
          priority_vendors: number | null
          project_name: string | null
          project_start_date: string | null
          sent_to_apm: boolean | null
          status: string | null
          updated_at: string | null
          vendor_count: number | null
          vendor_summary: Json | null
          vendors_with_costs: number | null
        }
        Relationships: []
      }
      projects_list: {
        Row: {
          apm_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          assigned_user: Json | null
          completed_responses: number | null
          created_at: string | null
          created_by_user: Json | null
          department: Database["public"]["Enums"]["department"] | null
          est_activity_cycle:
            | Database["public"]["Enums"]["activity_cycle"]
            | null
          est_due_date: string | null
          file_location: string | null
          id: number | null
          priority_vendors: number | null
          project_address: string | null
          project_name: string | null
          project_start_date: string | null
          sent_to_apm: boolean | null
          status: string | null
          updated_at: string | null
          vendor_count: number | null
          vendors_summary: Json | null
          vendors_with_costs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_update_vendor_status: { Args: { updates: Json }; Returns: Json }
      get_avg_completion_time_by_status: {
        Args: never
        Returns: {
          avg_hours: number
          count: number
          median_hours: number
          status: string
        }[]
      }
      get_bid_timeline_data: {
        Args: { bid_id_param: number }
        Returns: {
          bid_id: number
          duration_hours: number
          end_date: string
          sequence_order: number
          start_date: string
          status_name: string
        }[]
      }
      get_bid_with_vendors: {
        Args: { bid_id_param: number }
        Returns: {
          bid_data: Json
          vendors_data: Json
        }[]
      }
      get_project_detail: { Args: { project_id: number }; Returns: Json }
      get_projects_paginated: {
        Args: {
          filters?: Json
          page_number?: number
          page_size?: number
          view_type?: string
        }
        Returns: {
          page_info: Json
          projects: Json
          total_count: number
        }[]
      }
      get_vendor_response_metrics: {
        Args: never
        Returns: {
          avg_response_hours: number
          median_response_hours: number
          response_rate: number
          responses: number
          total_requests: number
          vendor_id: number
          vendor_name: string
        }[]
      }
      log_activity: {
        Args: {
          action_param: string
          details_param?: Json
          entity_id_param: number
          entity_type_param: string
        }
        Returns: undefined
      }
      trigger_insurance_expiry_report: { Args: never; Returns: Json }
      update_user_presence: {
        Args: { current_page_param?: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_cycle: "Active" | "On Hold" | "Closeout" | "Archived"
      apm_phase_name:
        | "Buy Number"
        | "Purchase Order"
        | "Submittals"
        | "RFI"
        | "Revised Plans"
        | "Equipment Release"
        | "Change Orders"
        | "Closeout"
        | "Invoicing"
      apm_phase_status: "Pending" | "Completed" | "Rejected & Revised"
      contact_type_enum:
        | "Office"
        | "General Contractor"
        | "Sales"
        | "Billing"
        | "Emergency"
      department: "Admin" | "Estimating" | "APM"
      est_bid_cycle: "New" | "Gathering Costs" | "Completed" | "Loss" | "Won"
      est_response_status: "pending" | "yes bid" | "no bid"
      gc_system_type: "Procore" | "AutoDesk" | "Email" | "Other"
      user_role: "Admin" | "Estimating" | "APM"
      vendor_type_enum: "Vendor" | "Subcontractor" | "General Contractor"
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
      activity_cycle: ["Active", "On Hold", "Closeout", "Archived"],
      apm_phase_name: [
        "Buy Number",
        "Purchase Order",
        "Submittals",
        "RFI",
        "Revised Plans",
        "Equipment Release",
        "Change Orders",
        "Closeout",
        "Invoicing",
      ],
      apm_phase_status: ["Pending", "Completed", "Rejected & Revised"],
      contact_type_enum: [
        "Office",
        "General Contractor",
        "Sales",
        "Billing",
        "Emergency",
      ],
      department: ["Admin", "Estimating", "APM"],
      est_bid_cycle: ["New", "Gathering Costs", "Completed", "Loss", "Won"],
      est_response_status: ["pending", "yes bid", "no bid"],
      gc_system_type: ["Procore", "AutoDesk", "Email", "Other"],
      user_role: ["Admin", "Estimating", "APM"],
      vendor_type_enum: ["Vendor", "Subcontractor", "General Contractor"],
    },
  },
} as const