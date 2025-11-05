import React, { useState } from "react";
import Sidebar from "./ui/Sidebar";
import { Toaster } from "./ui/sonner";
import { useToast } from "../hooks/useToast";
import AnalyticsDashboard from "./AnalyticsDashboard";

const AnalyticsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const {} = useToast();


  return (
    <div className="flex h-screen">
      <Sidebar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
      <div className="flex-1 flex flex-col mx-auto w-full p-6 pt-4 overflow-y-auto">
        <AnalyticsDashboard/>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
};

export default AnalyticsPage;
