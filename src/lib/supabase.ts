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

// Real-time channel management
export class RealtimeManager {
  private channels: { [key: string]: ReturnType<typeof supabase.channel> } = {}

  // Subscribe to bid updates
  subscribeToBids(callback: (payload: RealtimePayload) => void) {
    const channel = supabase
      .channel('bids_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids'
        },
        callback
      )
      .subscribe()

    this.channels['bids'] = channel
    return channel
  }

  // Subscribe to bid_vendors updates
  subscribeToBidVendors(bidId: number, callback: (payload: RealtimePayload) => void) {
    const channel = supabase
      .channel(`bid_vendors_${bidId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_vendors',
          filter: `bid_id=eq.${bidId}`
        },
        callback
      )
      .subscribe()

    this.channels[`bid_vendors_${bidId}`] = channel
    return channel
  }

  // Subscribe to project notes
  subscribeToProjectNotes(bidId: number, callback: (payload: RealtimePayload) => void) {
    const channel = supabase
      .channel(`project_notes_${bidId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_notes',
          filter: `bid_id=eq.${bidId}`
        },
        callback
      )
      .subscribe()

    this.channels[`project_notes_${bidId}`] = channel
    return channel
  }

  // Subscribe to user presence
  subscribeToUserPresence(callback: (payload: RealtimePayload) => void) {
    const channel = supabase
      .channel('user_presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        callback
      )
      .subscribe()

    this.channels['user_presence'] = channel
    return channel
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

// Utility functions for common database operations
export const dbOperations = {
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

    if (error) throw error
    return data || []
  },

  async updateUserPresence(currentPage?: string) {
    try {
      const { error } = await supabase.rpc('update_user_presence', {
        current_page_param: currentPage
      })
      if (error) throw error
    } catch (err) {
    }
  },

  // Bid operations
  async getBids() {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        created_by_user:users!created_by(name, email),
        assigned_user:users!assign_to(name, email),
        bid_vendors(
          id,
          vendor_id,
          due_date,
          response_received_date,
          status,
          is_priority,
          cost_amount,
          vendors(company_name, specialty)
        )
      `)
      .order('created_at', { ascending: false })

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
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('company_name')

    if (error) throw error
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

  async updateVendor(id: number, updates: any) {
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('updated_vendor', 'vendor', id, updates)
    
    return data
  },

  async deleteVendor(id: number) {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Log activity (skip for now to avoid auth issues)
    // await this.logActivity('deleted_vendor', 'vendor', id)
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
    const { data, error } = await supabase
      .from('project_notes')
      .select(`
        *,
        user:users(name, color_preference)
      `)
      .order('created_at', { ascending: true })

    if (error) throw error
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
      
    } catch (err) {
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

  async updateUserProfile(userId: string, updates: { name?: string; color_preference?: string }) {
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

  async createOrUpdateUserProfile(auth0UserId: string, userData: { email: string; name: string; color_preference?: string }) {
    // First check if user already exists by email
    const existingUsers = await this.getUsers();
    const existingUser = existingUsers.find(u => u.email === userData.email);
    
    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          name: userData.name,
          color_preference: userData.color_preference || '#d4af37'
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (error) throw error
      return data
    }

    // Create new user - let Supabase generate the UUID
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: userData.email,
        name: userData.name,
        color_preference: userData.color_preference || '#d4af37'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Export the main client
export default supabase