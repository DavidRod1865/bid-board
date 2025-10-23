import { type ColumnDef } from "@tanstack/table-core";
import type { Bid, ProjectNote } from "../../types";
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header";
import StatusBadge from "../../components/ui/StatusBadge";
import { getBidUrgency, formatDate } from "../../utils/formatters";
import { BID_STATUSES } from "../../utils/constants";

// Simplified BidVendor structure that's actually passed from components
interface SimpleBidVendor {
  bid_id: number;
  response_received_date?: string | null;
  cost_amount?: string | number | null;
}

interface BidColumnsContext {
  bidVendors?: SimpleBidVendor[];
  projectNotes?: ProjectNote[];
  onStatusChange?: (bidId: number, newStatus: string) => Promise<void>;
  statusErrors?: Map<number, string>;
  updatingStatus?: Set<number>;
}

export function createBidColumns(
  context: BidColumnsContext = {}
): ColumnDef<Bid>[] {
  const {
    bidVendors = [],
    projectNotes = [],
    onStatusChange,
    statusErrors,
    updatingStatus,
  } = context;

  return [
    {
      id: "project",
      accessorKey: "title",
      meta: {
        width: "w-[20%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Project Name" />
      ),
      cell: ({ row }) => {
        const bid = row.original;

        return (
          <div className="flex items-center gap-3 min-w-0 flex-1 relative">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-sm truncate">
                {bid.title}
              </div>
              {bid.project_address && (
                <div
                  className="text-sm text-gray-500 truncate"
                  title={bid.project_address}
                >
                  {bid.project_address.length > 60
                    ? `${bid.project_address.substring(0, 60)}...`
                    : bid.project_address}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "general_contractor",
      accessorKey: "general_contractor",
      meta: {
        width: "w-[12%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="General Contractor"
          center
        />
      ),
      cell: ({ row }) => {
        const contractor = row.getValue("general_contractor") as string;
        return (
          <div className="flex items-center justify-center text-gray-600 text-sm min-w-0">
            <span
              className="text-center leading-tight overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                wordBreak: "break-word",
              }}
              title={contractor || "Not specified"}
            >
              {contractor || "Not specified"}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      meta: {
        width: "w-[10%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" center />
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const isUpdating = updatingStatus?.has(bid.id) || false;
        const hasError = statusErrors?.has(bid.id) || false;

        return (
          <div className="flex flex-col items-center">
            <div className="flex items-center relative">
              {onStatusChange && (
                <select
                  className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${
                    isUpdating ? "cursor-not-allowed" : ""
                  }`}
                  value={bid.status}
                  onChange={(e) => onStatusChange(bid.id, e.target.value)}
                  disabled={isUpdating}
                >
                  {BID_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              )}
              <StatusBadge
                status={bid.status}
                variant="badge"
                className={`min-w-32 ${isUpdating ? "opacity-50" : ""}`}
              />
              {isUpdating && (
                <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
              )}
            </div>
            {hasError && (
              <div className="text-xs text-red-600 mt-1 max-w-24">
                {statusErrors?.get(bid.id)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "due_date",
      accessorKey: "due_date",
      meta: {
        width: "w-[9%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bid Date" center />
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const urgency = getBidUrgency(bid.due_date, bid.status);

        return (
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
            <div
              className={`rounded px-2 py-1 ${
                urgency.level === "overdue"
                  ? "border-4 border-red-500"
                  : urgency.level === "dueToday"
                  ? "border-4 border-orange-500"
                  : ""
              }`}
            >
              <span>{formatDate(bid.due_date, "short")}</span>
            </div>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = new Date(rowA.original.due_date).getTime();
        const b = new Date(rowB.original.due_date).getTime();
        return a - b;
      },
    },
    {
      id: "responses",
      meta: {
        width: "w-[9%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
          Responses
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        // Calculate vendor response rate
        const projectBidVendors = bidVendors.filter(
          (bv: SimpleBidVendor) => bv.bid_id === bid.id
        );
        const totalVendors = projectBidVendors.length;
        const respondedVendors = projectBidVendors.filter(
          (bv: SimpleBidVendor) => {
            const hasResponse =
              bv.response_received_date !== null &&
              bv.response_received_date !== undefined;
            const hasCost =
              bv.cost_amount !== null &&
              bv.cost_amount !== undefined &&
              bv.cost_amount !== 0 &&
              bv.cost_amount !== "";
            return hasResponse || hasCost;
          }
        ).length;

        return (
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
                        ? "bg-green-500"
                        : respondedVendors > 0
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${
                        totalVendors > 0
                          ? (respondedVendors / totalVendors) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-gray-400 text-xs">No vendors</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "notes",
      meta: {
        width: "w-[25%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const bidNotes = projectNotes.filter(
          (note: ProjectNote) => note.bid_id === bid.id
        );
        if (bidNotes.length === 0) return "";

        // Sort by created_at descending to get most recent first
        const sortedNotes = bidNotes.sort(
          (a: ProjectNote, b: ProjectNote) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return (
          <div className="text-gray-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            {sortedNotes[0].content || ""}
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
