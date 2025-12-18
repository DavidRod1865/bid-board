import { type ColumnDef } from "@tanstack/table-core";
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header";
import { formatDateSafe } from "../../utils/formatters";
import { getFollowUpUrgency } from "../../utils/phaseFollowUpUtils";
import type { Bid, Vendor, BidVendor, User } from "../../types";

export interface APMTask {
  id: string;
  project: Bid;
  vendor: Vendor;
  bidVendor: BidVendor;
  assignedUser: User | null;
  phase: {
    name: string;
    displayName: string;
    followUpDate: string;
    notes: string | null;
  };
  urgency: ReturnType<typeof getFollowUpUrgency>;
}

export function createAPMTaskColumns(): ColumnDef<APMTask>[] {
  return [
    {
      id: "project_name",
      accessorKey: "project.project_name",
      meta: {
        width: "w-[20%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Project Name" />
      ),
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0 flex-1 relative">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-xs truncate">
                {task.project.project_name}
              </div>
              {task.project.project_address && (
                <div className="text-gray-600 text-xs truncate">
                  {task.project.project_address}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "gc",
      accessorKey: "project.general_contractor",
      meta: {
        width: "w-[15%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="General Contractor"
          center
        />
      ),
      cell: ({ row }) => {
        const contractor = row.original.project.general_contractor;
        return (
          <div className="flex items-center justify-center text-gray-600 text-sm">
            <span
              className="text-center whitespace-nowrap overflow-hidden text-ellipsis"
              title={contractor || "Not specified"}
            >
              {contractor || "—"}
            </span>
          </div>
        );
      },
    },
    {
      id: "vendor",
      accessorKey: "vendor.company_name",
      meta: {
        width: "w-[15%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" center />
      ),
      cell: ({ row }) => {
        const vendorName = row.original.vendor.company_name;
        return (
          <div className="flex items-center justify-center text-gray-900 text-sm font-medium">
            <span
              className="text-center whitespace-nowrap overflow-hidden text-ellipsis"
              title={vendorName}
            >
              {vendorName}
            </span>
          </div>
        );
      },
    },
    {
      id: "phase",
      accessorKey: "phase.displayName",
      meta: {
        width: "w-[12%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Buyout Phase" center />
      ),
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex items-center justify-center">
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                task.urgency.level === "overdue"
                  ? "text-red-500 border-2 border-red-500"
                  : task.urgency.level === "due_today"
                  ? "text-red-800 border-2 border-red-800"
                  : task.urgency.level === "critical"
                  ? "text-yellow-700 border-2 border-yellow-700"
                  : "text-gray-600 border-2 border-gray-600"
              }`}
            >
              {task.phase.displayName}
            </span>
          </div>
        );
      },
    },
    {
      id: "follow_up_date",
      accessorKey: "phase.followUpDate",
      meta: {
        width: "w-[12%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Follow Up" center />
      ),
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex flex-col items-center">
            <div className="text-xs font-medium text-gray-900">
              {formatDateSafe(task.phase.followUpDate)}
            </div>
            <div className="text-xs text-gray-500">
              {task.urgency.level === "overdue"
                ? `${Math.abs(task.urgency.businessDaysRemaining)} days overdue`
                : task.urgency.level === "due_today"
                ? "Due today"
                : task.urgency.level === "critical"
                ? `Due in ${task.urgency.businessDaysRemaining} days`
                : `Due in ${task.urgency.businessDaysRemaining} days`}
            </div>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = new Date(rowA.original.phase.followUpDate).getTime();
        const b = new Date(rowB.original.phase.followUpDate).getTime();
        return a - b;
      },
    },
    {
      id: "assigned_user",
      accessorKey: "assignedUser.name",
      meta: {
        width: "w-[12%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned To" center />
      ),
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex items-center justify-center">
            {task.assignedUser ? (
              <span
                className="text-sm truncate"
                style={{
                  color: task.assignedUser.color_preference || "#000",
                }}
              >
                {task.assignedUser.name}
              </span>
            ) : (
              <span className="text-sm text-orange-600 font-medium">
                Unassigned
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "notes",
      accessorKey: "phase.notes",
      meta: {
        width: "w-[18%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </div>
      ),
      cell: ({ row }) => {
        const task = row.original;
        const notes = task.phase.notes || "—";
        return (
          <div className="relative group" style={{ position: 'relative', zIndex: 1 }}>
            <div className="text-gray-600 text-xs truncate cursor-help">
              {notes}
            </div>
            {task.phase.notes &&
              task.phase.notes.length > 50 && (
                <div
                  className="hidden group-hover:block absolute rounded-md border border-gray-300 shadow-lg text-xs text-gray-700 whitespace-pre-wrap"
                  style={{
                    position: 'absolute',
                    zIndex: 99999,
                    left: 0,
                    top: '100%',
                    marginTop: '4px',
                    width: '256px',
                    padding: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {task.phase.notes}
                </div>
              )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}

