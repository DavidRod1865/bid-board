import { createClient } from '@supabase/supabase-js'
// TODO: Re-enable strict typing once schema is stabilized
// import type { Database } from './database.types'

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

// Create Supabase client with TypeScript support
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Create a service role client for operations that need to bypass RLS
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
export const supabaseService = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) : null

// Real-time channel management
export class RealtimeManager {
  private channels: { [key: string]: ReturnType<typeof supabase.channel> } = {}
  private stateUpdaters: {
    setBids?: (bids: any[] | ((prev: any[]) => any[])) => void;
    setVendors?: (vendors: any[] | ((prev: any[]) => any[])) => void;
    setBidVendors?: (bidVendors: any[] | ((prev: any[]) => any[])) => void;
    setProjectNotes?: (notes: any[] | ((prev: any[]) => any[])) => void;
  } = {}

  // Set state updater functions for direct React state updates
  setStateUpdaters(updaters: {
    setBids?: (bids: any[] | ((prev: any[]) => any[])) => void;
    setVendors?: (vendors: any[] | ((prev: any[]) => any[])) => void;
    setBidVendors?: (bidVendors: any[] | ((prev: any[]) => any[])) => void;
    setProjectNotes?: (notes: any[] | ((prev: any[]) => any[])) => void;
  }) {
    this.stateUpdaters = updaters;
  }

  // Lightweight notification-only subscription for bids
  subscribeToDataChanges(callback?: (payload: RealtimePayload) => void) {
    
    const channel = supabase
      .channel('data_changes_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids'
        },
        (payload) => {
          this.handleBidsNotification(payload);
          callback?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_vendors'
        },
        (payload) => {
          this.handleBidVendorsNotification(payload);
          callback?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors'
        },
        (payload) => {
          this.handleVendorsNotification(payload);
          callback?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_notes'
        },
        (payload) => {
          this.handleProjectNotesNotification(payload);
          callback?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_contacts'
        },
        (payload) => {
          this.handleVendorContactsNotification(payload);
          callback?.(payload);
        }
      )
      .subscribe();

    this.channels['data_changes'] = channel;
    return channel;
  }

  // Debounce map to prevent spam
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_DELAY = 1000; // 1 second debounce

  // Handle bids table notifications with incremental updates
  private handleBidsNotification(payload: RealtimePayload) {
    this.debounceNotification('bids', () => {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new bid to existing state with deduplication
          const newBid = payload.new as any;
          this.stateUpdaters.setBids?.(prevBids => {
            const exists = prevBids.some(bid => bid.id === newBid.id);
            return exists ? prevBids : [newBid, ...prevBids];
          });
          
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update existing bid in state
          const updatedBid = payload.new as any;
          this.stateUpdaters.setBids?.(prevBids => 
            prevBids.map(bid => bid.id === updatedBid.id ? updatedBid : bid)
          );
          
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove bid from state
          const deletedBid = payload.old as any;
          this.stateUpdaters.setBids?.(prevBids => 
            prevBids.filter(bid => bid.id !== deletedBid.id)
          );
          // Also remove related bid vendors
          this.stateUpdaters.setBidVendors?.(prevBidVendors =>
            prevBidVendors.filter(bv => bv.bid_id !== deletedBid.id)
          );
        }
      } catch (error) {
        console.error('Error handling bids real-time notification:', error);
      }
    });
  }

  // Handle bid_vendors table notifications with incremental updates
  private handleBidVendorsNotification(payload: RealtimePayload) {
    this.debounceNotification('bid_vendors', () => {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new bid vendor to existing state with deduplication
          const newBidVendor = { ...payload.new, bid_id: (payload.new as any).bid_id } as any;
          this.stateUpdaters.setBidVendors?.(prevBidVendors => {
            const exists = prevBidVendors.some(bv => bv.id === newBidVendor.id);
            return exists ? prevBidVendors : [newBidVendor, ...prevBidVendors];
          });
          
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update existing bid vendor in state
          const updatedBidVendor = payload.new as any;
          this.stateUpdaters.setBidVendors?.(prevBidVendors => 
            prevBidVendors.map(bv => bv.id === updatedBidVendor.id ? updatedBidVendor : bv)
          );
          
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove bid vendor from state
          const deletedBidVendor = payload.old as any;
          this.stateUpdaters.setBidVendors?.(prevBidVendors => 
            prevBidVendors.filter(bv => bv.id !== deletedBidVendor.id)
          );
        }
      } catch (error) {
        console.error('Error handling bid_vendors real-time notification:', error);
      }
    });
  }

  // Handle vendors table notifications with incremental updates
  private handleVendorsNotification(payload: RealtimePayload) {
    this.debounceNotification('vendors', () => {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new vendor to existing state with deduplication
          const newVendor = payload.new as any;
          this.stateUpdaters.setVendors?.(prevVendors => {
            const exists = prevVendors.some(vendor => vendor.id === newVendor.id);
            return exists ? prevVendors : [newVendor, ...prevVendors];
          });
          
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update existing vendor in state
          const updatedVendor = payload.new as any;
          this.stateUpdaters.setVendors?.(prevVendors => 
            prevVendors.map(vendor => vendor.id === updatedVendor.id ? updatedVendor : vendor)
          );
          
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove vendor from state
          const deletedVendor = payload.old as any;
          this.stateUpdaters.setVendors?.(prevVendors => 
            prevVendors.filter(vendor => vendor.id !== deletedVendor.id)
          );
          // Also remove related bid vendors
          this.stateUpdaters.setBidVendors?.(prevBidVendors =>
            prevBidVendors.filter(bv => bv.vendor_id !== deletedVendor.id)
          );
        }
      } catch (error) {
        console.error('Error handling vendors real-time notification:', error);
      }
    });
  }

  // Handle project_notes table notifications with incremental updates  
  private handleProjectNotesNotification(payload: RealtimePayload) {
    this.debounceNotification('notes', () => {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new note to existing state with deduplication
          const newNote = payload.new as any;
          this.stateUpdaters.setProjectNotes?.(prevNotes => {
            const exists = prevNotes.some(note => note.id === newNote.id);
            return exists ? prevNotes : [newNote, ...prevNotes];
          });
          
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update existing note in state
          const updatedNote = payload.new as any;
          this.stateUpdaters.setProjectNotes?.(prevNotes => 
            prevNotes.map(note => note.id === updatedNote.id ? updatedNote : note)
          );
          
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove note from state
          const deletedNote = payload.old as any;
          this.stateUpdaters.setProjectNotes?.(prevNotes => 
            prevNotes.filter(note => note.id !== deletedNote.id)
          );
        }
      } catch (error) {
        console.error('Error handling project notes real-time notification:', error);
      }
    });
  }

  // Handle vendor_contacts table notifications with incremental updates
  private handleVendorContactsNotification(payload: RealtimePayload) {
    this.debounceNotification('vendor_contacts', async () => {
      try {
        const newContact = payload.new as any;
        const oldContact = payload.old as any;
        
        // Determine which vendor is affected
        const vendorId = newContact?.vendor_id || oldContact?.vendor_id;
        if (!vendorId) {
          console.warn('No vendor_id found in vendor_contacts notification payload');
          return;
        }
        
        // Check if primary contact status changed or if this affects a primary contact
        const isPrimaryContactChange = newContact?.is_primary || oldContact?.is_primary;
        
        if (isPrimaryContactChange) {
          
          // For primary contact changes, we need to refresh the vendor to get the updated primary contact data
          // This is more efficient than a full vendor refresh
          try {
            const { data: updatedVendor, error } = await supabase
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
            
            if (updatedVendor) {
              this.stateUpdaters.setVendors?.(prevVendors => 
                prevVendors.map(vendor => vendor.id === vendorId ? updatedVendor : vendor)
              );
            }
          } catch (vendorError) {
            console.error('Error fetching updated vendor after primary contact change:', vendorError);
          }
        } else {
          // Non-primary contact changes don't affect the vendor display in most cases
        }
      } catch (error) {
        console.error('Error handling vendor_contacts real-time notification:', error);
      }
    });
  }

  // Debounce helper to prevent rapid API calls
  private debounceNotification(key: string, callback: () => void) {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const newTimer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
    }, this.DEBOUNCE_DELAY);
    
    this.debounceTimers.set(key, newTimer);
  }

  // Legacy methods - kept for backwards compatibility but deprecated
  subscribeToBids(callback: (payload: RealtimePayload) => void) {
    console.warn('⚠️ subscribeToBids is deprecated - use subscribeToDataChanges instead');
    return this.subscribeToDataChanges(callback);
  }

  subscribeToBidVendors(_bidId: number, callback: (payload: RealtimePayload) => void) {
    console.warn('⚠️ subscribeToBidVendors is deprecated - use subscribeToDataChanges instead');
    return this.subscribeToDataChanges(callback);
  }

  subscribeToProjectNotes(_bidId: number, callback: (payload: RealtimePayload) => void) {
    console.warn('⚠️ subscribeToProjectNotes is deprecated - use subscribeToDataChanges instead');
    return this.subscribeToDataChanges(callback);
  }

  subscribeToUserPresence(callback: (payload: RealtimePayload) => void) {
    console.warn('⚠️ subscribeToUserPresence is deprecated');
    return this.subscribeToDataChanges(callback);
  }

  // Unsubscribe from specific channel
  unsubscribe(channelName: string) {
    if (this.channels[channelName]) {
      this.channels[channelName].unsubscribe()
      delete this.channels[channelName]
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    Object.values(this.channels).forEach(channel => {
      channel.unsubscribe()
    })
    this.channels = {}
  }
}

// Create singleton instance
export const realtimeManager = new RealtimeManager()

// API Usage Tracking for performance monitoring
class ApiUsageTracker {
  private callHistory: Array<{ timestamp: number; method: string; duration?: number }> = [];
  private readonly MAX_HISTORY = 1000;

  trackCall(method: string, duration?: number) {
    this.callHistory.push({
      timestamp: Date.now(),
      method,
      duration
    });

    // Keep only last 1000 calls
    if (this.callHistory.length > this.MAX_HISTORY) {
      this.callHistory = this.callHistory.slice(-this.MAX_HISTORY);
    }
  }

  getStats(timeWindowMs: number = 60 * 60 * 1000) { // Default: 1 hour
    const now = Date.now();
    const windowStart = now - timeWindowMs;
    
    const recentCalls = this.callHistory.filter(call => call.timestamp >= windowStart);
    
    const methodCounts = recentCalls.reduce((acc, call) => {
      acc[call.method] = (acc[call.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalCalls = recentCalls.length;
    const callsPerSecond = totalCalls / (timeWindowMs / 1000);

    return {
      totalCalls,
      callsPerSecond: callsPerSecond.toFixed(2),
      callsPerHour: Math.round(callsPerSecond * 3600),
      methodBreakdown: methodCounts,
      timeWindow: `${timeWindowMs / 1000 / 60} minutes`
    };
  }

  logCurrentStats() {
    this.getStats();
    // Stats available for monitoring if needed
  }
}

const apiTracker = new ApiUsageTracker();

// Log stats every 5 minutes
setInterval(() => {
  apiTracker.logCurrentStats();
}, 5 * 60 * 1000);

// Utility functions for common database operations
export const dbOperations = {
  // Track API call for monitoring
  trackApiCall(method: string) {
    apiTracker.trackCall(method);
  },

  // User operations
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')

    if (error) {
      console.error('Supabase: Error fetching users:', error);
      throw error;
    }
    return data || []
  },

  async updateUserPresence(currentPage?: string) {
    try {
      const { error } = await supabase.rpc('update_user_presence', {
        current_page_param: currentPage
      })
      if (error) throw error
    } catch (err) {
      // Ignore errors for presence updates
    }
  },

  // Bid operations
  async getBids() {
    // Performance monitoring (removed for cleanup)
    
    this.trackApiCall('getBids');
    
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        created_by_user:users!created_by(name, email),
        assigned_user:users!assign_to(name, email),
        bid_vendors(
          *,
          vendors(company_name, specialty)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    
    return data
  },

  async getBidById(bidId: number) {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        created_by_user:users!created_by(name, email),
        assigned_user:users!assign_to(name, email),
        archived_by_user:users!archived_by(name, email),
        bid_vendors(
          *,
          vendors(company_name, specialty)
        )
      `)
      .eq('id', bidId)
      .single()

    if (error) throw error
    return data
  },

  async getArchivedBids() {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        created_by_user:users!created_by(name, email),
        assigned_user:users!assign_to(name, email),
        archived_by_user:users!archived_by(name, email),
        bid_vendors(
          *,
          vendors(company_name, specialty)
        )
      `)
      .eq('archived', true)
      .order('archived_at', { ascending: false })

    if (error) throw error
    return data
  },

  async archiveBid(bidId: number, userId: string | null) {
    const { data, error } = await supabase
      .from('bids')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archived_by: userId
      })
      .eq('id', bidId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async unarchiveBid(bidId: number) {
    const { data, error } = await supabase
      .from('bids')
      .update({
        archived: false,
        archived_at: null,
        archived_by: null
      })
      .eq('id', bidId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async createBid(bidData: any) {
    // Set created_by to null for now (will need to update database schema to allow nulls)
    const dataToInsert = {
      ...bidData,
      created_by: null
    };
    
    const { data, error } = await supabase
      .from('bids')
      .insert([dataToInsert])
      .select()
      .single()

    if (error) throw error
    
    return data
  },

  async createProjectWithVendors(bidData: any, vendorIds: number[]) {
    // First create the project
    const project = await this.createBid(bidData);
    
    // If no vendors selected, just return the project
    if (!vendorIds || vendorIds.length === 0) {
      return { project, vendorRelationships: [] };
    }

    // Create vendor relationships with default settings
    const vendorData = vendorIds.map(vendorId => ({
      bid_id: project.id,
      vendor_id: vendorId,
      status: 'pending',
      is_priority: false,
      follow_up_count: 0,
      due_date: null,
      response_received_date: null,
      last_follow_up_date: null,
      response_notes: null,
      responded_by: null,
      cost_amount: null
    }));

    const { data: vendorRelationships, error: vendorError } = await supabase
      .from('bid_vendors')
      .insert(vendorData)
      .select(`
        *,
        vendors(company_name, contact_person, email, phone)
      `);

    if (vendorError) {
      // If vendor creation fails, we could optionally delete the project
      // For now, just throw the error and let the project exist
      throw vendorError;
    }

    return { project, vendorRelationships: vendorRelationships || [] };
  },

  async updateBid(id: number, updates: any) {
    const { data, error } = await supabase
      .from('bids')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('updated_bid', 'bid', id, updates)
    
    return data
  },

  async deleteBid(id: number) {
    const { error } = await supabase
      .from('bids')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('deleted_bid', 'bid', id)
  },

  // Vendor operations
  async getVendors() {
    // Performance monitoring (removed for cleanup)
    
    // Try cache first
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
      .order('company_name')

    if (error) throw error
    
    // Cache vendors for 30 minutes (they change less frequently)
    
    return data
  },

  async getVendor(id: number) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createVendor(vendorData: any) {
    const { data, error } = await supabase
      .from('vendors')
      .insert([vendorData])
      .select()
      .single()

    if (error) throw error
    
    return data
  },

  async createVendorWithContacts(vendorData: any, contacts: any[]) {
    // Start a transaction by creating the vendor first
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert([vendorData])
      .select()
      .single()

    if (vendorError) throw vendorError

    // If no contacts provided, just return the vendor
    if (!contacts || contacts.length === 0) {
      return { vendor, contacts: [] }
    }

    // Add vendor_id to each contact
    const contactsWithVendorId = contacts.map(contact => ({
      ...contact,
      vendor_id: vendor.id
    }))

    // Create all contacts
    const { data: createdContacts, error: contactsError } = await supabase
      .from('vendor_contacts')
      .insert(contactsWithVendorId)
      .select()

    if (contactsError) {
      // If contact creation fails, we could optionally delete the vendor
      // For now, just throw the error and let the vendor exist
      throw contactsError
    }

    // Update vendor with primary contact reference if one was designated
    const primaryContact = createdContacts?.find(contact => contact.is_primary)
    if (primaryContact) {
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ primary_contact_id: primaryContact.id })
        .eq('id', vendor.id)

      if (updateError) {
        console.warn('Warning: Could not update primary contact reference:', updateError)
        // Don't throw here, vendor and contacts are created successfully
      }
    }

    return { vendor, contacts: createdContacts || [] }
  },

  async updateVendor(id: number, updates: any) {
    // Clean up the update data to handle empty date strings
    const cleanedUpdates = { ...updates };
    
    // Convert empty date strings to null for PostgreSQL compatibility
    if ('insurance_expiry_date' in cleanedUpdates && cleanedUpdates.insurance_expiry_date === '') {
      cleanedUpdates.insurance_expiry_date = null;
    }
    
    // Handle insurance file metadata fields
    const allowedFileFields = [
      'insurance_file_path',
      'insurance_file_name', 
      'insurance_file_size',
      'insurance_file_uploaded_at'
    ];
    
    allowedFileFields.forEach(field => {
      if (field in cleanedUpdates && cleanedUpdates[field] === '') {
        cleanedUpdates[field] = null;
      }
    });
    
    const { data, error } = await supabase
      .from('vendors')
      .update(cleanedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('updated_vendor', 'vendor', id, updates)
    
    return data
  },

  async deleteVendor(id: number) {
    // Get vendor data first to clean up associated files
    const { data: vendor } = await supabase
      .from('vendors')
      .select('insurance_file_path')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Clean up insurance file if it exists
    if (vendor?.insurance_file_path) {
      try {
        await supabase.storage
          .from('vendor-insurance-files')
          .remove([vendor.insurance_file_path]);
      } catch (fileError) {
        // Log error but don't fail the vendor deletion
        console.warn('Failed to delete vendor insurance file:', fileError);
      }
    }

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('deleted_vendor', 'vendor', id)
  },

  // Vendor Contacts operations
  async getVendorContacts(vendorId: number) {
    const { data, error } = await supabase
      .from('vendor_contacts')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('is_primary', { ascending: false })
      .order('contact_name')

    if (error) throw error
    return data
  },

  async getAllVendorContacts() {
    const { data, error } = await supabase
      .from('vendor_contacts')
      .select(`
        *,
        vendor:vendors(company_name)
      `)
      .order('vendor_id')
      .order('is_primary', { ascending: false })

    if (error) throw error
    return data
  },

  async createVendorContact(contactData: any) {
    const { data, error } = await supabase
      .from('vendor_contacts')
      .insert([contactData])
      .select()
      .single()

    if (error) throw error
    
    // If this contact was marked as primary, sync the vendor's primary_contact_id
    if (contactData.is_primary) {
      await this.syncVendorPrimaryContact(contactData.vendor_id)
    }
    
    return data
  },

  async updateVendorContact(id: number, updates: any) {
    // Get the vendor_id before updating
    const { data: contactData, error: contactError } = await supabase
      .from('vendor_contacts')
      .select('vendor_id')
      .eq('id', id)
      .single()

    if (contactError) throw contactError

    const { data, error } = await supabase
      .from('vendor_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    // If primary status was changed, sync the vendor's primary_contact_id
    if ('is_primary' in updates) {
      await this.syncVendorPrimaryContact(contactData.vendor_id)
    }
    
    return data
  },

  async deleteVendorContact(id: number) {
    try {
      
      // Get the vendor_id and primary status before deleting
      const { data: contactData, error: contactError } = await supabase
        .from('vendor_contacts')
        .select('vendor_id, is_primary, contact_name')
        .eq('id', id)
        .single()

      if (contactError) {
        console.error('deleteVendorContact: Error fetching contact data:', contactError);
        throw new Error(`Contact not found: ${contactError.message}`);
      }


      // Check if this is the last remaining contact for this vendor
      const { data: allContacts, error: countError } = await supabase
        .from('vendor_contacts')
        .select('id')
        .eq('vendor_id', contactData.vendor_id)

      if (countError) {
        console.error('deleteVendorContact: Error counting contacts:', countError);
        throw new Error(`Failed to count contacts: ${countError.message}`);
      }

      const isLastContact = allContacts?.length === 1;

      // If this is the last contact and it's primary, clear the vendor's primary_contact_id first
      if (isLastContact && contactData.is_primary) {
        const { error: clearError } = await supabase
          .from('vendors')
          .update({ primary_contact_id: null })
          .eq('id', contactData.vendor_id)

        if (clearError) {
          console.error('deleteVendorContact: Error clearing primary_contact_id:', clearError);
          throw new Error(`Failed to clear primary contact reference: ${clearError.message}`);
        }
      }

      // Now delete the contact
      const { error } = await supabase
        .from('vendor_contacts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('deleteVendorContact: Error deleting contact:', error);
        throw new Error(`Failed to delete contact: ${error.message}`);
      }


      // If we deleted a primary contact and it wasn't the last contact, sync the vendor's primary_contact_id
      if (contactData.is_primary && !isLastContact) {
        await this.syncVendorPrimaryContact(contactData.vendor_id);
      }

      // Invalidate vendor cache to force refresh
      
    } catch (error) {
      console.error('deleteVendorContact: Unexpected error:', error);
      throw error;
    }
  },

  // Synchronize vendor primary_contact_id with the contact marked as primary
  async syncVendorPrimaryContact(vendorId: number) {
    try {
      
      // Find the contact marked as primary for this vendor
      const { data: primaryContacts, error: contactError } = await supabase
        .from('vendor_contacts')
        .select('id, contact_name')
        .eq('vendor_id', vendorId)
        .eq('is_primary', true)
        .limit(1)

      if (contactError) {
        console.error('syncVendorPrimaryContact: Error finding primary contact:', contactError);
        throw new Error(`Failed to find primary contact: ${contactError.message}`);
      }

      const primaryContactId = primaryContacts && primaryContacts.length > 0 ? primaryContacts[0].id : null

      // Update the vendor's primary_contact_id
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ primary_contact_id: primaryContactId })
        .eq('id', vendorId)

      if (updateError) {
        console.error('syncVendorPrimaryContact: Error updating vendor primary_contact_id:', updateError);
        throw new Error(`Failed to update vendor primary contact: ${updateError.message}`);
      }


      // Invalidate vendor cache to force refresh

      return primaryContactId
    } catch (error) {
      console.error('syncVendorPrimaryContact: Unexpected error:', error);
      throw error;
    }
  },

  // Safe method to set a contact as primary (ensures only one primary per vendor)
  async setPrimaryContact(vendorId: number, contactId: number) {
    // First, remove primary status from all contacts for this vendor
    const { error: clearError } = await supabase
      .from('vendor_contacts')
      .update({ is_primary: false })
      .eq('vendor_id', vendorId)

    if (clearError) throw clearError

    // Then set the specified contact as primary
    const { error: setError } = await supabase
      .from('vendor_contacts')
      .update({ is_primary: true })
      .eq('id', contactId)
      .eq('vendor_id', vendorId) // Extra safety check

    if (setError) throw setError

    // Sync the vendor's primary_contact_id
    await this.syncVendorPrimaryContact(vendorId)

    return true
  },

  // One-time utility to fix all vendors with orphaned primary contact references
  async fixAllVendorPrimaryContacts() {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('id')

    if (error) throw error

    const results = []
    for (const vendor of vendors) {
      try {
        const primaryContactId = await this.syncVendorPrimaryContact(vendor.id)
        results.push({ vendorId: vendor.id, primaryContactId, success: true })
      } catch (error) {
        results.push({ vendorId: vendor.id, error: error instanceof Error ? error.message : 'Unknown error', success: false })
      }
    }

    return results
  },

  async getVendorWithContacts(vendorId: number) {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        contacts:vendor_contacts(*)
      `)
      .eq('id', vendorId)
      .single()

    if (error) throw error
    return data
  },

  // Bid vendor operations
  async addVendorToBid(bidId: number, vendorData: any) {
    const { data, error } = await supabase
      .from('bid_vendors')
      .insert([{
        bid_id: bidId,
        ...vendorData
      }])
      .select(`
        *,
        vendors(company_name, contact_person, email, phone)
      `)
      .single()

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('added_vendor_to_bid', 'bid_vendor', data.id, {
    //   bid_id: bidId,
    //   vendor_id: vendorData.vendor_id
    // })
    
    return data
  },

  async updateBidVendor(id: number, updates: any) {
    const { data, error } = await supabase
      .from('bid_vendors')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        vendors(company_name, contact_person, email, phone)
      `)
      .single()

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('updated_bid_vendor', 'bid_vendor', id, updates)
    
    return data
  },

  async removeVendorFromBid(bidVendorId: number) {
    const { error } = await supabase
      .from('bid_vendors')
      .delete()
      .eq('id', bidVendorId)

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('removed_vendor_from_bid', 'bid_vendor', bidVendorId)
  },

  async removeVendorsFromBid(vendorIds: number[], bidId: number) {
    const { error } = await supabase
      .from('bid_vendors')
      .delete()
      .eq('bid_id', bidId)
      .in('vendor_id', vendorIds)

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('removed_multiple_vendors_from_bid', 'bid', bidId, {
    //   vendor_ids: vendorIds
    // })
  },

  // Project notes operations
  async getProjectNotes(bidId: number) {
    const { data, error } = await supabase
      .from('project_notes')
      .select(`
        *,
        user:users(name, color_preference)
      `)
      .eq('bid_id', bidId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  async getAllProjectNotes() {
    // Performance monitoring (removed for cleanup)
    
    this.trackApiCall('getAllProjectNotes');

    const { data, error } = await supabase
      .from('project_notes')
      .select(`
        *,
        user:users(name, color_preference)
      `)
      .order('created_at', { ascending: true })

    if (error) throw error
    
    // Cache notes for 2 minutes (they change more frequently)
    
    return data
  },

  async createProjectNote(bidId: number, content: string, userId?: string | null) {
    // If no userId provided, try to get current user from Auth
    let finalUserId = userId;
    if (!finalUserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          // Find database user by email
          const users = await this.getUsers();
          const dbUser = users.find(u => u.email === user.email);
          finalUserId = dbUser?.id || null;
        }
      } catch (err) {
        finalUserId = null;
      }
    }

    const { data, error } = await supabase
      .from('project_notes')
      .insert([{
        bid_id: bidId,
        content,
        user_id: finalUserId
      }])
      .select(`
        *,
        user:users(name, color_preference)
      `)
      .single()

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('added_project_note', 'project_note', data.id, {
    //   bid_id: bidId,
    //   content: content.substring(0, 50) + '...'
    // })
    
    return data
  },

  async updateProjectNote(noteId: number, content: string) {
    const { data, error } = await supabase
      .from('project_notes')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select(`
        *,
        user:users(name, color_preference)
      `)
      .single()

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('updated_project_note', 'project_note', noteId, {
    //   content: content.substring(0, 50) + '...'
    // })
    
    return data
  },

  async deleteProjectNote(noteId: number) {
    const { error } = await supabase
      .from('project_notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error

    // Log activity
    await this.logActivity('deleted_project_note', 'project_note', noteId)
  },

  // Activity logging
  async logActivity(action: string, entityType: string, entityId: number, details: Record<string, unknown> = {}) {
    try {
      const { error } = await supabase.rpc('log_activity', {
        action_param: action,
        entity_type_param: entityType,
        entity_id_param: entityId,
        details_param: details
      })
      
      if (error) {
        console.error('Activity logging error:', error)
      }
    } catch (err) {
      // Ignore activity logging errors
    }
  },

  // Get activity logs
  async getActivityLogs(limit = 50) {
    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        *,
        user:users(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  // User profile operations
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  async updateUserProfile(userId: string, updates: { name?: string; email?: string; role?: string; is_active?: boolean; color_preference?: string }) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) throw error
  },

  async createOrUpdateUserProfile(_auth0UserId: string, userData: { email: string; name: string; color_preference?: string }) {
    
    try {
      // First check if user already exists by email
      const existingUsers = await this.getUsers();
      const existingUser = existingUsers.find(u => u.email === userData.email);
      
      if (existingUser) {
        // Update existing user
        const { data, error } = await supabase
          .from('users')
          .update({
            name: userData.name,
            color_preference: userData.color_preference || '#d4af37',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single()

        if (error) {
          console.error('Supabase: Error updating existing user:', error);
          throw error;
        }
        return data
      }

      // Try to create new user using RPC function (bypasses RLS)
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_profile', {
          user_email: userData.email,
          user_name: userData.name,
          user_color: userData.color_preference || '#d4af37'
        });

        if (!rpcError && rpcData) {
          return rpcData;
        }
        
      } catch (rpcErr) {
      }

      // Generate a UUID for the user
      const userId = crypto.randomUUID();

      // Try with service role client if available (bypasses RLS)
      if (supabaseService) {
        const userToInsert = {
          id: userId,
          email: userData.email,
          name: userData.name,
          color_preference: userData.color_preference || '#d4af37'
        };
        
        const { data: serviceData, error: serviceError } = await supabaseService
          .from('users')
          .insert([userToInsert])
          .select()
          .single()

        if (!serviceError && serviceData) {
          return serviceData;
        }
        
        if (serviceError) {
          console.error('Supabase: Service role creation failed:', serviceError);
        }
      }

      // Fallback: Create new user directly with anon key
      const userToInsert = {
        id: userId,
        email: userData.email,
        name: userData.name,
        color_preference: userData.color_preference || '#d4af37'
      };
      
      const { data, error } = await supabase
        .from('users')
        .insert([userToInsert])
        .select()
        .single()

      if (error) {
        console.error('Supabase: Error creating new user:', error);
        console.error('Supabase: Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // If this is an RLS policy violation, provide helpful information
        if (error.code === 'PGRST301' || error.message?.includes('policy')) {
          console.error('Supabase: This appears to be an RLS policy issue. The users table may need policies allowing inserts.');
        }
        
        throw error;
      }
      
      return data
    } catch (err) {
      console.error('Supabase: Unexpected error in createOrUpdateUserProfile:', err);
      throw err;
    }
  },

  // Test function to help diagnose database issues
  async testDatabaseConnection() {
    try {
      // Test basic connectivity with a simpler query
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Supabase: Database connection test failed:', error);
        console.error('Supabase: Error code:', error.code);
        console.error('Supabase: Error message:', error.message);
        console.error('Supabase: Error details:', error.details);
        console.error('Supabase: Error hint:', error.hint);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Supabase: Database connection test error:', err);
      return { success: false, error: err };
    }
  },

  // Helper function to convert filters to date range
  getDateRangeFromFilters(filters = {}) {
    const typedFilters = filters as {
      filterType?: string;
      timeframe?: string;
      selectedMonth?: string;
      startDate?: string;
      endDate?: string;
    };

    let startDate: string | null = null;
    let endDate: string | null = null;

    switch (typedFilters.filterType) {
      case 'month':
        if (typedFilters.selectedMonth) {
          const [year, month] = typedFilters.selectedMonth.split('-');
          startDate = `${year}-${month}-01`;
          // Last day of the month
          const nextMonth = new Date(parseInt(year), parseInt(month), 0);
          endDate = `${year}-${month}-${String(nextMonth.getDate()).padStart(2, '0')}`;
        }
        break;
      
      case 'custom':
        startDate = typedFilters.startDate || null;
        endDate = typedFilters.endDate || null;
        break;
      
      case 'quick':
      default:
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (typedFilters.timeframe) {
          case '30days':
            cutoffDate.setDate(now.getDate() - 30);
            startDate = cutoffDate.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
          case '90days':
            cutoffDate.setDate(now.getDate() - 90);
            startDate = cutoffDate.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
          case '12months':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            startDate = cutoffDate.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
          case 'all':
            // No date filtering for 'all'
            break;
        }
        break;
    }

    return { startDate, endDate };
  },

  // Analytics functions
  async getResponseDistribution(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRangeFromFilters(filters);
      
      let query = supabase
        .from('bid_vendors')
        .select(`
          status, 
          created_at, 
          response_received_date, 
          due_date,
          bids!inner(made_by_apm)
        `)
        .eq('bids.made_by_apm', false);

      // Apply date filtering if dates are provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Supabase: Error fetching response distribution:', err);
      throw err;
    }
  },

  async getTrendData(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRangeFromFilters(filters);
      
      let query = supabase
        .from('bid_vendors')
        .select(`
          status, 
          created_at, 
          response_received_date,
          bids!inner(made_by_apm)
        `)
        .eq('bids.made_by_apm', false);

      // Apply date filtering if dates are provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Supabase: Error fetching trend data:', err);
      throw err;
    }
  },

  async getVendorPerformanceData(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRangeFromFilters(filters);
      
      let query = supabase
        .from('bid_vendors')
        .select(`
          vendor_id,
          status,
          created_at,
          response_received_date,
          vendors!inner (
            id,
            company_name
          ),
          bids!inner(made_by_apm)
        `)
        .eq('bids.made_by_apm', false);

      // Apply date filtering if dates are provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Supabase: Error fetching vendor performance data:', err);
      throw err;
    }
  },

  async getTimeDistributionData(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRangeFromFilters(filters);
      
      // Use same base query as other functions for consistency
      let query = supabase
        .from('bid_vendors')
        .select(`
          created_at, 
          response_received_date,
          status,
          bids!inner(made_by_apm)
        `)
        .eq('bids.made_by_apm', false);

      // Apply date filtering if dates are provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter only records with response_received_date in processing, not in query
      // This maintains consistency with count totals
      const filteredData = data?.filter(item => item.response_received_date) || [];
      
      return filteredData;
    } catch (err) {
      console.error('Supabase: Error fetching time distribution data:', err);
      throw err;
    }
  },

  // Get bids data for KPI calculations (based on bids table, not bid_vendors)
  async getBidsForKPI(filters = {}) {
    try {
      const { startDate, endDate } = this.getDateRangeFromFilters(filters);
      
      let query = supabase
        .from('bids')
        .select(`
          id,
          status,
          created_at,
          due_date,
          made_by_apm
        `)
        .eq('made_by_apm', false);

      // Apply date filtering if dates are provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Supabase: Error fetching bids for KPI:', err);
      throw err;
    }
  }
}

// Expose dbOperations on window for debugging
if (typeof window !== 'undefined') {
  (window as any).dbOperations = dbOperations;
}

// Export the main client
export default supabase