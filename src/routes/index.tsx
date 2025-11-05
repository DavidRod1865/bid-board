// Main routing configuration with team-specific prefixes
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Shared components
import AnalyticsPage from '../shared/components/AnalyticsPage';
import ProjectDetailWrapper from '../features/estimating/components/ProjectManagement/ProjectDetailWrapper';

// Estimating team components
import Dashboard from '../features/estimating/pages/Dashboard';
import BidsSentToAPM from '../features/estimating/pages/BidsSentToAPM';
import VendorPage from '../features/estimating/components/VendorManagement/VendorPage';
import VendorDetail from '../features/estimating/components/VendorManagement/VendorDetail';

// APM team components
import APMDashboard from '../features/apm/pages/Dashboard';
import APMProjects from '../features/apm/pages/APM_Projects';
import APMArchives from '../features/apm/pages/APM_Archives';
import APMOnHold from '../features/apm/pages/APM_OnHold';
import APMProjectDetailWrapper from '../features/apm/components/ProjectManagement/APMProjectDetailWrapper';
import Calendar from '../shared/pages/Calendar';
import Archives from '../features/estimating/pages/Archives';
import OnHold from '../features/estimating/pages/OnHold';

// Types
import type { User, Bid, Vendor, BidVendor, ProjectNote } from '../shared/types';

interface AppRoutesProps {
  // Data props
  bids: Bid[];
  vendors: Vendor[];
  bidVendors: BidVendor[];
  users: User[];
  projectNotes: ProjectNote[];
  
  // Handler functions
  handleStatusChange: (bidId: number, newStatus: string) => Promise<void>;
  handleUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  handleDeleteBid: (bidId: number) => Promise<void>;
  handleAddBid: (bidData: Omit<Bid, 'id'>) => Promise<void>;
  handleAddProjectWithVendors: (bidData: Omit<Bid, 'id'>, vendorIds: number[]) => Promise<void>;
  handleCopyProject: (originalProjectId: number, newProjectData: Omit<Bid, 'id'>) => Promise<void>;
  handleAddVendor: (vendorData: Omit<Vendor, 'id'>) => Promise<Vendor>;
  handleUpdateVendor: (vendorId: number, updatedVendor: Partial<Vendor>) => Promise<void>;
  handleDeleteVendor: (vendorId: number) => Promise<void>;
  handleAddBidVendor: (bidId: number, vendorData: Omit<BidVendor, 'id' | 'bid_id'>) => Promise<void>;
  handleUpdateBidVendor: (bidVendorId: number, vendorData: Partial<BidVendor>) => Promise<void>;
  handleRemoveBidVendors: (bidVendorIds: number[]) => Promise<void>;
  handleBidRestored: (restoredBid: Bid) => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({
  bids,
  vendors,
  bidVendors,
  users,
  projectNotes,
  handleStatusChange,
  handleUpdateBid,
  handleDeleteBid,
  handleAddBid,
  handleAddProjectWithVendors,
  handleCopyProject,
  handleAddVendor,
  handleUpdateVendor,
  handleDeleteVendor,
  handleAddBidVendor,
  handleUpdateBidVendor,
  handleRemoveBidVendors,
  handleBidRestored
}) => {
  return (
    <Routes>
      {/* Default route - Estimating Dashboard */}
      <Route 
        path="/" 
        element={
          <Dashboard 
            bids={bids.filter(bid => !bid.archived && !bid.on_hold && !bid.sent_to_apm)}
            bidVendors={bidVendors}
            vendors={vendors}
            projectNotes={projectNotes}
            handleStatusChange={handleStatusChange}
            users={users}
            onAddProject={handleAddBid}
            onAddProjectWithVendors={handleAddProjectWithVendors}
            onCopyProject={handleCopyProject}
          />
        } 
      />

      {/* Estimating Team Routes */}
      <Route 
        path="/estimating" 
        element={
          <Dashboard 
            bids={bids.filter(bid => !bid.archived && !bid.on_hold && !bid.sent_to_apm)}
            bidVendors={bidVendors}
            vendors={vendors}
            projectNotes={projectNotes}
            handleStatusChange={handleStatusChange}
            users={users}
            onAddProject={handleAddBid}
            onAddProjectWithVendors={handleAddProjectWithVendors}
            onCopyProject={handleCopyProject}
          />
        } 
      />
      
      <Route 
        path="/estimating/bids-sent-to-apm" 
        element={
          <BidsSentToAPM 
            onBidRestored={handleBidRestored} 
            projectNotes={projectNotes} 
          />
        } 
      />
      
      <Route 
        path="/estimating/vendors" 
        element={
          <VendorPage 
            vendors={vendors}
            onAddVendor={async (vendorData) => {
              await handleAddVendor(vendorData);
            }}
            onEditVendor={handleUpdateVendor}
            onDeleteVendor={handleDeleteVendor}
          />
        } 
      />
      
      <Route 
        path="/estimating/vendor/:id" 
        element={
          <VendorDetail 
            onDeleteVendor={handleDeleteVendor}
            onUpdateVendor={handleUpdateVendor}
          />
        } 
      />

      {/* APM Team Routes */}
      <Route 
        path="/apm" 
        element={<APMDashboard />} 
      />
      
      <Route 
        path="/apm/projects" 
        element={
          <APMProjects 
            bids={bids}
            bidVendors={bidVendors}
            vendors={vendors}
            projectNotes={projectNotes}
            handleStatusChange={handleStatusChange}
            users={users}
            onAddProject={handleAddBid}
            onAddProjectWithVendors={handleAddProjectWithVendors}
            onCopyProject={handleCopyProject}
          />
        } 
      />
      
      <Route 
        path="/apm/project/:id" 
        element={
          <APMProjectDetailWrapper 
            bids={bids}
            users={users}
            vendors={vendors}
            bidVendors={bidVendors}
            onUpdateBid={handleUpdateBid}
            onDeleteBid={handleDeleteBid}
            onUpdateBidVendor={handleUpdateBidVendor}
          />
        } 
      />

      <Route 
        path="/apm/tasks" 
        element={
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Daily Tasks</h1>
            <p className="text-gray-600">Vendor follow-up task management coming soon...</p>
          </div>
        } 
      />

      <Route 
        path="/apm/archives" 
        element={
          <APMArchives 
            onBidRestored={handleBidRestored} 
            projectNotes={projectNotes} 
          />
        } 
      />
      
      <Route 
        path="/apm/on-hold" 
        element={
          <APMOnHold 
            onBidRestored={handleBidRestored} 
            projectNotes={projectNotes} 
          />
        } 
      />
      
      <Route 
        path="/apm/vendors" 
        element={
          <VendorPage 
            vendors={vendors}
            onAddVendor={async (vendorData) => {
              await handleAddVendor(vendorData);
            }}
            onEditVendor={handleUpdateVendor}
            onDeleteVendor={handleDeleteVendor}
          />
        } 
      />

      {/* Shared/Legacy Routes (maintaining backward compatibility) */}
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
            onAddVendor={async (vendorData) => {
              await handleAddVendor(vendorData);
            }}
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
        element={
          <Archives 
            onBidRestored={handleBidRestored} 
            projectNotes={projectNotes} 
          />
        } 
      />
      
      <Route 
        path="/on-hold" 
        element={
          <OnHold 
            onBidRestored={handleBidRestored} 
            projectNotes={projectNotes} 
          />
        } 
      />
      
      <Route 
        path="/analytics" 
        element={<AnalyticsPage />} 
      />

      {/* Catch-all route */}
      <Route 
        path="*" 
        element={
          <div className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
            <p className="text-gray-600">The page you're looking for doesn't exist.</p>
          </div>
        } 
      />
    </Routes>
  );
};

export default AppRoutes;