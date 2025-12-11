import { createClient } from '@supabase/supabase-js'

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

// Data transformation utilities
function transformProjectToLegacyBid(project: any) {
  return {
    id: project.id,
    title: project.project_name,
    project_name: project.project_name,
    project_email: project.project_email,
    project_address: project.project_address,
    general_contractor: project.general_contractor,
    project_description: project.project_description,
    due_date: project.est_due_date,
    status: project.status,
    priority: project.priority || false,
    estimated_value: project.estimated_value,
    notes: project.notes,
    created_by: project.created_by,
    assign_to: project.assigned_to,
    file_location: project.file_location,
    archived: project.archived || false,
    archived_at: project.archived_at,
    archived_by: project.archived_by,
    on_hold: project.on_hold || false,
    on_hold_at: project.on_hold_at,
    on_hold_by: project.on_hold_by,
    department: project.department,
    sent_to_apm: project.sent_to_apm || false,
    sent_to_apm_at: project.sent_to_apm_at,
    apm_on_hold: project.apm_on_hold || false,
    apm_on_hold_at: project.apm_on_hold_at,
    apm_archived: project.apm_archived || false,
    apm_archived_at: project.apm_archived_at,
    gc_system: project.gc_system,
    added_to_procore: project.added_to_procore || false,
    made_by_apm: project.made_by_apm || false,
    project_start_date: project.project_start_date,
    created_at: project.created_at,
    updated_at: project.updated_at
  };
}

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

    // Transform and separate bids and bidVendors
    const bids: any[] = [];
    const bidVendors: any[] = [];

    projectsData?.forEach((project: any) => {
      // Transform project data to legacy format
      const bid = transformProjectToLegacyBid(project);
      bids.push(bid);

      // Extract and transform project vendors to legacy format
      if (project.project_vendors_complete && Array.isArray(project.project_vendors_complete)) {
        project.project_vendors_complete.forEach((pv: any) => {
          if (pv && pv.id) {
            bidVendors.push({
              id: pv.id,
              bid_id: project.id,
              vendor_id: pv.vendor_id,
              is_priority: pv.is_priority,
              assigned_apm_user: pv.assigned_by_user,
              ...pv // Include all other fields
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
        primary_contact:vendor_contacts!primary_contact_id(*)
      `)
      .order('vendor_name', { ascending: true });

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
        project_description: projectData.project_description,
        est_due_date: projectData.due_date,
        status: projectData.status || 'Gathering Costs',
        department: projectData.department || 'Estimating',
        priority: projectData.priority || false,
        estimated_value: projectData.estimated_value,
        created_by: projectData.created_by,
        assigned_to: projectData.assign_to,
        archived: projectData.archived || false,
        on_hold: projectData.on_hold || false,
        sent_to_apm: projectData.sent_to_apm || false,
        apm_on_hold: projectData.apm_on_hold || false,
        apm_archived: projectData.apm_archived || false,
        gc_system: projectData.gc_system,
        added_to_procore: projectData.added_to_procore || false,
        made_by_apm: projectData.made_by_apm || false,
        project_start_date: projectData.project_start_date
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
        cost_amount: data.cost_amount,
        final_quote_amount: data.final_quote_amount,
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

  // Update project
  async updateProject(projectId: number, updates: any) {
    this.trackApiCall('updateProject');
    
    const { data, error } = await supabase
      .from('projects')
      .update({
        project_name: updates.project_name || updates.title,
        project_address: updates.project_address,
        project_description: updates.project_description,
        est_due_date: updates.due_date,
        status: updates.status,
        department: updates.department,
        priority: updates.priority,
        estimated_value: updates.estimated_value,
        assigned_to: updates.assign_to,
        archived: updates.archived,
        archived_at: updates.archived ? new Date().toISOString() : null,
        archived_by: updates.archived ? updates.archived_by : null,
        on_hold: updates.on_hold,
        on_hold_at: updates.on_hold ? new Date().toISOString() : null,
        on_hold_by: updates.on_hold ? updates.on_hold_by : null,
        sent_to_apm: updates.sent_to_apm,
        sent_to_apm_at: updates.sent_to_apm ? new Date().toISOString() : null,
        apm_on_hold: updates.apm_on_hold,
        apm_on_hold_at: updates.apm_on_hold ? new Date().toISOString() : null,
        apm_archived: updates.apm_archived,
        apm_archived_at: updates.apm_archived ? new Date().toISOString() : null,
        gc_system: updates.gc_system,
        added_to_procore: updates.added_to_procore,
        made_by_apm: updates.made_by_apm,
        project_start_date: updates.project_start_date,
        updated_at: new Date().toISOString()
      })
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

    // Delete related data in correct order (child tables first)
    const projectVendorIds = projectVendors?.map((pv: any) => pv.id) || [];
    
    if (projectVendorIds.length > 0) {
      // Delete APM phases
      await supabase.from('apm_phases').delete().in('project_vendor_id', projectVendorIds);
      
      // Delete est_responses
      await supabase.from('est_responses').delete().in('project_vendor_id', projectVendorIds);
      
      // Delete project_financials
      await supabase.from('project_financials').delete().in('project_vendor_id', projectVendorIds);
      
      // Delete project_vendors
      await supabase.from('project_vendors').delete().in('id', projectVendorIds);
    }

    // Delete project notes (still uses bid_id in current schema)
    await supabase.from('project_notes').delete().eq('bid_id', projectId);

    // Finally delete the project
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};