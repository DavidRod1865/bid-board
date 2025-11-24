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
  id: number;
  title: string;
  project_name: string;
  project_email: string | null;
  project_address: string | null;
  general_contractor: string | null;
  project_description: string | null;
  due_date: string;
  status: string;
  priority: boolean;
  estimated_value: number | null;
  notes: string | null;
  created_by: string | null;
  assign_to: string | null;
  file_location: string | null;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  on_hold: boolean;
  on_hold_at: string | null;
  on_hold_by: string | null;
  department?: string;
  sent_to_apm: boolean;
  sent_to_apm_at: string | null;
  apm_on_hold: boolean;
  apm_on_hold_at: string | null;
  apm_archived: boolean;
  apm_archived_at: string | null;
  gc_system: 'Procore' | 'AutoDesk' | 'Email' | 'Other' | null;
  added_to_procore: boolean;
}

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
  bids: Bid[];
  bid_vendors: BidVendor[];
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