import React, { useState } from 'react';
import { ChartBarIcon, WrenchScrewdriverIcon, ClockIcon } from '@heroicons/react/24/outline';
import Sidebar from '../ui/Sidebar';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '../../hooks/useToast';

const AnalyticsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const { toasts, removeToast } = useToast();

  const handleNewProject = () => {
    // Not applicable for analytics page
  };

  const handleCopyProject = () => {
    // Not applicable for analytics page
  };

  const handleWeeklyCostsReport = () => {
    // Not applicable for analytics page
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onNewProject={handleNewProject}
        onCopyProject={handleCopyProject}
        onWeeklyCostsReport={handleWeeklyCostsReport}
        isEmailingReport={false}
      />
      
      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="p-6 pb-0 flex-shrink-0">
          {/* Header section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600">Performance insights and metrics</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6 pt-0">
          {/* Work In Progress Content */}
          <div className="max-w-4xl mx-auto mt-14">
            {/* Work in Progress Banner */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex items-center">
                <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-600 mr-3" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-yellow-800">Work in Progress</h2>
                  <p className="text-yellow-700 mt-1">
                    We're currently developing analytics features to track vendor response times and bids
                    to help optimize your bidding process.
                  </p>
                </div>
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>

            {/* Status Update */}
            <div className="mt-2 bg-gray-50 rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Development Status</h3>
              <p className="text-gray-600 mb-4">
                Time-based analytics for vendor responses and bids are actively being developed.
              </p>
              <div className="flex justify-center">
                <div className="bg-yellow-200 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default AnalyticsPage;