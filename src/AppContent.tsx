import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';

// Importing types
import type { User, Bid, Vendor, BidVendor, ProjectNote } from './types';

// Importing Supabase operations and realtime manager
import { dbOperations, realtimeManager, supabase } from './lib/supabase';

// Importing components
import AnalyticsPage from './components/Analytics/AnalyticsPage';
import Dashboard from './components/Dashboard/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import VendorPage from './components/Vendor/VendorPage';
import VendorDetail from './components/Vendor/VendorDetail';
import Calendar from './components/Calendar';
import Archives from './components/Archives';
import OnHold from './components/OnHold';

// Raw bid data type as received from Supabase
type RawBidData = {
  id: number;
  title?: string;
  project_name: string;
  project_email?: string;
  project_address?: string;
  general_contractor?: string;
  project_description?: string;
  due_date: string;
  status: string;
  priority: boolean;
  estimated_value?: number;
  notes?: string;
  created_by?: string;
  assign_to?: string;
  file_location?: string;
  archived?: boolean;
  archived_at?: string;
  archived_by?: string;
  on_hold?: boolean;
  on_hold_at?: string;
  on_hold_by?: string;
  bid_vendors?: Array<BidVendor & { vendors?: { company_name: string; specialty?: string } }>;
  created_by_user?: { name: string; email: string };
  assigned_user?: { name: string; email: string };
};

// Realtime payload type for Supabase subscriptions
type RealtimePayload = {
  eventType?: string;
  event?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

// ProjectDetailWrapper component to handle individual project fetching
interface ProjectDetailWrapperProps {
  bids: Bid[];
  users: User[];
  vendors: Vendor[];
  bidVendors: BidVendor[];
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  onAddBidVendor: (bidId: number, vendorData: Omit<BidVendor, 'id' | 'bid_id'>) => Promise<void>;
  onUpdateBidVendor: (bidVendorId: number, vendorData: Partial<BidVendor>) => Promise<void>;
  onRemoveBidVendors: (bidVendorIds: number[]) => Promise<void>;
}

// ProjectDetailWrapper component definition
const ProjectDetailWrapper: React.FC<ProjectDetailWrapperProps> = (props) => {
  const navigate = useNavigate();
  const [individualBid, setIndividualBid] = useState<Bid | null>(null);
  const [loadingIndividual, setLoadingIndividual] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  // Get project ID from URL params & parse to integer
  const { id } = useParams<{ id: string }>();
  const bidId = parseInt(id || '0', 10);

  // Find the bid in the bids array that matches the project ID
  const bid = props.bids.find(b => b.id === bidId);
  
  // If bid is not found in bids array, try to fetch individually
  useEffect(() => {
    if (!bid && id && !loadingIndividual && !individualBid && !notFound) {
      const fetchIndividualBid = async () => {
        setLoadingIndividual(true);
        try {
          // fetch individual bid from Supabase by ID
          const fetchedBid = await dbOperations.getBidById(bidId);
          setIndividualBid(fetchedBid);
        } catch (error) {
          console.error('Failed to fetch individual project:', error);
          setNotFound(true);
        } finally {
          setLoadingIndividual(false);
        }
      };
      
      fetchIndividualBid();
    }
  }, [bid, id, bidId, loadingIndividual, individualBid, notFound]);
  
  // Determine which project to show: from props or fetched individually
  const projectToShow = bid || individualBid;
  
  // Handle loading and not found states
  if (loadingIndividual) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }
  
  // If no project found, show not found message
  if (!projectToShow || notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Project not found</h2>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#d4af37] text-white rounded-md hover:bg-[#b8941f]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    // Render ProjectDetail component with the determined project
    <ProjectDetail 
      bid={projectToShow}
      onUpdateBid={props.onUpdateBid}
      onDeleteBid={props.onDeleteBid}
    />
  );
};

// AppContent component definition
const AppContent: React.FC = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bidVendors, setBidVendors] = useState<BidVendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data from Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch bids, vendors, users, and project notes in parallel
        const [bidsData, vendorsData, usersData, projectNotesData] = await Promise.all([
          dbOperations.getBids(),
          dbOperations.getVendors(),
          dbOperations.getUsers(),
          dbOperations.getAllProjectNotes()
        ]);

        // Transform bids data to extract bid_vendors
        // Create a flat array of bid vendors
        const extractedBidVendors: BidVendor[] = [];
        // Take bidData and extract bid_vendors into extractedBidVendors array
        const transformedBids = bidsData.map((bid: RawBidData) => {
          if (bid.bid_vendors && Array.isArray(bid.bid_vendors)) {
            // push bid_vendors into extractedBidVendors with bid_id reference
            extractedBidVendors.push(...bid.bid_vendors.map((bv) => ({
              // Spread existing bid_vendor properties + add bid_id
              ...bv,
              bid_id: bid.id
            })));
          }
          
          // Return bid without the nested bid_vendors
          const { bid_vendors: _, ...bidWithoutVendors } = bid;
          return bidWithoutVendors as Bid;
        });

        setBids(transformedBids); // Set transformed bids without nested bid_vendors (see above)
        setVendors(vendorsData || []); // Set vendors
        setBidVendors(extractedBidVendors); // Set extracted bid vendors (see above)
        setUsers(usersData || []); // Set users
        setProjectNotes(projectNotesData || []); // Set project notes
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to bid changes
    realtimeManager.subscribeToBids((payload: RealtimePayload) => {
      const eventType = payload.eventType || payload.event;
      switch (eventType) {
        case 'INSERT':
          if (payload.new && typeof payload.new === 'object') {
            // Transform the payload to match our Bid interface
            const rawBid = payload.new as RawBidData;
            if (rawBid.id && (rawBid.title || rawBid.project_name)) {
              // Transform to match the structure from getBids() 
              const transformedBid: Bid = {
                id: rawBid.id,
                title: rawBid.title || rawBid.project_name,
                project_name: rawBid.project_name,
                project_email: rawBid.project_email || null,
                project_address: rawBid.project_address || null,
                general_contractor: rawBid.general_contractor || null,
                project_description: rawBid.project_description || null,
                due_date: rawBid.due_date,
                status: rawBid.status,
                priority: rawBid.priority,
                estimated_value: rawBid.estimated_value || null,
                notes: rawBid.notes || null,
                created_by: rawBid.created_by || null,
                assign_to: rawBid.assign_to || null,
                file_location: rawBid.file_location || null,
                archived: rawBid.archived || false,
                archived_at: rawBid.archived_at || null,
                archived_by: rawBid.archived_by || null,
                on_hold: rawBid.on_hold || false,
                on_hold_at: rawBid.on_hold_at || null,
                on_hold_by: rawBid.on_hold_by || null
              };
              
              // Check if bid already exists to prevent duplicates
              setBids(prev => {
                const exists = prev.some(bid => bid.id === transformedBid.id);
                return exists ? prev : [...prev, transformedBid];
              });
            }
          }
          break;
        case 'UPDATE':
          if (payload.new && typeof payload.new === 'object') {
            const updatedBid = payload.new as RawBidData;
            if (updatedBid.id) {
              setBids(prev => prev.map(bid => 
                bid.id === updatedBid.id ? { ...bid, ...updatedBid } as Bid : bid
              ));
            }
          }
          break;
        case 'DELETE':
          if (payload.old && typeof payload.old === 'object') {
            const deletedBid = payload.old as RawBidData;
            if (deletedBid.id) {
              setBids(prev => prev.filter(bid => bid.id !== deletedBid.id));
            }
          }
          break;
      }
    });

    // Subscribe to bid_vendors changes for real-time vendor response updates
    const bidVendorsChannel = supabase
      .channel('bid_vendors_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_vendors'
        },
        (payload: RealtimePayload) => {
          const bidVendorEventType = payload.eventType || payload.event;
          switch (bidVendorEventType) {
            case 'INSERT':
              if (payload.new && typeof payload.new === 'object') {
                const newBidVendor = payload.new as unknown as BidVendor;
                setBidVendors(prev => [...prev, newBidVendor]);
              }
              break;
            case 'UPDATE':
              if (payload.new && typeof payload.new === 'object') {
                const updatedBidVendor = payload.new as unknown as BidVendor;
                setBidVendors(prev => prev.map(bv => 
                  bv.id === updatedBidVendor.id ? updatedBidVendor : bv
                ));
              }
              break;
            case 'DELETE':
              if (payload.old && typeof payload.old === 'object') {
                const deletedBidVendor = payload.old as unknown as BidVendor;
                setBidVendors(prev => prev.filter(bv => bv.id !== deletedBidVendor.id));
              }
              break;
          }
        }
      )
      .subscribe();

    // Subscribe to vendors changes for real-time vendor list updates
    const vendorsChannel = supabase
      .channel('vendors_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors'
        },
        (payload: RealtimePayload) => {
          const vendorEventType = payload.eventType || payload.event;
          switch (vendorEventType) {
            case 'INSERT':
              if (payload.new && typeof payload.new === 'object') {
                const newVendor = payload.new as unknown as Vendor;
                // Check for duplicates before adding
                setVendors(prev => {
                  const exists = prev.some(v => v.id === newVendor.id);
                  return exists ? prev : [...prev, newVendor];
                });
              }
              break;
            case 'UPDATE':
              if (payload.new && typeof payload.new === 'object') {
                const updatedVendor = payload.new as unknown as Vendor;
                setVendors(prev => prev.map(v => 
                  v.id === updatedVendor.id ? updatedVendor : v
                ));
              }
              break;
            case 'DELETE':
              if (payload.old && typeof payload.old === 'object') {
                const deletedVendor = payload.old as unknown as Vendor;
                setVendors(prev => prev.filter(v => v.id !== deletedVendor.id));
              }
              break;
          }
        }
      )
      .subscribe();

    // Subscribe to project notes changes for real-time notes updates
    const projectNotesChannel = supabase
      .channel('project_notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_notes'
        },
        (payload: RealtimePayload) => {
          const noteEventType = payload.eventType || payload.event;
          switch (noteEventType) {
            case 'INSERT':
              if (payload.new && typeof payload.new === 'object') {
                const newNote = payload.new as unknown as ProjectNote;
                setProjectNotes(prev => [...prev, newNote]);
              }
              break;
            case 'UPDATE':
              if (payload.new && typeof payload.new === 'object') {
                const updatedNote = payload.new as unknown as ProjectNote;
                setProjectNotes(prev => prev.map(n => 
                  n.id === updatedNote.id ? updatedNote : n
                ));
              }
              break;
            case 'DELETE':
              if (payload.old && typeof payload.old === 'object') {
                const deletedNote = payload.old as unknown as ProjectNote;
                setProjectNotes(prev => prev.filter(n => n.id !== deletedNote.id));
              }
              break;
          }
        }
      )
      .subscribe();


    // Cleanup subscriptions on unmount
    return () => {
      // Clean up all subscriptions to prevent memory leaks
      try {
        realtimeManager.unsubscribeAll();
        bidVendorsChannel.unsubscribe();
        vendorsChannel.unsubscribe();
        projectNotesChannel.unsubscribe();
      } catch (error) {
        console.warn('Error during subscription cleanup:', error);
      }
    };
  }, []);

  // Handler functions to update status
  const handleStatusChange = async (bidId: number, newStatus: string) => {
    try {
      // Update bid status in the database
      await dbOperations.updateBid(bidId, { status: newStatus });
      // Update bid status in local state
      setBids(prevBids => 
        prevBids.map(bid => 
          bid.id === bidId ? { ...bid, status: newStatus } : bid
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bid status');
    }
  };

  // Handler functions for update bid
  const handleUpdateBid = async (bidId: number, updatedBid: Partial<Bid>) => {
    try {
      await dbOperations.updateBid(bidId, updatedBid);
      
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bid');
    }
  };

  // Handler functions for adding a new bid
  const handleAddBid = async (bidData: Omit<Bid, 'id'>) => {
    try {
      const newBid = await dbOperations.createBid(bidData);
      
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
        on_hold_by: newBid.on_hold_by || null
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
      const newBid = await dbOperations.createBid(newProjectData);
      
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
        on_hold_by: newBid.on_hold_by || null
      };
      
      setBids(prev => {
        const exists = prev.some(bid => bid.id === transformedBid.id);
        return exists ? prev : [transformedBid, ...prev];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy project');
    }
  };

  // Handler functions for deleting a bid
  const handleDeleteBid = async (bidId: number) => {
    try {
      await dbOperations.deleteBid(bidId);
      setBids(prevBids => prevBids.filter(bid => bid.id !== bidId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bid');
    }
  };

  // Handler functions for vendor management
  const handleAddVendor = async (vendorData: Omit<Vendor, 'id'>) => {
    try {
      const newVendor = await dbOperations.createVendor(vendorData);
      // Let real-time subscription handle state update to prevent duplicates
      return newVendor;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vendor');
      throw err;
    }
  };

  // Handler function for updating a vendor
  const handleUpdateVendor = async (vendorId: number, updatedVendor: Partial<Vendor>) => {
    try {
      await dbOperations.updateVendor(vendorId, updatedVendor);
      // Let real-time subscription handle state update to prevent conflicts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    }
  };

  // Handler function for deleting a vendor
  const handleDeleteVendor = async (vendorId: number) => {
    try {
      await dbOperations.deleteVendor(vendorId);
      // Let real-time subscription handle state update to prevent conflicts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  };

  // Handler functions for adding vendor to a bid
  const handleAddBidVendor = async (bidId: number, vendorData: Omit<BidVendor, 'id' | 'bid_id'>) => {
    try {
      const newBidVendor = await dbOperations.addVendorToBid(bidId, {
        vendor_id: vendorData.vendor_id,
        due_date: vendorData.due_date,
        response_received_date: vendorData.response_received_date,
        status: vendorData.status,
        follow_up_count: vendorData.follow_up_count || 0,
        last_follow_up_date: vendorData.last_follow_up_date,
        response_notes: vendorData.response_notes,
        responded_by: vendorData.responded_by,
        is_priority: vendorData.is_priority || false
      });
      
      // Transform the response to match our BidVendor type
      const bidVendorResponse = newBidVendor as BidVendor & { vendors?: Vendor };
      const transformedBidVendor: BidVendor = {
        id: bidVendorResponse.id,
        bid_id: bidId,
        vendor_id: bidVendorResponse.vendor_id,
        due_date: bidVendorResponse.due_date,
        response_received_date: bidVendorResponse.response_received_date,
        status: bidVendorResponse.status,
        follow_up_count: bidVendorResponse.follow_up_count || 0,
        last_follow_up_date: bidVendorResponse.last_follow_up_date,
        response_notes: bidVendorResponse.response_notes,
        responded_by: bidVendorResponse.responded_by,
        is_priority: bidVendorResponse.is_priority || false,
        cost_amount: bidVendorResponse.cost_amount
      };
      
      setBidVendors(prevBidVendors => [...prevBidVendors, transformedBidVendor]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vendor to bid');
    }
  };

  // Handler functions for updating a bid vendor
  const handleUpdateBidVendor = async (bidVendorId: number, vendorData: Partial<BidVendor>) => {
    try {
      await dbOperations.updateBidVendor(bidVendorId, vendorData);
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
      // Remove each bid vendor individually
      await Promise.all(
        bidVendorIds.map(id => dbOperations.removeVendorFromBid(id))
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

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#d4af37] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
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

      <Routes>
        <Route 
          path="/" 
          element={
            <Dashboard 
              bids={bids.filter(bid => !bid.archived && !bid.on_hold)}
              bidVendors={bidVendors}
              vendors={vendors}
              projectNotes={projectNotes}
              handleStatusChange={handleStatusChange}
              users={users}
              onAddProject={handleAddBid}
              onCopyProject={handleCopyProject}
            />
          } 
        />
        <Route 
          path="/project/:id" 
          element={
            <ProjectDetailWrapper 
              bids={bids}
              users={users}
              vendors={vendors}
              bidVendors={bidVendors}
              onUpdateBid={handleUpdateBid}
              onDeleteBid={handleDeleteBid}
              onAddBidVendor={handleAddBidVendor}
              onUpdateBidVendor={handleUpdateBidVendor}
              onRemoveBidVendors={handleRemoveBidVendors}
            />
          } 
        />
        <Route 
          path="/vendors" 
          element={
            <VendorPage 
              vendors={vendors}
              onAddVendor={handleAddVendor}
              onEditVendor={handleUpdateVendor}
              onDeleteVendor={handleDeleteVendor}
            />
          } 
        />
        <Route 
          path="/vendor/:id" 
          element={
            <VendorDetail 
              onDeleteVendor={handleDeleteVendor}
              onUpdateVendor={handleUpdateVendor}
            />
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <Calendar 
              bids={bids}
              bidVendors={bidVendors}
              vendors={vendors}
            />
          } 
        />
        <Route 
          path="/archives" 
          element={<Archives onBidRestored={handleBidRestored} projectNotes={projectNotes} />} 
        />
        <Route 
          path="/on-hold" 
          element={<OnHold onBidRestored={handleBidRestored} projectNotes={projectNotes} />} 
        />
        <Route 
          path="/analytics" 
          element={<AnalyticsPage />} 
        />
      </Routes>
    </div>
  );
};

export default AppContent;