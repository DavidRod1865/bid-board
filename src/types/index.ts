export interface User {
  id: string;
  auth0_id: string;
  email: string;
  name: string;
  color_preference: string;
}

export interface Vendor {
  id: number;
  company_name: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  specialty?: string | null;
  is_priority?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
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
  cost_amount: number | null;
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