import type { BidVendor } from '../types';

// Default APM values for BidVendor objects
export const getDefaultAPMFields = () => ({
  // APM User Assignment
  assigned_apm_user: null as string | null,
  assigned_date: null as string | null,
  
  // Quote Confirmation
  final_quote_amount: null as number | null,
  final_quote_confirmed_date: null as string | null,
  final_quote_notes: null as string | null,
  
  // Phase 1: Buy#
  buy_number: null as string | null,
  buy_number_requested_date: null as string | null,
  buy_number_follow_up_date: null as string | null,
  buy_number_received_date: null as string | null,
  buy_number_notes: null as string | null,
  
  // Phase 2: PO
  po_number: null as string | null,
  po_requested_date: null as string | null,
  po_sent_date: null as string | null,
  po_follow_up_date: null as string | null,
  po_received_date: null as string | null,
  po_confirmed_date: null as string | null,
  po_notes: null as string | null,
  
  // Phase 3: Submittals
  submittals_requested_date: null as string | null,
  submittals_follow_up_date: null as string | null,
  submittals_received_date: null as string | null,
  submittals_status: 'pending' as const,
  submittals_approved_date: null as string | null,
  submittals_rejected_date: null as string | null,
  submittals_rejection_reason: null as string | null,
  submittals_revision_count: 0,
  submittals_last_revision_date: null as string | null,
  submittals_notes: null as string | null,
  
  // Phase 4: Revised Plans
  revised_plans_requested_date: null as string | null,
  revised_plans_sent_date: null as string | null,
  revised_plans_follow_up_date: null as string | null,
  revised_plans_confirmed_date: null as string | null,
  revised_plans_notes: null as string | null,
  
  // Phase 5: Equipment Release
  equipment_release_requested_date: null as string | null,
  equipment_release_follow_up_date: null as string | null,
  equipment_released_date: null as string | null,
  equipment_release_notes: null as string | null,
  
  // Phase 6: Closeouts
  closeout_requested_date: null as string | null,
  closeout_follow_up_date: null as string | null,
  closeout_received_date: null as string | null,
  closeout_approved_date: null as string | null,
  closeout_notes: null as string | null,
  
  // APM Status and Phase Tracking
  apm_phase: 'quote_confirmed' as const,
  apm_status: 'pending' as const,
  next_follow_up_date: null as string | null,
  apm_priority: false,
  apm_phase_updated_at: null as string | null,
  
});

// Helper function to create a new BidVendor with all required fields
export const createBidVendorWithDefaults = (
  baseBidVendor: Omit<BidVendor, keyof ReturnType<typeof getDefaultAPMFields>> & { id: number; bid_id: number }
): BidVendor => ({
  ...baseBidVendor,
  ...getDefaultAPMFields(),
});