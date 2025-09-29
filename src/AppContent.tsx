import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import type { User, Bid, Vendor, BidVendor, ProjectNote } from './types';
import { dbOperations, realtimeManager, supabase } from './lib/supabase';
import Dashboard from './components/Dashboard/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import VendorPage from './components/Vendor/VendorPage';
import VendorDetail from './components/Vendor/VendorDetail';
import Calendar from './components/Calendar';

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

const ProjectDetailWrapper: React.FC<ProjectDetailWrapperProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const bidId = parseInt(id || '0', 10);
  const bid = props.bids.find(b => b.id === bidId);
  
  if (!bid) {
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
    <ProjectDetail 
      bid={bid}
      onUpdateBid={props.onUpdateBid}
      onDeleteBid={props.onDeleteBid}
    />
  );
};

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
        
        const [bidsData, vendorsData, usersData, projectNotesData] = await Promise.all([
          dbOperations.getBids(),
          dbOperations.getVendors(),
          dbOperations.getUsers(),
          dbOperations.getAllProjectNotes()
        ]);

        // Transform bids data to extract bid_vendors
        const extractedBidVendors: BidVendor[] = [];
        const transformedBids = bidsData.map((bid: any) => {
          // Extract bid_vendors from the nested structure
          if (bid.bid_vendors && Array.isArray(bid.bid_vendors)) {
            extractedBidVendors.push(...bid.bid_vendors.map((bv: any) => ({
              ...bv,
              bid_id: bid.id
            })));
          }
          
          // Return bid without the nested bid_vendors
          const { bid_vendors, ...bidWithoutVendors } = bid;
          return bidWithoutVendors as Bid;
        });

        setBids(transformedBids);
        setVendors(vendorsData || []);
        setBidVendors(extractedBidVendors);
        setUsers(usersData || []);
        setProjectNotes(projectNotesData || []);
        
        // Users are now loaded directly from the database
        
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
    realtimeManager.subscribeToBids((payload: any) => {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new && typeof payload.new === 'object') {
            // Transform the payload to match our Bid interface
            const newBid = payload.new as any;
            if (newBid.id && newBid.title) {
              // Check if bid already exists to prevent duplicates
              setBids(prev => {
                const exists = prev.some(bid => bid.id === newBid.id);
                return exists ? prev : [...prev, newBid as Bid];
              });
            }
          }
          break;
        case 'UPDATE':
          if (payload.new && typeof payload.new === 'object') {
            const updatedBid = payload.new as any;
            if (updatedBid.id) {
              setBids(prev => prev.map(bid => 
                bid.id === updatedBid.id ? { ...bid, ...updatedBid } as Bid : bid
              ));
            }
          }
          break;
        case 'DELETE':
          if (payload.old && typeof payload.old === 'object') {
            const deletedBid = payload.old as any;
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
        (payload: any) => {
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new && typeof payload.new === 'object') {
                const newBidVendor = payload.new as BidVendor;
                setBidVendors(prev => [...prev, newBidVendor]);
              }
              break;
            case 'UPDATE':
              if (payload.new && typeof payload.new === 'object') {
                const updatedBidVendor = payload.new as BidVendor;
                setBidVendors(prev => prev.map(bv => 
                  bv.id === updatedBidVendor.id ? updatedBidVendor : bv
                ));
              }
              break;
            case 'DELETE':
              if (payload.old && typeof payload.old === 'object') {
                const deletedBidVendor = payload.old as BidVendor;
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
        (payload: any) => {
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new && typeof payload.new === 'object') {
                const newVendor = payload.new as Vendor;
                // Check for duplicates before adding
                setVendors(prev => {
                  const exists = prev.some(v => v.id === newVendor.id);
                  return exists ? prev : [...prev, newVendor];
                });
              }
              break;
            case 'UPDATE':
              if (payload.new && typeof payload.new === 'object') {
                const updatedVendor = payload.new as Vendor;
                setVendors(prev => prev.map(v => 
                  v.id === updatedVendor.id ? updatedVendor : v
                ));
              }
              break;
            case 'DELETE':
              if (payload.old && typeof payload.old === 'object') {
                const deletedVendor = payload.old as Vendor;
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
        (payload: any) => {
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new && typeof payload.new === 'object') {
                const newNote = payload.new as ProjectNote;
                setProjectNotes(prev => [...prev, newNote]);
              }
              break;
            case 'UPDATE':
              if (payload.new && typeof payload.new === 'object') {
                const updatedNote = payload.new as ProjectNote;
                setProjectNotes(prev => prev.map(n => 
                  n.id === updatedNote.id ? updatedNote : n
                ));
              }
              break;
            case 'DELETE':
              if (payload.old && typeof payload.old === 'object') {
                const deletedNote = payload.old as ProjectNote;
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

  const handleStatusChange = async (bidId: number, newStatus: string) => {
    try {
      await dbOperations.updateBid(bidId, { status: newStatus });
      setBids(prevBids => 
        prevBids.map(bid => 
          bid.id === bidId ? { ...bid, status: newStatus } : bid
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bid status');
    }
  };

  const handleUpdateBid = async (bidId: number, updatedBid: Partial<Bid>) => {
    try {
      await dbOperations.updateBid(bidId, updatedBid);
      setBids(prevBids => 
        prevBids.map(bid => 
          bid.id === bidId ? { ...bid, ...updatedBid } : bid
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bid');
    }
  };

  const handleAddBid = async (bidData: Omit<Bid, 'id'>) => {
    try {
      await dbOperations.createBid(bidData);
      // Don't update state here - let real-time subscription handle it
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bid');
    }
  };

  const handleCopyProject = async (_originalProjectId: number, newProjectData: Omit<Bid, 'id'>) => {
    try {
      await dbOperations.createBid(newProjectData);
      // Don't update state here - let real-time subscription handle it
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy project');
    }
  };

  const handleDeleteBid = async (bidId: number) => {
    try {
      await dbOperations.deleteBid(bidId);
      setBids(prevBids => prevBids.filter(bid => bid.id !== bidId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bid');
    }
  };

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

  const handleUpdateVendor = async (vendorId: number, updatedVendor: Partial<Vendor>) => {
    try {
      await dbOperations.updateVendor(vendorId, updatedVendor);
      // Let real-time subscription handle state update to prevent conflicts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (vendorId: number) => {
    try {
      await dbOperations.deleteVendor(vendorId);
      // Let real-time subscription handle state update to prevent conflicts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  };

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
      const transformedBidVendor: BidVendor = {
        id: (newBidVendor as any).id,
        bid_id: bidId,
        vendor_id: (newBidVendor as any).vendor_id,
        due_date: (newBidVendor as any).due_date,
        response_received_date: (newBidVendor as any).response_received_date,
        status: (newBidVendor as any).status,
        follow_up_count: (newBidVendor as any).follow_up_count || 0,
        last_follow_up_date: (newBidVendor as any).last_follow_up_date,
        response_notes: (newBidVendor as any).response_notes,
        responded_by: (newBidVendor as any).responded_by,
        is_priority: (newBidVendor as any).is_priority || false,
        cost_amount: (newBidVendor as any).cost_amount
      };
      
      setBidVendors(prevBidVendors => [...prevBidVendors, transformedBidVendor]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vendor to bid');
    }
  };

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

  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user.id === userId);
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
              bids={bids}
              bidVendors={bidVendors}
              vendors={vendors}
              projectNotes={projectNotes}
              handleStatusChange={handleStatusChange}
              getUserById={getUserById}
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
      </Routes>
    </div>
  );
};

export default AppContent;