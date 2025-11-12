import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbOperations } from '../../../../shared/services/supabase';
import APMProjectDetail from './APMProjectDetail';
import type { User, Bid, Vendor, BidVendor } from '../../../../shared/types';

// APMProjectDetailWrapper component to handle APM project fetching and filtering
interface APMProjectDetailWrapperProps {
  bids: Bid[];
  users: User[];
  vendors: Vendor[];
  bidVendors: BidVendor[];
  projectNotes: import('../../../../shared/types').ProjectNote[];
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  onUpdateBidVendor: (bidVendorId: number, vendorData: Partial<BidVendor>) => Promise<void>;
}

// APMProjectDetailWrapper component definition
const APMProjectDetailWrapper: React.FC<APMProjectDetailWrapperProps> = (props) => {
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
          
          // Check if the fetched bid is an APM project
          if (!fetchedBid.sent_to_apm) {
            setNotFound(true);
            return;
          }
          
          setIndividualBid(fetchedBid);
        } catch (error) {
          console.error('Failed to fetch individual APM project:', error);
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
  
  // Additional check: ensure the project is an APM project
  const isAPMProject = projectToShow?.sent_to_apm === true;
  
  // Handle loading and not found states
  if (loadingIndividual) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading APM project...</p>
        </div>
      </div>
    );
  }
  
  // If no project found or not an APM project, show not found message
  if (!projectToShow || notFound || !isAPMProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">APM Project not found</h2>
          <p className="text-gray-600 mb-4">
            {!projectToShow || notFound 
              ? "The requested project could not be found." 
              : "This project has not been sent to APM."}
          </p>
          <button 
            onClick={() => navigate('/apm/projects')}
            className="px-4 py-2 bg-[#d4af37] text-white rounded-md hover:bg-[#b8941f]"
          >
            Back to APM Projects
          </button>
        </div>
      </div>
    );
  }
  
  return (
    // Render APMProjectDetail component with the determined APM project
    <APMProjectDetail 
      bid={projectToShow}
      bidVendors={props.bidVendors}
      projectNotes={props.projectNotes}
      vendors={props.vendors}
      users={props.users}
      onUpdateBid={props.onUpdateBid}
      onDeleteBid={props.onDeleteBid}
      onUpdateBidVendor={props.onUpdateBidVendor}
    />
  );
};

export default APMProjectDetailWrapper;