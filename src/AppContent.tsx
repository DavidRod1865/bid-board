import React, { useState, useEffect } from 'react';

// Importing types
import type { User, Bid, Vendor, VendorWithContact, BidVendor, ProjectNote } from './shared/types';
import type { ContactData } from './features/estimating/components/VendorManagement/VendorCreationWizard';

// Importing Supabase operations and realtime manager
import { dbOperations, realtimeManager } from './shared/services/supabase';
import { userCache } from './shared/services/userCache';
import { getDefaultAPMFields } from './shared/utils/bidVendorDefaults';
import { useLoading } from './shared/contexts/LoadingContext';
import LottieLoader from './shared/components/ui/LottieLoader';

// Import the new routing structure
import AppRoutes from './routes';

// Import the new types
// import type { ProjectVendorComplete } from './shared/types';


// (RealtimePayload type removed - handled in supabase.ts now)


// Main content component that uses the loading context
const AppContentInternal: React.FC = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [vendors, setVendors] = useState<VendorWithContact[]>([]);
  const [bidVendors, setBidVendors] = useState<BidVendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { isAppLoading, setAppLoading, isGlobalLoading } = useLoading();

  // Load initial data from Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setAppLoading(true);
        setError(null);
        
        // Fetch data from normalized tables
        const [bidsResult, vendorsData, usersData, projectNotesData] = await Promise.all([
          dbOperations.getBids(), // Now uses normalized views internally
          dbOperations.getVendors(),
          userCache.getUsers(),
          dbOperations.getProjectNotes()
        ]);

        // Extract bids and bidVendors from the result
        const { bids: transformedBids, bidVendors: extractedBidVendors } = bidsResult;

        setBids(transformedBids || []); 
        setVendors((vendorsData as VendorWithContact[]) || []); 
        setBidVendors(extractedBidVendors || []); 
        setUsers(usersData || []); 
        setProjectNotes(projectNotesData || []);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setAppLoading(false);
      }
    };

    loadInitialData();
  }, [setAppLoading]);

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    // Pass React state setters to RealtimeManager for incremental updates
    realtimeManager.setStateUpdaters({
      setBids,
      setVendors,
      setBidVendors,
      setProjectNotes
    });
    
    // Set up real-time subscriptions with direct state updates
    realtimeManager.subscribeToDataChanges(() => {
      // Real-time notifications will be handled by updated RealtimeManager
    });

    // Listen for custom data refresh events (used by normalized tables)
    const handleDataRefresh = () => {
      // Trigger a full data refresh for normalized tables
      const loadData = async () => {
        const [bidsResult, vendorsData, usersData, projectNotesData] = await Promise.all([
          dbOperations.getBids(),
          dbOperations.getVendors(),
          userCache.getUsers(),
          dbOperations.getProjectNotes()
        ]);

        const { bids: transformedBids, bidVendors: extractedBidVendors } = bidsResult;

        setBids(transformedBids || []); 
        setVendors((vendorsData as VendorWithContact[]) || []); 
        setBidVendors(extractedBidVendors || []); 
        setUsers(usersData || []); 
        setProjectNotes(projectNotesData || []);
      };
      
      loadData().catch(console.error);
    };

    window.addEventListener('supabase-data-changed', handleDataRefresh);

    // Cleanup function
    return () => {
      realtimeManager.unsubscribeAll();
      window.removeEventListener('supabase-data-changed', handleDataRefresh);
    };
  }, []);

  // Handler functions to update status
  const handleStatusChange = async (bidId: number, newStatus: string) => {
    try {
      // Update project status using normalized tables
      await dbOperations.updateProject(bidId, { status: newStatus });
      
      // Update bid status in local state
      setBids(prevBids => 
        prevBids.map(bid => 
          bid.id === bidId ? { ...bid, status: newStatus } : bid
        )
      );
      
      // Real-time subscription will handle UI updates automatically
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bid status';
      setError(errorMessage);
    }
  };

  // Handler functions for update bid (Estimating)
  const handleUpdateBid = async (bidId: number, updatedBid: Partial<Bid>) => {
    try {
      // Update project using normalized tables - Estimating function
      await dbOperations.updateEstimatingProject(bidId, updatedBid);
      
      // If the bid is being archived, remove it from the main dashboard
      if (updatedBid.archived === true) {
        setBids(prevBids => prevBids.filter(bid => bid.id !== bidId));
      } else {
        // Otherwise, update the bid in the list
        setBids(prevBids => 
          prevBids.map(bid => 
            bid.id === bidId ? { ...bid, ...updatedBid } : bid
          )
        );
      }
      
      // Real-time subscription will handle UI updates automatically
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bid';
      setError(errorMessage);
    }
  };

  // Handler functions for update bid (APM)
  const handleUpdateAPMBid = async (bidId: number, updatedBid: Partial<Bid>) => {
    try {
      // Update project using normalized tables - APM function
      await dbOperations.updateAPMProject(bidId, updatedBid);
      
      // If the bid is being archived, remove it from the main dashboard
      if (updatedBid.apm_archived === true) {
        setBids(prevBids => prevBids.filter(bid => bid.id !== bidId));
      } else {
        // Otherwise, update the bid in the list
        setBids(prevBids => 
          prevBids.map(bid => 
            bid.id === bidId ? { ...bid, ...updatedBid } : bid
          )
        );
      }
      
      // Real-time subscription will handle UI updates automatically
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update APM project';
      setError(errorMessage);
    }
  };

  // Handler functions for adding a new bid
  const handleAddBid = async (bidData: Omit<Bid, 'id'>) => {
    try {
      const newBid = await dbOperations.createProject(bidData);
      
      // Use optimistic update for bids since real-time might be delayed
      // The deduplication logic in the real-time subscription will prevent duplicates
      const transformedBid: Bid = {
        id: newBid.id,
        title: newBid.title || newBid.project_name,
        project_name: newBid.project_name,
        project_email: newBid.project_email,
        project_address: newBid.project_address,
        general_contractor: newBid.general_contractor,
        project_description: newBid.project_description,
        due_date: newBid.due_date,
        status: newBid.status,
        priority: newBid.priority,
        estimated_value: newBid.estimated_value,
        notes: newBid.notes,
        created_by: newBid.created_by,
        assign_to: newBid.assign_to,
        file_location: newBid.file_location,
        archived: newBid.archived || false,
        archived_at: newBid.archived_at || null,
        archived_by: newBid.archived_by || null,
        on_hold: newBid.on_hold || false,
        on_hold_at: newBid.on_hold_at || null,
        on_hold_by: newBid.on_hold_by || null,
        department: newBid.department || null,
        sent_to_apm: newBid.sent_to_apm || false,
        sent_to_apm_at: newBid.sent_to_apm_at || null,
        apm_on_hold: newBid.apm_on_hold || false,
        apm_on_hold_at: newBid.apm_on_hold_at || null,
        apm_archived: newBid.apm_archived || false,
        apm_archived_at: newBid.apm_archived_at || null,
        gc_system: newBid.gc_system || null,
        added_to_procore: newBid.added_to_procore || false,
        made_by_apm: newBid.made_by_apm || false,
        project_start_date: newBid.project_start_date || null,
        gc_contact_id: newBid.gc_contact_id || null
      };
      
      setBids(prev => {
        const exists = prev.some(bid => bid.id === transformedBid.id);
        return exists ? prev : [transformedBid, ...prev];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bid');
    }
  };

  // Handler functions for copying a bid
  const handleCopyProject = async (_originalProjectId: number, newProjectData: Omit<Bid, 'id'>) => {
    try {
      const newBid = await dbOperations.createProject(newProjectData);
      
      // Use optimistic update for consistency with handleAddBid
      const transformedBid: Bid = {
        id: newBid.id,
        title: newBid.title || newBid.project_name,
        project_name: newBid.project_name,
        project_email: newBid.project_email,
        project_address: newBid.project_address,
        general_contractor: newBid.general_contractor,
        project_description: newBid.project_description,
        due_date: newBid.due_date,
        status: newBid.status,
        priority: newBid.priority,
        estimated_value: newBid.estimated_value,
        notes: newBid.notes,
        created_by: newBid.created_by,
        assign_to: newBid.assign_to,
        file_location: newBid.file_location,
        archived: newBid.archived || false,
        archived_at: newBid.archived_at || null,
        archived_by: newBid.archived_by || null,
        on_hold: newBid.on_hold || false,
        on_hold_at: newBid.on_hold_at || null,
        on_hold_by: newBid.on_hold_by || null,
        department: newBid.department || null,
        sent_to_apm: newBid.sent_to_apm || false,
        sent_to_apm_at: newBid.sent_to_apm_at || null,
        apm_on_hold: newBid.apm_on_hold || false,
        apm_on_hold_at: newBid.apm_on_hold_at || null,
        apm_archived: newBid.apm_archived || false,
        apm_archived_at: newBid.apm_archived_at || null,
        gc_system: newBid.gc_system || null,
        added_to_procore: newBid.added_to_procore || false,
        made_by_apm: newBid.made_by_apm || false,
        project_start_date: newBid.project_start_date || null,
        gc_contact_id: newBid.gc_contact_id || null
      };
      
      setBids(prev => {
        const exists = prev.some(bid => bid.id === transformedBid.id);
        return exists ? prev : [transformedBid, ...prev];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy project');
    }
  };

  // Handler function for adding a bid with vendors
  const handleAddProjectWithVendors = async (bidData: Omit<Bid, 'id'>, vendorIds: number[]) => {
    try {
      // Create project first
      const project = await dbOperations.createProject(bidData);
      
      // Add vendors to project
      const vendorRelationships = await Promise.all(
        vendorIds.map(vendorId => 
          dbOperations.addVendorToProject(project.id, vendorId, {})
        )
      );
      
      const result = { project, vendorRelationships };
      
      // Transform and add the project to state
      const transformedBid: Bid = {
        id: result.project.id,
        title: result.project.title || result.project.project_name,
        project_name: result.project.project_name,
        project_email: result.project.project_email,
        project_address: result.project.project_address,
        general_contractor: result.project.general_contractor,
        project_description: result.project.project_description,
        due_date: result.project.due_date,
        status: result.project.status,
        priority: result.project.priority,
        estimated_value: result.project.estimated_value,
        notes: result.project.notes,
        created_by: result.project.created_by,
        assign_to: result.project.assign_to,
        file_location: result.project.file_location,
        archived: result.project.archived || false,
        archived_at: result.project.archived_at || null,
        archived_by: result.project.archived_by || null,
        on_hold: result.project.on_hold || false,
        on_hold_at: result.project.on_hold_at || null,
        on_hold_by: result.project.on_hold_by || null,
        department: result.project.department || null,
        sent_to_apm: result.project.sent_to_apm || false,
        sent_to_apm_at: result.project.sent_to_apm_at || null,
        apm_on_hold: result.project.apm_on_hold || false,
        apm_on_hold_at: result.project.apm_on_hold_at || null,
        apm_archived: result.project.apm_archived || false,
        apm_archived_at: result.project.apm_archived_at || null,
        gc_system: result.project.gc_system || null,
        added_to_procore: result.project.added_to_procore || false,
        made_by_apm: result.project.made_by_apm || false,
        project_start_date: result.project.project_start_date || null,
        gc_contact_id: result.project.gc_contact_id || null
      };
      
      setBids(prev => {
        const exists = prev.some(bid => bid.id === transformedBid.id);
        return exists ? prev : [transformedBid, ...prev];
      });

      // Add vendor relationships to state
      if (result.vendorRelationships && result.vendorRelationships.length > 0) {
        const transformedBidVendors = result.vendorRelationships.map((relationship: any) => ({
          id: relationship.projectVendor?.id || 0,
          bid_id: project.id,
          vendor_id: relationship.projectVendor?.vendor_id || 0,
          due_date: relationship.estResponse?.response_due_date,
          response_received_date: relationship.estResponse?.response_received_date,
          status: relationship.estResponse?.status || 'pending',
          follow_up_count: 0,
          last_follow_up_date: null,
          response_notes: relationship.estResponse?.response_notes,
          responded_by: null,
          is_priority: relationship.projectVendor?.is_priority || false,
          cost_amount: relationship.projectFinancials?.cost_amount,
          ...getDefaultAPMFields()
        }));

        setBidVendors(prev => [...prev, ...transformedBidVendors]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add project with vendors');
      throw err; // Re-throw so the modal can handle the error
    }
  };

  // Handler functions for deleting a bid
  const handleDeleteBid = async (bidId: number) => {
    try {
      await dbOperations.deleteProject(bidId);
      setBids(prevBids => prevBids.filter(bid => bid.id !== bidId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bid');
    }
  };

  // Handler functions for vendor management
  const handleAddVendor = async (vendorData: Omit<Vendor, 'id'>, contacts: ContactData[] = []) => {
    try {
      const result = await dbOperations.createVendorWithContacts(vendorData, contacts);
      
      // Real-time subscription will handle UI updates automatically
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add vendor';
      setError(errorMessage);
      throw err;
    }
  };

  // Handler function for updating a vendor
  const handleUpdateVendor = async (vendorId: number, updatedVendor: Partial<Vendor>) => {
    try {
      await dbOperations.updateVendor(vendorId, updatedVendor);
      
      // For legacy vendors, ensure primary contact sync
      // This helps fix vendors that may not have proper primary_contact_id set
      try {
        await dbOperations.syncVendorPrimaryContact(vendorId);
      } catch (syncError) {
        // Don't fail the update if sync fails, just log it
        console.warn('Failed to sync primary contact for vendor:', vendorId, syncError);
      }
      
      // Let real-time subscription handle state update to prevent conflicts
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update vendor';
      setError(errorMessage);
      throw err; // Re-throw so the UI component can handle it
    }
  };

  // Handler function for deleting a vendor
  const handleDeleteVendor = async (vendorId: number) => {
    try {
      await dbOperations.deleteVendor(vendorId);
      
      // Real-time subscription will handle UI updates automatically
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete vendor';
      setError(errorMessage);
      throw err; // Re-throw so the UI component can handle it
    }
  };

  // Handler functions for adding vendor to a bid
  const handleAddBidVendor = async (bidId: number, vendorData: Omit<BidVendor, 'id' | 'bid_id'>) => {
    try {
      const newBidVendor = await dbOperations.addVendorToProject(bidId, vendorData.vendor_id, {
        is_priority: vendorData.is_priority || false,
        assigned_by_user: vendorData.assigned_apm_user,
        status: vendorData.status,
        due_date: vendorData.due_date,
        response_notes: vendorData.response_notes,
        cost_amount: vendorData.cost_amount
      });
      
      // Transform the response to match our BidVendor type
      const transformedBidVendor: BidVendor = {
        id: newBidVendor.projectVendor.id,
        bid_id: bidId,
        vendor_id: vendorData.vendor_id,
        due_date: vendorData.due_date,
        response_received_date: vendorData.response_received_date,
        status: vendorData.status,
        follow_up_count: vendorData.follow_up_count || 0,
        last_follow_up_date: vendorData.last_follow_up_date,
        response_notes: vendorData.response_notes,
        responded_by: vendorData.responded_by,
        is_priority: vendorData.is_priority || false,
        cost_amount: vendorData.cost_amount,
        ...getDefaultAPMFields()
      };
      
      setBidVendors(prevBidVendors => [...prevBidVendors, transformedBidVendor]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vendor to bid');
    }
  };

  // Handler functions for updating a bid vendor
  const handleUpdateBidVendor = async (bidVendorId: number, vendorData: Partial<BidVendor>) => {
    try {
      await dbOperations.updateProjectVendor(bidVendorId, vendorData);
      
      setBidVendors(prevBidVendors => 
        prevBidVendors.map(bv => 
          bv.id === bidVendorId ? { ...bv, ...vendorData } : bv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bid vendor');
    }
  };

  // Handler functions for removing bid vendors
  const handleRemoveBidVendors = async (bidVendorIds: number[]) => {
    try {
      // Remove each vendor from project individually
      await Promise.all(
        bidVendorIds.map(id => dbOperations.removeVendorFromProject(id))
      );
      
      setBidVendors(prevBidVendors => 
        prevBidVendors.filter(bv => !bidVendorIds.includes(bv.id))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove vendors from bid');
    }
  };

  // Handler function for restoring a bid from Archives or On-Hold
  const handleBidRestored = (restoredBid: Bid) => {
    // Add the restored bid back to the main bids list, avoiding duplicates
    setBids(prevBids => {
      // Check if bid already exists in the array
      const existingIndex = prevBids.findIndex(bid => bid.id === restoredBid.id);
      if (existingIndex !== -1) {
        // Update existing bid
        return prevBids.map(bid => 
          bid.id === restoredBid.id ? restoredBid : bid
        );
      } else {
        // Add new bid to the beginning
        return [restoredBid, ...prevBids];
      }
    });
  };

  // Handler function to force vendor refresh
  const handleVendorUpdated = () => {
    // Real-time subscription will handle UI updates automatically
  };

  // Show unified loading state for both auth and app loading
  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-white font-sans flex items-center justify-center">
        <div className="text-center">
          <LottieLoader size="lg" />
          {/* <p className="mt-4 text-gray-600">
            {isAppLoading ? 'Loading your projects...' : 'Loading...'}
          </p> */}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white font-sans flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-[#d4af37] text-white rounded-md hover:bg-[#b8941f] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 font-sans overflow-hidden">
      <AppRoutes 
        bids={bids}
        vendors={vendors}
        bidVendors={bidVendors}
        users={users}
        projectNotes={projectNotes}
        isLoading={isAppLoading}
        handleStatusChange={handleStatusChange}
        handleUpdateBid={handleUpdateBid}
        handleUpdateAPMBid={handleUpdateAPMBid}
        handleDeleteBid={handleDeleteBid}
        handleAddBid={handleAddBid}
        handleAddProjectWithVendors={handleAddProjectWithVendors}
        handleCopyProject={handleCopyProject}
        handleAddVendor={handleAddVendor}
        handleUpdateVendor={handleUpdateVendor}
        handleDeleteVendor={handleDeleteVendor}
        handleAddBidVendor={handleAddBidVendor}
        handleUpdateBidVendor={handleUpdateBidVendor}
        handleRemoveBidVendors={handleRemoveBidVendors}
        handleBidRestored={handleBidRestored}
        handleVendorUpdated={handleVendorUpdated}
      />
    </div>
  );
};

// Export the internal component directly since LoadingProvider is now at App level
export default AppContentInternal;