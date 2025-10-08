import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Bid, User, ProjectNote } from "../../types";
import { getStatusColor } from "../../utils/statusUtils";
import { formatDate, getBidUrgencyClasses, getBidUrgency, getBidDisplayStatus } from "../../utils/formatters";
import { BID_STATUSES } from "../../utils/constants";

interface ProjectTableProps {
  bids: Bid[];
  bidVendors?: any[]; // Add bidVendors prop
  projectNotes?: ProjectNote[];
  getUserById: (userId: string) => User | undefined;
  onStatusChange?: (bidId: number, newStatus: string) => Promise<void>;
  isLoading?: boolean;
  // Pagination props
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
  totalItems?: number;
  startIndex?: number;
  endIndex?: number;
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  bids,
  bidVendors = [],
  projectNotes = [],
  getUserById,
  onStatusChange,
  isLoading = false,
}) => {
  const [sortField, setSortField] = useState<keyof Bid | null>("due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set());
  const [statusErrors, setStatusErrors] = useState<Map<number, string>>(new Map());
  const navigate = useNavigate();

  // Helper function to get the most recent note for a bid
  const getMostRecentNote = (bidId: number): string => {
    const bidNotes = projectNotes.filter(note => note.bid_id === bidId);
    if (bidNotes.length === 0) return '';
    
    // Sort by created_at descending to get most recent first
    const sortedNotes = bidNotes.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return sortedNotes[0].content || '';
  };

  const handleRowClick = (bidId: number, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === "SELECT" ||
      target.tagName === "OPTION" ||
      target.closest("select")
    ) {
      return;
    }
    navigate(`/project/${bidId}`);
  };

  const handleSort = (field: keyof Bid) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleStatusChange = async (bidId: number, newStatus: string) => {
    if (!onStatusChange) return;

    // Clear any previous errors for this bid
    setStatusErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(bidId);
      return newErrors;
    });

    // Add bid to updating set
    setUpdatingStatus(prev => new Set(prev).add(bidId));

    try {
      await onStatusChange(bidId, newStatus);
    } catch (error) {
      // Handle error by storing it in state
      setStatusErrors(prev => {
        const newErrors = new Map(prev);
        newErrors.set(bidId, error instanceof Error ? error.message : 'Failed to update status');
        return newErrors;
      });
    } finally {
      // Remove bid from updating set
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(bidId);
        return newSet;
      });
    }
  };

  const sortedBids = React.useMemo(() => {
    if (!sortField) return bids;

    return [...bids].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === "asc" ? 1 : -1;
      if (bValue === null) return sortDirection === "asc" ? -1 : 1;

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [bids, sortField, sortDirection]);

  const SortableHeader: React.FC<{ field: keyof Bid; children: React.ReactNode }> = ({ 
    field, 
    children 
  }) => (
    <div
      className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer flex items-center hover:text-gray-700 transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        <span className="ml-1 font-bold text-gray-700">
          {sortDirection === "asc" ? " ↑" : " ↓"}
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
      {/* Table Header */}
      <div className="grid grid-cols-[2.2fr_1.2fr_1.5fr_1.2fr_4fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
        <SortableHeader field="title">PROJECT NAME</SortableHeader>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-center cursor-pointer" onClick={() => handleSort('status')}>
          STATUS
          {sortField === 'status' && (
            <span className="ml-1 font-bold text-gray-700">
              {sortDirection === "asc" ? " ↑" : " ↓"}
            </span>
          )}
        </div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-center cursor-pointer" onClick={() => handleSort('due_date')}>
          BID DATE
          {sortField === 'due_date' && (
            <span className="ml-1 font-bold text-gray-700">
              {sortDirection === "asc" ? " ↑" : " ↓"}
            </span>
          )}
        </div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-center">
          RESPONSES
        </div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
          NOTES
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedBids.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No projects found
        </div>
      )}

      {/* Table Body */}
      {!isLoading && sortedBids.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {sortedBids.map((bid) => {
            const urgency = getBidUrgency(bid.due_date, bid.status);
            const isUpdating = updatingStatus.has(bid.id);
            const hasError = statusErrors.has(bid.id);
            
            // Calculate vendor response rate
            const projectBidVendors = bidVendors.filter((bv: any) => bv.bid_id === bid.id);
            const totalVendors = projectBidVendors.length;
            const respondedVendors = projectBidVendors.filter((bv: any) => {
              const hasResponse = bv.response_received_date !== null && bv.response_received_date !== undefined;
              const hasCost = bv.cost_amount !== null && bv.cost_amount !== undefined && bv.cost_amount !== '';
              return hasResponse || hasCost;
            }).length;
            
            
            // Get display status (handles overdue automatically)
            const displayStatus = getBidDisplayStatus(bid.status, bid.due_date);
            
            return (
            <div
              key={bid.id}
              className={`grid grid-cols-[2.2fr_1.2fr_1.5fr_1.2fr_4fr] border-b border-gray-200 px-4 py-3 items-center transition-all relative cursor-pointer ${getBidUrgencyClasses(bid.due_date, bid.status)}`}
              onClick={(e) => handleRowClick(bid.id, e)}
            >
              {/* Status accent line - only show if no urgency highlighting */}
              {urgency.level === 'none' && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: getStatusColor(bid.status) }}
                ></div>
              )}

              {/* Project Name */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 text-sm">
                  {bid.title}
                </span>
              </div>

              {/* Status Dropdown */}
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  {urgency.level === 'overdue' ? (
                    // Show read-only overdue status with option to edit
                    <div className="relative group">
                      <div 
                        className="px-3 py-2 rounded text-xs font-medium text-white bg-red-500 cursor-pointer w-32 text-center"
                        title="Click to change status"
                      >
                        {displayStatus}
                      </div>
                      <select
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        value={bid.status}
                        onChange={(e) => handleStatusChange(bid.id, e.target.value)}
                        disabled={isUpdating}
                      >
                        {BID_STATUSES.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    // Normal status dropdown
                    <select
                      className={`text-white border-none px-3 py-2 rounded text-xs font-medium cursor-pointer w-32 text-center appearance-none ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      value={bid.status}
                      style={{ backgroundColor: getStatusColor(bid.status) }}
                      onChange={(e) => handleStatusChange(bid.id, e.target.value)}
                      disabled={isUpdating}
                    >
                      {BID_STATUSES.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  )}
                  {isUpdating && (
                    <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  )}
                </div>
                {hasError && (
                  <div className="text-xs text-red-600 mt-1 max-w-24">
                    {statusErrors.get(bid.id)}
                  </div>
                )}
              </div>

              {/* Bid Date */}
              <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                <span>{formatDate(bid.due_date, 'short')}</span>
              </div>

              {/* Vendor Response Rate */}
              <div className="flex items-center justify-center text-gray-600 text-sm">
                {totalVendors > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {respondedVendors}/{totalVendors}
                    </span>
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          respondedVendors === totalVendors 
                            ? 'bg-green-500' 
                            : respondedVendors > 0 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${totalVendors > 0 ? (respondedVendors / totalVendors) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">No vendors</span>
                )}
              </div>

              {/* Notes */}
              <div className="flex items-center text-gray-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                {getMostRecentNote(bid.id)}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectTable;