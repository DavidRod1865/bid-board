import { createClient } from '@supabase/supabase-js'
// Types imported but not directly used - kept for future expansion
// import type { ProjectVendor, VendorApmPhase, VendorFinancial, VendorFollowUp, ProjectVendorComplete, BidVendor } from '../types'

// Real-time payload types
type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Record<string, unknown>
  old?: Record<string, unknown>
  errors?: string[]
}

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client (singleton pattern)
let _supabaseClient: any = null;
export const supabase = (() => {
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return _supabaseClient;
})()

// Real-time channel management for normalized tables
export class RealtimeManager {
  private channels: { [key: string]: ReturnType<typeof supabase.channel> } = {}

  setStateUpdaters(_updaters: {
    setBids?: (bids: any[] | ((prev: any[]) => any[])) => void;
    setVendors?: (vendors: any[] | ((prev: any[]) => any[])) => void;
    setBidVendors?: (bidVendors: any[] | ((prev: any[]) => any[])) => void;
    setProjectNotes?: (notes: any[] | ((prev: any[]) => any[])) => void;
  }) {
    // State updaters not currently used - full refresh approach instead
  }

  // Real-time subscriptions for normalized tables
  subscribeToDataChanges(callback?: (payload: RealtimePayload) => void) {
    const channel = supabase
      .channel('normalized_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_vendors' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'est_responses' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_financials' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apm_phases' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_notes' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_contacts' }, (payload: any) => {
        this.triggerDataRefresh();
        callback?.(payload);
      })
      .subscribe();

    this.channels['normalized_data_changes'] = channel;
    return channel;
  }

  // Trigger full data refresh for normalized tables
  private triggerDataRefresh() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-data-changed'));
    }
  }

  // Unsubscribe from specific channel
  unsubscribe(channelName: string) {
    if (this.channels[channelName]) {
      this.channels[channelName].unsubscribe();
      delete this.channels[channelName];
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    Object.values(this.channels).forEach(channel => {
      channel.unsubscribe();
    });
    this.channels = {};
  }
}

// Create singleton instance
export const realtimeManager = new RealtimeManager();

// Data mapping utilities for projects_complete view
// No transformation function needed - direct mapping in getBids() and getBidById()

// Database operations optimized for normalized tables
export const dbOperations = {
  // API Usage Tracking
  trackApiCall(method: string) {
    console.debug(`🔄 API Call: ${method}`);
  },

  // ===========================================
  // READ OPERATIONS (Optimized for Normalized Tables)
  // ===========================================

  // Get all projects using normalized views  
  async getBids() {
    this.trackApiCall('getBids');
    
    const { data: projectsData, error } = await supabase
      .from('projects_complete')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map projects directly to Bid interface format and separate bidVendors
    const bids: any[] = [];
    const bidVendors: any[] = [];

    // Note: APM phases are already included in the projects_complete view 
    // as part of vendors_data.apm_phases, so no separate fetch is needed

    projectsData?.forEach((project: any) => {
      // Map project data directly to Bid interface (no transformation needed)
      const bid = {
        // Core project fields
        id: project.id,
        project_name: project.project_name,
        project_email: project.project_email,
        project_address: project.project_address,
        general_contractor: project.old_general_contractor,
        project_description: project.project_description,
        status: project.status,
        priority: project.priority || false,
        estimated_value: project.estimated_value,
        notes: project.notes,
        created_by: project.created_by,
        file_location: project.file_location,
        
        // Computed boolean fields from activity cycle enums
        archived: project.est_activity_cycle === 'Archived',
        archived_at: project.archived_at,
        archived_by: project.archived_by,
        on_hold: project.est_activity_cycle === 'On Hold',
        on_hold_at: project.on_hold_at,
        on_hold_by: project.on_hold_by,
        
        // Team and workflow fields
        department: project.department,
        sent_to_apm: project.sent_to_apm || false,
        sent_to_apm_at: project.sent_to_apm_at,
        
        // APM computed fields
        apm_on_hold: project.apm_activity_cycle === 'On Hold',
        apm_on_hold_at: project.apm_on_hold_at,
        apm_archived: project.apm_activity_cycle === 'Archived',
        apm_archived_at: project.apm_archived_at,
        
        // Additional fields
        gc_system: project.gc_system,
        gc_contact_id: project.gc_contact_id,
        added_to_procore: project.added_to_procore || false,
        made_by_apm: project.made_by_apm || false,
        project_start_date: project.project_start_date,
        
        // Legacy compatibility fields (primary interface for components)
        title: project.project_name,
        due_date: project.est_due_date,
        assign_to: project.assigned_to,
        
        // Database field names (optional, for transition compatibility)
        est_due_date: project.est_due_date,
        assigned_to: project.assigned_to,
        
        // Timestamps
        created_at: project.created_at,
        updated_at: project.updated_at
      };
      bids.push(bid);

      // Extract and transform project vendors to legacy format
      // The view returns vendors_data instead of project_vendors_complete
      if (project.vendors_data && Array.isArray(project.vendors_data)) {
        project.vendors_data.forEach((vendorData: any) => {
          if (vendorData && vendorData.id) {
            // Get APM phases from the view data (already included)
            const apmPhases = vendorData.apm_phases || [];

            // Determine current APM phase based on apm_phases
            let currentApmPhase = 'quote_confirmed'; // Default
            if (apmPhases.length > 0) {
              const activePhase = apmPhases.find((p: any) => p.status !== 'Completed');
              if (activePhase) {
                // Map phase names to legacy phase values
                const phaseMapping: { [key: string]: string } = {
                  'Buy Number': 'buy_number',
                  'Purchase Order': 'po',
                  'Submittals': 'submittals',
                  'Revised Plans': 'revised_plans',
                  'Equipment Release': 'equipment_release',
                  'Closeouts': 'closeouts'
                };
                currentApmPhase = phaseMapping[activePhase.phase_name] || 'quote_confirmed';
              } else if (apmPhases.every((p: any) => p.status === 'Completed')) {
                currentApmPhase = 'completed';
              }
            }

            bidVendors.push({
              id: vendorData.id,
              bid_id: project.id,
              vendor_id: vendorData.vendor_id,
              vendor_name: vendorData.vendor_name,
              is_priority: vendorData.is_priority,
              assigned_apm_user: vendorData.assigned_by_user,
              due_date: vendorData.est_response?.response_due_date,
              response_received_date: vendorData.est_response?.response_received_date,
              status: vendorData.est_response?.status || 'pending',
              follow_up_count: 0,
              last_follow_up_date: vendorData.est_response?.follow_up_date,
              response_notes: vendorData.est_response?.response_notes,
              responded_by: null,
              cost_amount: vendorData.est_response?.cost_amount || vendorData.financials?.estimated_amount,
              final_quote_amount: vendorData.financials?.final_amount,
              buy_number: vendorData.financials?.buy_number,
              po_number: vendorData.financials?.po_number,
              // Add APM phases data and computed current phase
              apm_phases: apmPhases,
              apm_phase: currentApmPhase as any,
              apm_status: apmPhases.length > 0 ? 'in_progress' as any : 'pending' as any,
              apm_priority: vendorData.is_priority || false,
              apm_phase_updated_at: apmPhases.length > 0 ? apmPhases[apmPhases.length - 1].updated_at : null,
              next_follow_up_date: apmPhases.find((p: any) => p.follow_up_date && p.status !== 'Completed')?.follow_up_date || null,
            });
          }
        });
      }
    });

    return { bids, bidVendors };
  },

  // Get all vendors
  async getVendors() {
    this.trackApiCall('getVendors');
    
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        primary_contact:vendor_contacts!primary_contact_id(
          id,
          contact_name,
          contact_title,
          phone,
          email,
          contact_type
        )
      `)
      .order('company_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all project notes
  async getProjectNotes() {
    this.trackApiCall('getProjectNotes');
    
    const { data, error } = await supabase
      .from('project_notes')
      .select(`
        *,
        user:users!user_id(id, name, email, color_preference)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ===========================================
  // CREATE OPERATIONS
  // ===========================================

  // Create new project
  async createProject(projectData: any) {
    this.trackApiCall('createProject');
    
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        project_name: projectData.project_name || projectData.title,
        project_address: projectData.project_address,
        old_general_contractor: projectData.general_contractor,
        project_description: projectData.project_description,
        est_due_date: projectData.due_date,
        status: projectData.status || 'Gathering Costs',
        department: projectData.department || 'Estimating',
        created_by: projectData.created_by,
        assign_to: projectData.assign_to,
        sent_to_apm: projectData.sent_to_apm || false,
        gc_system: projectData.gc_system,
        added_to_procore: projectData.added_to_procore || false,
        made_by_apm: projectData.made_by_apm || false,
        project_start_date: projectData.project_start_date,
        est_activity_cycle: projectData.archived ? 'Archived' : (projectData.on_hold ? 'On Hold' : 'Active'),
        apm_activity_cycle: projectData.apm_archived ? 'Archived' : (projectData.apm_on_hold ? 'On Hold' : 'Active')
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add vendor to project
  async addVendorToProject(projectId: number, vendorId: number, data: any = {}) {
    this.trackApiCall('addVendorToProject');
    
    // Create project_vendor relationship
    const { data: projectVendor, error: pvError } = await supabase
      .from('project_vendors')
      .insert([{
        project_id: projectId,
        vendor_id: vendorId,
        is_priority: data.is_priority || false,
        assigned_by_user: data.assigned_by_user
      }])
      .select()
      .single();

    if (pvError) throw pvError;

    // Create corresponding est_response
    const { data: estResponse, error: erError } = await supabase
      .from('est_responses')
      .insert([{
        project_vendor_id: projectVendor.id,
        status: data.status || 'pending',
        response_due_date: data.due_date,
        is_priority: data.is_priority || false,
        response_notes: data.response_notes,
        cost_amount: data.cost_amount
      }])
      .select()
      .single();

    if (erError) throw erError;

    // Create corresponding project_financials
    const { data: projectFinancials, error: pfError } = await supabase
      .from('project_financials')
      .insert([{
        project_vendor_id: projectVendor.id,
        estimated_amount: data.cost_amount,
        final_amount: data.final_quote_amount,
        buy_number: data.buy_number,
        po_number: data.po_number
      }])
      .select()
      .single();

    if (pfError) throw pfError;

    return { projectVendor, estResponse, projectFinancials };
  },

  // ===========================================
  // UPDATE OPERATIONS
  // ===========================================

  // Update project - General function (legacy)
  async updateProject(projectId: number, updates: any) {
    this.trackApiCall('updateProject');
    
    // Map legacy boolean fields to activity cycle enums
    let estActivityCycle: string | undefined;
    let apmActivityCycle: string | undefined;
    
    // Determine estimating activity cycle from legacy boolean fields
    if (updates.archived !== undefined || updates.on_hold !== undefined) {
      if (updates.archived === true) {
        estActivityCycle = 'Archived';
      } else if (updates.on_hold === true) {
        estActivityCycle = 'On Hold';
      } else {
        // Either archived: false or on_hold: false (or both) means Active
        estActivityCycle = 'Active';
      }
    }
    
    // Determine APM activity cycle from legacy boolean fields  
    if (updates.apm_archived !== undefined || updates.apm_on_hold !== undefined) {
      if (updates.apm_archived === true) {
        apmActivityCycle = 'Archived';
      } else if (updates.apm_on_hold === true) {
        apmActivityCycle = 'On Hold';
      } else {
        // Either apm_archived: false or apm_on_hold: false (or both) means Active
        apmActivityCycle = 'Active';
      }
    }
    
    // Build update object with normalized field mappings
    const updateData: any = {};
    
    // Core project fields - only map fields that exist in database
    if (updates.project_name || updates.title) updateData.project_name = updates.project_name || updates.title;
    if (updates.project_address !== undefined) updateData.project_address = updates.project_address;
    if (updates.project_description !== undefined) updateData.project_description = updates.project_description;
    if (updates.due_date !== undefined) updateData.est_due_date = updates.due_date;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.assign_to !== undefined) updateData.assign_to = updates.assign_to;
    if (updates.created_by !== undefined) updateData.created_by = updates.created_by;
    if (updates.general_contractor !== undefined) updateData.old_general_contractor = updates.general_contractor;
    if (updates.file_location !== undefined) updateData.file_location = updates.file_location;
    
    // Activity cycle enums (replaces legacy boolean fields)
    if (estActivityCycle !== undefined) updateData.est_activity_cycle = estActivityCycle;
    if (apmActivityCycle !== undefined) updateData.apm_activity_cycle = apmActivityCycle;
    
    // Timestamp fields for activity changes
    if (updates.archived_at !== undefined) updateData.archived_at = updates.archived_at;
    if (updates.archived_by !== undefined) updateData.archived_by = updates.archived_by;
    if (updates.on_hold_at !== undefined) updateData.on_hold_at = updates.on_hold_at;
    if (updates.on_hold_by !== undefined) updateData.on_hold_by = updates.on_hold_by;
    if (updates.apm_archived_at !== undefined) updateData.apm_archived_at = updates.apm_archived_at;
    if (updates.apm_on_hold_at !== undefined) updateData.apm_on_hold_at = updates.apm_on_hold_at;
    
    // Other fields
    if (updates.sent_to_apm !== undefined) updateData.sent_to_apm = updates.sent_to_apm;
    if (updates.sent_to_apm_at !== undefined) updateData.sent_to_apm_at = updates.sent_to_apm_at;
    if (updates.made_by_apm !== undefined) updateData.made_by_apm = updates.made_by_apm;
    
    // Always update the timestamp
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update project for Estimating module - only core estimating fields
  async updateEstimatingProject(projectId: number, updates: any) {
    this.trackApiCall('updateEstimatingProject');
    
    // Map legacy boolean fields to activity cycle enums
    let estActivityCycle: string | undefined;
    
    // Determine estimating activity cycle from legacy boolean fields
    if (updates.archived !== undefined || updates.on_hold !== undefined) {
      if (updates.archived === true) {
        estActivityCycle = 'Archived';
      } else if (updates.on_hold === true) {
        estActivityCycle = 'On Hold';
      } else {
        estActivityCycle = 'Active';
      }
    }
    
    // Build update object with only estimating fields
    const updateData: any = {};
    
    // Core project fields for estimating
    if (updates.project_name || updates.title) updateData.project_name = updates.project_name || updates.title;
    if (updates.project_address !== undefined) updateData.project_address = updates.project_address;
    if (updates.project_description !== undefined) updateData.project_description = updates.project_description;
    if (updates.due_date !== undefined) updateData.est_due_date = updates.due_date;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.assign_to !== undefined) updateData.assign_to = updates.assign_to;
    if (updates.created_by !== undefined) updateData.created_by = updates.created_by;
    if (updates.general_contractor !== undefined) updateData.old_general_contractor = updates.general_contractor;
    if (updates.file_location !== undefined) updateData.file_location = updates.file_location;
    
    // Estimating activity cycle
    if (estActivityCycle !== undefined) updateData.est_activity_cycle = estActivityCycle;
    
    // Estimating timestamp fields
    if (updates.archived_at !== undefined) updateData.archived_at = updates.archived_at;
    if (updates.archived_by !== undefined) updateData.archived_by = updates.archived_by;
    if (updates.on_hold_at !== undefined) updateData.on_hold_at = updates.on_hold_at;
    if (updates.on_hold_by !== undefined) updateData.on_hold_by = updates.on_hold_by;
    
    // Workflow fields
    if (updates.sent_to_apm !== undefined) updateData.sent_to_apm = updates.sent_to_apm;
    if (updates.sent_to_apm_at !== undefined) updateData.sent_to_apm_at = updates.sent_to_apm_at;
    
    // Always update the timestamp
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update project for APM module - includes APM-specific fields
  async updateAPMProject(projectId: number, updates: any) {
    this.trackApiCall('updateAPMProject');
    
    
    // Map legacy boolean fields to activity cycle enums
    let estActivityCycle: string | undefined;
    let apmActivityCycle: string | undefined;
    
    // Determine estimating activity cycle from legacy boolean fields
    if (updates.archived !== undefined || updates.on_hold !== undefined) {
      if (updates.archived === true) {
        estActivityCycle = 'Archived';
      } else if (updates.on_hold === true) {
        estActivityCycle = 'On Hold';
      } else {
        estActivityCycle = 'Active';
      }
    }
    
    // Determine APM activity cycle from legacy boolean fields  
    if (updates.apm_archived !== undefined || updates.apm_on_hold !== undefined) {
      if (updates.apm_archived === true) {
        apmActivityCycle = 'Archived';
      } else if (updates.apm_on_hold === true) {
        apmActivityCycle = 'On Hold';
      } else {
        apmActivityCycle = 'Active';
      }
    }
    
    // Build update object with APM fields
    const updateData: any = {};
    
    // Core project fields
    if (updates.project_name || updates.title) updateData.project_name = updates.project_name || updates.title;
    if (updates.project_address !== undefined) updateData.project_address = updates.project_address;
    if (updates.project_description !== undefined) updateData.project_description = updates.project_description;
    if (updates.due_date !== undefined) updateData.est_due_date = updates.due_date;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.assign_to !== undefined) updateData.assign_to = updates.assign_to;
    if (updates.created_by !== undefined) updateData.created_by = updates.created_by;
    if (updates.general_contractor !== undefined) updateData.old_general_contractor = updates.general_contractor;
    if (updates.file_location !== undefined) updateData.file_location = updates.file_location;
    
    // APM-specific fields that exist in database
    if (updates.gc_system !== undefined) updateData.gc_system = updates.gc_system;
    if (updates.added_to_procore !== undefined) updateData.added_to_procore = updates.added_to_procore;
    if (updates.project_start_date !== undefined) updateData.project_start_date = updates.project_start_date;
    if (updates.gc_contact_id !== undefined) updateData.gc_contact_id = updates.gc_contact_id;
    
    // Activity cycle enums
    if (estActivityCycle !== undefined) updateData.est_activity_cycle = estActivityCycle;
    if (apmActivityCycle !== undefined) updateData.apm_activity_cycle = apmActivityCycle;
    
    // Timestamp fields for activity changes
    if (updates.archived_at !== undefined) updateData.archived_at = updates.archived_at;
    if (updates.archived_by !== undefined) updateData.archived_by = updates.archived_by;
    if (updates.on_hold_at !== undefined) updateData.on_hold_at = updates.on_hold_at;
    if (updates.on_hold_by !== undefined) updateData.on_hold_by = updates.on_hold_by;
    if (updates.apm_archived_at !== undefined) updateData.apm_archived_at = updates.apm_archived_at;
    if (updates.apm_on_hold_at !== undefined) updateData.apm_on_hold_at = updates.apm_on_hold_at;
    
    // Other APM workflow fields
    if (updates.sent_to_apm !== undefined) updateData.sent_to_apm = updates.sent_to_apm;
    if (updates.sent_to_apm_at !== undefined) updateData.sent_to_apm_at = updates.sent_to_apm_at;
    if (updates.made_by_apm !== undefined) updateData.made_by_apm = updates.made_by_apm;
    
    // GC contact is now properly stored in the database
    
    // Always update the timestamp
    updateData.updated_at = new Date().toISOString();
    
    
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    
    return data;
  },

  // ===========================================
  // DELETE OPERATIONS
  // ===========================================

  // Delete project and all related data
  async deleteProject(projectId: number) {
    this.trackApiCall('deleteProject');
    
    // Get all project_vendors for this project first
    const { data: projectVendors, error: pvError } = await supabase
      .from('project_vendors')
      .select('id')
      .eq('project_id', projectId);

    if (pvError) throw pvError;

    const projectVendorIds = projectVendors?.map((pv: any) => pv.id) || [];
    
    if (projectVendorIds.length > 0) {
      // Delete related child tables concurrently (all depend on project_vendor_id)
      const childDeleteOperations = [
        supabase.from('apm_phases').delete().in('project_vendor_id', projectVendorIds),
        supabase.from('est_responses').delete().in('project_vendor_id', projectVendorIds),
        supabase.from('project_financials').delete().in('project_vendor_id', projectVendorIds)
      ];

      // Execute child deletions concurrently
      const childResults = await Promise.allSettled(childDeleteOperations);
      
      // Check for any failures in child deletions
      const childErrors = childResults
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);
      
      if (childErrors.length > 0) {
        throw new Error(`Failed to delete child records: ${childErrors.join(', ')}`);
      }

      // Delete project_vendors after children are deleted
      const { error: pvDeleteError } = await supabase
        .from('project_vendors')
        .delete()
        .in('id', projectVendorIds);

      if (pvDeleteError) throw pvDeleteError;
    }

    // Delete project notes and project concurrently (independent operations)
    const [notesResult, projectResult] = await Promise.allSettled([
      supabase.from('project_notes').delete().eq('bid_id', projectId),
      supabase.from('projects').delete().eq('id', projectId).select().single()
    ]);

    // Handle project notes deletion result
    if (notesResult.status === 'rejected') {
      console.warn('Failed to delete project notes:', notesResult.reason);
      // Don't fail the entire operation for notes deletion failure
    }

    // Handle project deletion result
    if (projectResult.status === 'rejected') {
      throw projectResult.reason;
    }

    const { data, error } = projectResult.value;
    if (error) throw error;
    return data;
  },

  // ===========================================
  // VENDOR OPERATIONS
  // ===========================================

  // Create vendor with contacts
  async createVendorWithContacts(vendorData: any, contactsData: any[] = []) {
    this.trackApiCall('createVendorWithContacts');
    
    // Create vendor first
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert([vendorData])
      .select()
      .single();

    if (vendorError) throw vendorError;

    // Create contacts if provided
    if (contactsData.length > 0) {
      const contactsToInsert = contactsData.map(contact => ({
        ...contact,
        vendor_id: vendor.id
      }));

      const { error: contactsError } = await supabase
        .from('vendor_contacts')
        .insert(contactsToInsert);

      if (contactsError) throw contactsError;
    }

    return vendor;
  },

  // Update vendor
  async updateVendor(vendorId: number, updates: any) {
    this.trackApiCall('updateVendor');
    
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete vendor
  async deleteVendor(vendorId: number) {
    this.trackApiCall('deleteVendor');
    
    const { data, error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Sync vendor primary contact (overloaded to handle missing contactId)
  async syncVendorPrimaryContact(vendorId: number, contactId?: number) {
    this.trackApiCall('syncVendorPrimaryContact');
    
    // If no contactId provided, find the first contact for this vendor
    if (!contactId) {
      const { data: contacts, error: contactError } = await supabase
        .from('vendor_contacts')
        .select('id')
        .eq('vendor_id', vendorId)
        .limit(1);
        
      if (contactError) throw contactError;
      
      if (!contacts || contacts.length === 0) {
        // No contacts exist for this vendor, clear primary_contact_id
        const { data, error } = await supabase
          .from('vendors')
          .update({ primary_contact_id: null })
          .eq('id', vendorId)
          .select()
          .single();
          
        if (error) throw error;
        return data;
      }
      
      contactId = contacts[0].id;
    }
    
    const { data, error } = await supabase
      .from('vendors')
      .update({ primary_contact_id: contactId })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ===========================================
  // PROJECT VENDOR OPERATIONS
  // ===========================================

  // Remove vendor from project
  async removeVendorFromProject(projectVendorId: number) {
    this.trackApiCall('removeVendorFromProject');
    
    // Delete related data first
    await supabase.from('apm_phases').delete().eq('project_vendor_id', projectVendorId);
    await supabase.from('est_responses').delete().eq('project_vendor_id', projectVendorId);
    await supabase.from('project_financials').delete().eq('project_vendor_id', projectVendorId);
    
    // Delete project vendor
    const { data, error } = await supabase
      .from('project_vendors')
      .delete()
      .eq('id', projectVendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update project vendor data (simplified approach for compatibility)
  async updateProjectVendor(projectVendorId: number, updates: any) {
    this.trackApiCall('updateProjectVendor');
    
    // For backwards compatibility, we'll distribute updates across the normalized tables
    // Update est_responses if relevant fields are provided
    if (updates.response_received_date || updates.status || updates.response_notes || 
        updates.responded_by || updates.follow_up_count || updates.last_follow_up_date) {
      await supabase
        .from('est_responses')
        .update({
          response_received_date: updates.response_received_date,
          status: updates.status,
          response_notes: updates.response_notes,
          responded_by: updates.responded_by,
          follow_up_count: updates.follow_up_count,
          last_follow_up_date: updates.last_follow_up_date
        })
        .eq('project_vendor_id', projectVendorId);
    }

    // Update project_financials if relevant fields are provided
    if (updates.cost_amount || updates.final_quote_amount || updates.buy_number || updates.po_number) {
      await supabase
        .from('project_financials')
        .update({
          estimated_amount: updates.cost_amount,
          final_amount: updates.final_quote_amount,
          buy_number: updates.buy_number,
          po_number: updates.po_number
        })
        .eq('project_vendor_id', projectVendorId);
    }

    // Update project_vendors table for basic fields
    if (updates.is_priority !== undefined || updates.assigned_by_user !== undefined) {
      await supabase
        .from('project_vendors')
        .update({
          is_priority: updates.is_priority,
          assigned_by_user: updates.assigned_by_user
        })
        .eq('id', projectVendorId);
    }

    return { success: true };
  },

  // ===========================================
  // PROJECT NOTES OPERATIONS  
  // ===========================================

  // Create project note
  async createProjectNote(noteData: any) {
    this.trackApiCall('createProjectNote');
    
    // If no user_id provided, try to get current user from Auth
    let finalNoteData = { ...noteData };
    if (!finalNoteData.user_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const dbUser = await this.getUserByEmail(user.email);
          if (dbUser) {
            finalNoteData.user_id = dbUser.id;
          }
        }
      } catch (err) {
        // If we can't get the user, continue without user_id
        console.warn('Could not get current user for project note:', err);
      }
    }
    
    const { data, error } = await supabase
      .from('project_notes')
      .insert([finalNoteData])
      .select(`
        *,
        user:users!user_id(id, name, email, color_preference)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update project note
  async updateProjectNote(noteId: number, updates: any) {
    this.trackApiCall('updateProjectNote');
    
    const { data, error } = await supabase
      .from('project_notes')
      .update(updates)
      .eq('id', noteId)
      .select(`
        *,
        user:users!user_id(id, name, email, color_preference)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Delete project note
  async deleteProjectNote(noteId: number) {
    this.trackApiCall('deleteProjectNote');
    
    const { data, error } = await supabase
      .from('project_notes')
      .delete()
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ===========================================
  // LEGACY COMPATIBILITY FUNCTIONS
  // ===========================================
  
  // Get single project by ID
  async getBidById(bidId: number) {
    this.trackApiCall('getBidById');
    
    const { data: project, error } = await supabase
      .from('projects_complete')
      .select('*')
      .eq('id', bidId)
      .single();

    if (error) throw error;
    
    if (!project) return null;
    
    // Map project data directly to Bid interface (same as in getBids)
    return {
      // Core project fields
      id: project.id,
      project_name: project.project_name,
      project_email: project.project_email,
      project_address: project.project_address,
      general_contractor: project.old_general_contractor,
      project_description: project.project_description,
      status: project.status,
      priority: project.priority || false,
      estimated_value: project.estimated_value,
      notes: project.notes,
      created_by: project.created_by,
      file_location: project.file_location,
      
      // Computed boolean fields from activity cycle enums
      archived: project.est_activity_cycle === 'Archived',
      archived_at: project.archived_at,
      archived_by: project.archived_by,
      on_hold: project.est_activity_cycle === 'On Hold',
      on_hold_at: project.on_hold_at,
      on_hold_by: project.on_hold_by,
      
      // Team and workflow fields
      department: project.department,
      sent_to_apm: project.sent_to_apm || false,
      sent_to_apm_at: project.sent_to_apm_at,
      
      // APM computed fields
      apm_on_hold: project.apm_activity_cycle === 'On Hold',
      apm_on_hold_at: project.apm_on_hold_at,
      apm_archived: project.apm_activity_cycle === 'Archived',
      apm_archived_at: project.apm_archived_at,
      
      // Additional fields
      gc_system: project.gc_system,
      gc_contact_id: project.gc_contact_id,
      added_to_procore: project.added_to_procore || false,
      made_by_apm: project.made_by_apm || false,
      project_start_date: project.project_start_date,
      
      // Legacy compatibility fields (primary interface for components)
      title: project.project_name,
      due_date: project.est_due_date,
      assign_to: project.assigned_to,
      
      // Database field names (optional, for transition compatibility)
      est_due_date: project.est_due_date,
      assigned_to: project.assigned_to,
      
      // Timestamps
      created_at: project.created_at,
      updated_at: project.updated_at
    };
  },

  // Get single vendor by ID
  async getVendor(vendorId: number) {
    this.trackApiCall('getVendor');
    
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        primary_contact:vendor_contacts!primary_contact_id(
          id,
          contact_name,
          contact_title,
          phone,
          email,
          contact_type
        )
      `)
      .eq('id', vendorId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all users
  async getUsers() {
    this.trackApiCall('getUsers');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get user by email
  async getUserByEmail(email: string) {
    this.trackApiCall('getUserByEmail');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  },

  // Create or update user profile
  async createOrUpdateUserProfile(userData: any) {
    this.trackApiCall('createOrUpdateUserProfile');
    
    const { data, error } = await supabase
      .from('users')
      .upsert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: any) {
    this.trackApiCall('updateUserProfile');
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark user as active
  async markUserAsActive(userId: string) {
    this.trackApiCall('markUserAsActive');
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        is_active: true 
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Test database connection
  async testDatabaseConnection() {
    this.trackApiCall('testDatabaseConnection');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  },

  // Get all vendor contacts
  async getAllVendorContacts() {
    this.trackApiCall('getAllVendorContacts');
    
    const { data, error } = await supabase
      .from('vendor_contacts')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('contact_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Legacy bid operations (mapped to project operations)
  async updateBid(bidId: number, updates: any) {
    return this.updateProject(bidId, updates);
  },

  async deleteBid(bidId: number) {
    return this.deleteProject(bidId);
  },

  async unarchiveBid(bidId: number) {
    return this.updateProject(bidId, { 
      archived: false, 
      archived_at: null, 
      archived_by: null 
    });
  },

  // Legacy bid vendor operations (mapped to project vendor operations)
  async updateBidVendor(bidVendorId: number, updates: any) {
    return this.updateProjectVendor(bidVendorId, updates);
  },

  async addVendorToBid(bidId: number, vendorData: any) {
    return this.addVendorToProject(bidId, vendorData.vendor_id, vendorData);
  },

  async removeVendorFromBid(bidVendorId: number) {
    return this.removeVendorFromProject(bidVendorId);
  },

  // ===========================================
  // VENDOR CONTACT OPERATIONS
  // ===========================================

  // Get contacts for a specific vendor
  async getVendorContacts(vendorId: number) {
    this.trackApiCall('getVendorContacts');
    
    const { data, error } = await supabase
      .from('vendor_contacts')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('is_primary', { ascending: false })
      .order('contact_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create a vendor contact
  async createVendorContact(contactData: any) {
    this.trackApiCall('createVendorContact');
    
    const { data, error } = await supabase
      .from('vendor_contacts')
      .insert([contactData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update vendor contact
  async updateVendorContact(contactId: number, updates: any) {
    this.trackApiCall('updateVendorContact');
    
    const { data, error } = await supabase
      .from('vendor_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete vendor contact
  async deleteVendorContact(contactId: number) {
    this.trackApiCall('deleteVendorContact');
    
    // First, get the contact to check if it's primary and get vendor_id
    const { data: contactToDelete, error: fetchError } = await supabase
      .from('vendor_contacts')
      .select('id, vendor_id, is_primary')
      .eq('id', contactId)
      .single();

    if (fetchError) throw fetchError;
    if (!contactToDelete) throw new Error('Contact not found');

    const vendorId = contactToDelete.vendor_id;
    const isPrimary = contactToDelete.is_primary;

    // Delete the contact
    const { data, error } = await supabase
      .from('vendor_contacts')
      .delete()
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;

    // If we deleted the primary contact, check if there are other contacts
    if (isPrimary) {
      const { data: remainingContacts } = await supabase
        .from('vendor_contacts')
        .select('id')
        .eq('vendor_id', vendorId)
        .limit(1);

      if (remainingContacts && remainingContacts.length > 0) {
        // Promote the first remaining contact to primary
        await this.setPrimaryContact(vendorId, remainingContacts[0].id);
      } else {
        // No more contacts, clear the vendor's primary_contact_id
        await supabase
          .from('vendors')
          .update({ primary_contact_id: null })
          .eq('id', vendorId);
      }
    }

    return data;
  },

  // Set primary contact (ensures only one primary contact per vendor)
  async setPrimaryContact(vendorId: number, contactId: number) {
    this.trackApiCall('setPrimaryContact');
    
    // First, remove primary status from all contacts for this vendor
    const { error: clearError } = await supabase
      .from('vendor_contacts')
      .update({ is_primary: false })
      .eq('vendor_id', vendorId);

    if (clearError) throw clearError;

    // Then set the specified contact as primary
    const { error: setError } = await supabase
      .from('vendor_contacts')
      .update({ is_primary: true })
      .eq('id', contactId)
      .eq('vendor_id', vendorId); // Extra safety check

    if (setError) throw setError;

    // Finally, update the vendor's primary_contact_id to match
    const { data, error } = await supabase
      .from('vendors')
      .update({ primary_contact_id: contactId })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ===========================================
  // ADMIN AND ANALYTICS OPERATIONS (Stub implementations)
  // ===========================================

  // User management operations
  async createPendingUser(userData: any) {
    this.trackApiCall('createPendingUser');
    return this.createOrUpdateUserProfile({ ...userData, status: 'pending' });
  },

  async deleteUser(userId: string) {
    this.trackApiCall('deleteUser');
    
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async resendUserInvitation(userId: string) {
    this.trackApiCall('resendUserInvitation');
    // Placeholder - would integrate with email service
    console.log('Resending invitation for user:', userId);
    return { success: true };
  },

  // Analytics operations (minimal implementations)
  async getResponseDistribution() {
    this.trackApiCall('getResponseDistribution');
    const { bids } = await this.getBids();
    return bids || [];
  },

  async getTrendData() {
    this.trackApiCall('getTrendData');
    const { bids } = await this.getBids();
    return bids || [];
  },

  async getVendorPerformanceData() {
    this.trackApiCall('getVendorPerformanceData');
    return [];
  },

  async getTimeDistributionData() {
    this.trackApiCall('getTimeDistributionData');
    return [];
  },

  async getBidsForKPI() {
    this.trackApiCall('getBidsForKPI');
    const { bids } = await this.getBids();
    return bids || [];
  },

  // ===========================================
  // APM PHASES OPERATIONS
  // ===========================================

  // Get all APM phases for a project vendor
  async getAPMPhases(projectVendorId: number) {
    this.trackApiCall('getAPMPhases');
    
    const { data, error } = await supabase
      .from('apm_phases')
      .select('*')
      .eq('project_vendor_id', projectVendorId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create new APM phase
  async createAPMPhase(projectVendorId: number, phaseData: {
    phase_name: string;
    status?: string;
    requested_date?: string;
    follow_up_date?: string;
    received_date?: string;
    notes?: string;
    revision_count?: number;
    last_revision_date?: string;
  }) {
    this.trackApiCall('createAPMPhase');
    
    const { data, error } = await supabase
      .from('apm_phases')
      .insert([{
        project_vendor_id: projectVendorId,
        phase_name: phaseData.phase_name,
        status: phaseData.status || 'Pending',
        requested_date: phaseData.requested_date,
        follow_up_date: phaseData.follow_up_date,
        received_date: phaseData.received_date,
        notes: phaseData.notes,
        revision_count: phaseData.revision_count || 0,
        last_revision_date: phaseData.last_revision_date
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update APM phase
  async updateAPMPhase(phaseId: number, updates: {
    status?: string;
    requested_date?: string;
    follow_up_date?: string;
    received_date?: string;
    notes?: string;
    revision_count?: number;
    last_revision_date?: string;
  }) {
    this.trackApiCall('updateAPMPhase');
    
    const { data, error } = await supabase
      .from('apm_phases')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', phaseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete APM phase
  async deleteAPMPhase(phaseId: number) {
    this.trackApiCall('deleteAPMPhase');
    
    const { data, error } = await supabase
      .from('apm_phases')
      .delete()
      .eq('id', phaseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get complete APM data for a project vendor (project vendor + phases)
  async getProjectVendorAPMData(projectVendorId: number) {
    this.trackApiCall('getProjectVendorAPMData');
    
    const [projectVendor, phases] = await Promise.all([
      supabase
        .from('project_vendors')
        .select('*')
        .eq('id', projectVendorId)
        .single(),
      this.getAPMPhases(projectVendorId)
    ]);

    if (projectVendor.error) throw projectVendor.error;

    return {
      projectVendor: projectVendor.data,
      apmPhases: phases
    };
  }
};