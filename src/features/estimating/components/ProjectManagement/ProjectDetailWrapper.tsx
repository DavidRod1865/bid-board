import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbOperations } from '../../../../shared/services/supabase';
import ProjectDetail from './ProjectDetail';
import type { User, Bid, Vendor, BidVendor } from '../../../../shared/types';

// ProjectDetailWrapper component to handle individual project fetching
interface ProjectDetailWrapperProps {
  bids: Bid[];
  users: User[];
  vendors: Vendor[];
  bidVendors: BidVendor[];
  projectNotes: import('../../../../shared/types').ProjectNote[];
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
      bidVendors={props.bidVendors}
      projectNotes={props.projectNotes}
      vendors={props.vendors}
      users={props.users}
      onUpdateBid={props.onUpdateBid}
      onDeleteBid={props.onDeleteBid}
      onAddBidVendor={props.onAddBidVendor}
      onUpdateBidVendor={props.onUpdateBidVendor}
      onRemoveBidVendors={props.onRemoveBidVendors}
    />
  );
};

export default ProjectDetailWrapper;