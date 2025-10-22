import React, { useState } from "react";
import Sidebar from "../ui/Sidebar";
import ToastContainer from "../ui/ToastContainer";
import { useToast } from "../../hooks/useToast";
import AnalyticsDashboard from "./AnalyticsDashboard";

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
      <div className="flex-1 flex flex-col mx-auto w-full p-6 pt-4 overflow-y-auto">
        <AnalyticsDashboard/>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default AnalyticsPage;
