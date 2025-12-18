export interface User {
  id: string;
  auth0_id: string;
  email: string;
  name: string;
  color_preference: string;
  is_active?: boolean;
  role?: string;
  created_at?: string;
  updated_at?: string;
  invitation_sent_at?: string;
  invited_by?: string; // Admin user ID who sent invite
}

// Vendor Type ENUM matching database
export type VendorType = 'Vendor' | 'Subcontractor' | 'General Contractor';

// Contact Type ENUM matching database (capitalized as per user's update)
export type ContactType = 'Office' | 'General Contractor' | 'Sales' | 'Billing';

export interface Vendor {
  id: number;
  company_name: string;
  address: string | null;
  contact_person: string | null; // Keep for backward compatibility
  phone: string | null; // Keep for backward compatibility
  email: string | null; // Keep for backward compatibility
  notes: string | null;
  specialty?: string | null;
  is_priority?: boolean;
  vendor_type: VendorType;
  insurance_expiry_date: string | null;
  insurance_notes: string | null;
  insurance_file_path: string | null;
  insurance_file_name: string | null;
  insurance_file_size: number | null;
  insurance_file_uploaded_at: string | null;
  primary_contact_id: number | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface VendorContact {
  id: number;
  vendor_id: number;
  contact_name: string;
  contact_title: string | null;
  phone: string | null;
  email: string | null;
  contact_type: ContactType;
  is_primary: boolean;
  is_emergency_contact: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Extended vendor type that includes primary contact information
export interface VendorWithContact extends Vendor {
  primary_contact: Pick<VendorContact, 'id' | 'contact_name' | 'contact_title' | 'phone' | 'email' | 'contact_type'> | null;
}

export interface Bid {
  // Core project fields from projects table
  id: number;
  project_name: string;
  project_email: string | null;
  project_address: string | null;
  general_contractor: string | null;  // Computed from old_general_contractor in view
  project_description: string | null;
  status: string;
  priority: boolean;
  estimated_value: number | null;
  notes: string | null;
  created_by: string | null;
  file_location: string | null;
  
  // Computed boolean fields from activity cycle enums
  archived: boolean;  // Computed from est_activity_cycle = 'Archived'
  archived_at: string | null;
  archived_by: string | null;
  on_hold: boolean;  // Computed from est_activity_cycle = 'On Hold'
  on_hold_at: string | null;
  on_hold_by: string | null;
  
  // Team and workflow fields
  department?: string;
  sent_to_apm: boolean;
  sent_to_apm_at: string | null;
  
  // APM computed fields
  apm_on_hold: boolean;  // Computed from apm_activity_cycle = 'On Hold'
  apm_on_hold_at: string | null;
  apm_archived: boolean;  // Computed from apm_activity_cycle = 'Archived'
  apm_archived_at: string | null;
  
  // Additional fields
  gc_system: 'Procore' | 'AutoDesk' | 'Email' | 'Other' | null;
  gc_contact_id: number | null;  // Foreign key to vendor_contacts table
  added_to_procore: boolean;
  made_by_apm: boolean;
  project_start_date: string | null;
  binder?: boolean;
  
  // Legacy compatibility fields (required for existing components)
  title: string;  // Alias for project_name
  due_date: string;  // Legacy field name (maps to est_due_date in database)
  assign_to: string | null;  // Legacy field name (maps to assigned_to in database)
  
  // Database field names (optional for backward compatibility during transition)
  est_due_date?: string;  // Optional during transition
  assigned_to?: string | null;  // Optional during transition
  assigned_pm?: string | null;  // Project Manager assignment
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// New normalized table types
export interface ProjectVendor {
  id: number;
  project_id: number;
  vendor_id: number;
  assigned_by_user: string | null;
  is_priority: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorApmPhase {
  id: number;
  project_vendor_id: number;
  phase_type: 'quote_confirmed' | 'buy_number' | 'po' | 'submittals' | 'revised_plans' | 'equipment_release' | 'closeouts' | 'completed';
  status: 'pending' | 'requested' | 'in_progress' | 'received' | 'approved' | 'on_hold' | 'issue' | 'completed';
  requested_date: string | null;
  follow_up_date: string | null;
  completed_date: string | null;
  notes: string | null;
  priority: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorFinancial {
  id: number;
  project_vendor_id: number;
  cost_amount: number | null;
  final_quote_amount: number | null;
  final_quote_confirmed_date: string | null;
  buy_number: string | null;
  po_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorFollowUp {
  id: number;
  project_vendor_id: number;
  phase_type: string;
  follow_up_date: string;
  follow_up_count: number;
  notes: string | null;
  created_at: string;
}

export interface ProjectEquipment {
  id: number;
  project_vendor_id: number;
  po_number: string | null;
  quantity: number;
  description: string;
  unit: string | null;
  date_received: string | null;
  received_at_wp: boolean | null;
  timeline_event_id: number | null;
  created_at: string;
  updated_at: string;
}

// Equipment with timeline event details for display
export interface ProjectEquipmentWithTimeline extends ProjectEquipment {
  timeline_event?: {
    id: number;
    event_name: string;
    event_category: string;
    status: string;
    order_by: string | null;
    required_by: string | null;
  } | null;
}

// Equipment Overview from the comprehensive view - includes all related data
export interface EquipmentOverview {
  equipment_id: number;
  equipment_description: string;
  quantity: number;
  unit: string | null;
  po_number: string | null;
  date_received: string | null;
  equipment_created_at: string;
  equipment_updated_at: string;
  
  // Project information
  project_id: number;
  project_name: string;
  project_address: string | null;
  project_start_date: string | null;
  project_created_at: string;
  
  // Vendor information
  vendor_id: number;
  vendor_name: string;
  vendor_specialty: string | null;
  vendor_type: VendorType;
  
  // Project vendor relationship info
  project_vendor_id: number;
  assigned_by_user: string | null;
  vendor_is_priority: boolean;
  vendor_assigned_at: string;
  
  // User who assigned the vendor (if any)
  assigned_by_name: string | null;
  assigned_by_email: string | null;
}

// Composite type that combines all normalized data for a project-vendor relationship
export interface ProjectVendorComplete {
  project_vendor: ProjectVendor;
  phases: VendorApmPhase[];
  financials: VendorFinancial | null;
  follow_ups: VendorFollowUp[];
  vendor?: Vendor; // Include vendor details when needed
}

// Legacy BidVendor type (keeping for backward compatibility during migration)
export interface BidVendor {
  id: number;
  bid_id: number;
  vendor_id: number;
  due_date: string | null;
  response_received_date: string | null;
  status: string;
  follow_up_count: number;
  last_follow_up_date?: string | null;
  response_notes: string | null;
  responded_by: string | null;
  is_priority: boolean;
  cost_amount: number | string | null;
  
  // APM User Assignment
  assigned_apm_user: string | null;
  assigned_date: string | null;
  
  // Quote Confirmation
  final_quote_amount: number | string | null;
  final_quote_confirmed_date: string | null;
  final_quote_notes: string | null;
  
  // Phase 1: Buy#
  buy_number: string | null;
  buy_number_requested_date: string | null;
  buy_number_follow_up_date: string | null;
  buy_number_received_date: string | null;
  buy_number_notes: string | null;
  
  // Phase 2: PO
  po_number: string | null;
  po_requested_date: string | null;
  po_sent_date: string | null;
  po_follow_up_date: string | null;
  po_received_date: string | null;
  po_confirmed_date: string | null;
  po_notes: string | null;
  
  // Phase 3: Submittals
  submittals_requested_date: string | null;
  submittals_follow_up_date: string | null;
  submittals_received_date: string | null;
  submittals_status: 'pending' | 'received' | 'approved' | 'rejected' | 'rejected_revised' | 'resubmitted';
  submittals_approved_date: string | null;
  submittals_rejected_date: string | null;
  submittals_rejection_reason: string | null;
  submittals_revision_count: number;
  submittals_last_revision_date: string | null;
  submittals_notes: string | null;
  
  // Phase 4: Revised Plans
  revised_plans_requested_date: string | null;
  revised_plans_sent_date: string | null;
  revised_plans_follow_up_date: string | null;
  revised_plans_confirmed_date: string | null;
  revised_plans_notes: string | null;
  
  // Phase 5: Equipment Release
  equipment_release_requested_date: string | null;
  equipment_release_follow_up_date: string | null;
  equipment_released_date: string | null;
  equipment_release_notes: string | null;
  
  // Phase 6: Closeouts
  closeout_requested_date: string | null;
  closeout_follow_up_date: string | null;
  closeout_received_date: string | null;
  closeout_approved_date: string | null;
  closeout_notes: string | null;
  
  // APM Status and Phase Tracking
  apm_phase: 'quote_confirmed' | 'buy_number' | 'po' | 'submittals' | 'revised_plans' | 'equipment_release' | 'closeouts' | 'completed';
  apm_status: 'pending' | 'requested' | 'in_progress' | 'received' | 'approved' | 'on_hold' | 'issue' | 'completed' | 'complete';
  next_follow_up_date: string | null;
  apm_priority: boolean;
  apm_phase_updated_at: string | null;
  
  // APM Phases (normalized structure)
  apm_phases?: Array<{
    id: number;
    project_vendor_id: number;
    phase_name: string;
    status: string;
    requested_date: string | null;
    follow_up_date: string | null;
    received_date: string | null;
    notes: string | null;
    revision_count: number;
    last_revision_date: string | null;
    created_at: string;
    updated_at: string;
  }>;
  
}

export interface EmailLog {
  id: number;
  bid_id: number;
  vendor_id: number;
  email_type: string;
  sent_date: string;
  email_subject: string;
  sent_successfully: boolean;
}

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  current_page: string | null;
}

export interface ActivityLog {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ProjectNote {
  id: number;
  bid_id: number;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    name: string;
    color_preference: string;
  };
}

export interface DashboardData {
  users: User[];
  vendors: Vendor[];
  projects: Bid[]; // Projects table data (using Bid interface for now)
  bidVendors: BidVendor[]; // Computed from project_vendors + est_responses + project_financials + apm_phases
  email_logs: EmailLog[];
  user_presence: UserPresence[];
  activity_log: ActivityLog[];
}

// Analytics Types
export interface BidStatusHistory {
  id: number;
  bid_id: number;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
  duration_in_previous_status: string | null; // PostgreSQL interval as string
  notes: string | null;
  changed_by_name?: string;
  bid_title?: string;
}

export interface BidCompletionAnalytics {
  id: number;
  title: string;
  project_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  due_date: string;
  completion_hours: number | null;
  planned_hours: number;
  variance_hours: number | null;
  completion_status: 'On Time' | 'Late' | 'Overdue' | 'In Progress';
  created_by_name: string | null;
}

export interface VendorResponseAnalytics {
  id: number;
  bid_id: number;
  vendor_id: number;
  company_name: string;
  email_sent_date: string | null;
  response_received_date: string | null;
  status: string;
  follow_up_count: number;
  due_date: string | null;
  bid_title: string;
  response_hours: number | null;
  response_status: 'Responded' | 'Overdue' | 'Pending' | 'Not Contacted';
  target_response_hours: number | null;
}

export interface StatusDurationAnalytics {
  bid_id: number;
  new_status: string;
  previous_status: string | null;
  changed_at: string;
  duration_in_previous_status: string | null;
  duration_hours: number | null;
  status_sequence: number;
  changed_by_name: string | null;
  bid_title: string | null;
}

export interface ActiveBidStatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CompletionTimeByStatus {
  status: string;
  avg_hours: number;
  count: number;
  median_hours: number;
}

export interface VendorResponseMetrics {
  vendor_id: number;
  vendor_name: string;
  total_requests: number;
  responses: number;
  response_rate: number;
  avg_response_hours: number | null;
  median_response_hours: number | null;
}

export interface BidTimelineData {
  bid_id: number;
  status_name: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
  sequence_order: number;
}

export interface AnalyticsDateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface AnalyticsFilters {
  dateRange: AnalyticsDateRange;
  statuses: string[];
  vendors: number[];
  completionStatus: string[];
}

// D3.js Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesDataPoint {
  date: Date;
  value: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface GanttChartData {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  category: string;
  color: string;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// Timeline Event Types
export interface TimelineEvent {
  id: number;
  project_id: number;
  event_category: 'demo' | 'mechanical' | 'equipment' | 'controls' | 'startup' | 'commissioning' | 'custom';
  event_name: string;
  event_type: 'predefined' | 'custom';
  order_by: string | null;
  required_by: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface TimelineEventTemplate {
  id: number;
  event_category: string;
  event_name: string;
  sort_order: number;
  description: string | null;
  created_at: string;
}