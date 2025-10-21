import React, { useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import Sidebar from '../ui/Sidebar';
import AnalyticsDashboard from './AnalyticsDashboard';
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
          <AnalyticsDashboard />
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default AnalyticsPage;