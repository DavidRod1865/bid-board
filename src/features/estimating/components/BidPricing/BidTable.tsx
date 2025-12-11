import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Bid, ProjectNote } from "../../../../shared/types";
import { DataTable } from "../../../../shared/components/ui/data-table";
import { createBidColumns } from "../../../../shared/services/table-columns/bid-columns";
import { getBidUrgencyClasses, getBidUrgency } from "../../../../shared/utils/formatters";
import { getStatusColor } from "../../../../shared/utils/statusUtils";
import { useLoading } from "../../../../shared/contexts/LoadingContext";

interface BidVendor {
  bid_id: number;
  response_received_date?: string | null;
  cost_amount?: string | number | null;
  is_priority: boolean;
}

interface ProjectTableProps {
  bids: Bid[];
  bidVendors?: BidVendor[];
  projectNotes?: ProjectNote[];
  onStatusChange?: (bidId: number, newStatus: string) => Promise<void>;
  isLoading?: boolean;
  // Bulk selection props (back to original Set + individual callback pattern)
  selectedBids?: Set<number>;
  onBidSelect?: (bidId: number, selected: boolean) => void;
  // APM routing props
  useAPMRouting?: boolean;
  // Page size prop
  pageSize?: number;
  // Dynamic page size controls
  enablePageSizeSelector?: boolean;
  availablePageSizes?: number[];
  onPageSizeChange?: (size: number | null) => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  bids,
  bidVendors = [],
  projectNotes = [],
  onStatusChange,
  isLoading = false,
  selectedBids = new Set(),
  onBidSelect,
  useAPMRouting = false,
  pageSize = 25,
  enablePageSizeSelector = false,
  availablePageSizes = [10, 15, 20, 25, 30, 50],
  onPageSizeChange,
}) => {
  const [statusErrors, setStatusErrors] = useState<Map<number, string>>(
    new Map()
  );
  
  const { isOperationLoading, setOperationLoading } = useLoading();
  const navigate = useNavigate();

  const handleStatusChange = useCallback(async (bidId: number, newStatus: string) => {
    if (!onStatusChange) return;

    const operationId = `status-update-${bidId}`;

    // Clear any previous errors for this bid
    setStatusErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(bidId);
      return newErrors;
    });

    // Set loading state for this specific operation
    setOperationLoading(operationId, true);

    try {
      await onStatusChange(bidId, newStatus);
    } catch (error) {
      // Handle error by storing it in state
      setStatusErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.set(
          bidId,
          error instanceof Error ? error.message : "Failed to update status"
        );
        return newErrors;
      });
    } finally {
      // Clear loading state for this operation
      setOperationLoading(operationId, false);
    }
  }, [onStatusChange, setOperationLoading]);

  // Create column definitions with context
  const columns = useMemo(() => {
    return createBidColumns({
      bidVendors,
      projectNotes,
      onStatusChange: handleStatusChange,
      statusErrors,
      isOperationLoading: (bidId: number) => isOperationLoading(`status-update-${bidId}`),
      showEstimatingColumns: !useAPMRouting
    });
  }, [bidVendors, projectNotes, handleStatusChange, statusErrors, isOperationLoading, useAPMRouting]);

  // Convert Set to TanStack Table row selection format (same as OnHold)
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    bids.forEach((bid, index) => {
      if (selectedBids.has(bid.id)) {
        selection[index.toString()] = true;
      }
    });
    return selection;
  }, [selectedBids, bids]);

  const handleRowSelectionChange = (selection: Record<string, boolean>) => {
    if (!onBidSelect) return;

    // Exact same pattern as OnHold page
    const newSelectedIds = new Set<number>();
    Object.entries(selection).forEach(([index, isSelected]) => {
      if (isSelected) {
        const bidIndex = parseInt(index);
        if (bids[bidIndex]) {
          newSelectedIds.add(bids[bidIndex].id);
        }
      }
    });

    // Call handleBidSelect for each change (same as OnHold)
    bids.forEach((bid) => {
      const wasSelected = selectedBids.has(bid.id);
      const isSelected = newSelectedIds.has(bid.id);
      
      if (wasSelected !== isSelected) {
        onBidSelect(bid.id, isSelected);
      }
    });
  };

  const getRowClassName = (bid: Bid) => {
    // APM routing disables urgency styling - always show status accent
    if (useAPMRouting) {
      return 'hover:bg-gray-50 hover:-translate-y-px active:translate-y-0 border-l-4';
    }
    
    const urgency = getBidUrgency(bid.due_date, bid.status);
    const urgencyClasses = getBidUrgencyClasses(bid.due_date, bid.status);
    
    // If no urgency highlighting, add border-l-4 class for status accent
    if (urgency.level === 'none') {
      return `${urgencyClasses} border-l-4`;
    }
    
    return urgencyClasses;
  };

  const getRowStyle = (bid: Bid) => {
    // APM routing disables urgency styling - always show status color on left border
    if (useAPMRouting) {
      const statusColor = getStatusColor(bid.status);
      return { borderLeftColor: statusColor };
    }
    
    const urgency = getBidUrgency(bid.due_date, bid.status);
    
    // If no urgency highlighting, add status color to left border
    if (urgency.level === 'none') {
      const statusColor = getStatusColor(bid.status);
      return { borderLeftColor: statusColor };
    }
    
    return {};
  };

  return (
    <DataTable
      columns={columns}
      data={bids}
      enableRowSelection={!!onBidSelect}
      enableSorting={true}
      initialSorting={useAPMRouting ? [{ id: "project", desc: false }] : [{ id: "due_date", desc: false }]}
      rowSelection={rowSelection}
      onRowSelectionChange={handleRowSelectionChange}
      onRowClick={(bid) => navigate(useAPMRouting ? `/apm/project/${bid.id}` : `/project/${bid.id}`)}
      isLoading={isLoading}
      emptyMessage="No projects found"
      getRowClassName={getRowClassName}
      getRowStyle={getRowStyle}
      pageSize={pageSize}
      enablePageSizeSelector={enablePageSizeSelector}
      availablePageSizes={availablePageSizes}
      onPageSizeChange={onPageSizeChange}
    />
  );
};

export default ProjectTable;