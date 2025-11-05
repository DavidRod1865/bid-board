import { type ColumnDef } from "@tanstack/table-core";
import type { Bid, ProjectNote } from "../../types";
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatDate } from "../../utils/formatters";

interface SentToAPMColumnsContext {
  projectNotes?: ProjectNote[];
  getMostRecentNote?: (bidId: number) => string;
}

export function createSentToAPMColumns(
  context: SentToAPMColumnsContext = {}
): ColumnDef<Bid>[] {
  const {
    getMostRecentNote
  } = context;

  return [
    {
      id: "project",
      accessorKey: "project_name",
      meta: {
        width: "w-[20%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Project Name" />
      ),
      cell: ({ row }) => {
        const bid = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-sm truncate">
                {bid.project_name}
              </div>
              {bid.title && bid.title !== bid.project_name && (
                <div className="text-gray-500 text-xs truncate mt-1">
                  {bid.title}
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
        <DataTableColumnHeader column={column} title="General Contractor" />
      ),
      cell: ({ row }) => {
        const contractor = row.getValue("general_contractor") as string;
        return (
          <div className="text-sm text-gray-900 truncate">
            {contractor || "—"}
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
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <StatusBadge status={status} />
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
        <DataTableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => {
        const dueDate = row.getValue("due_date") as string;
        return (
          <div className="text-sm text-gray-900">
            {formatDate(dueDate)}
          </div>
        );
      },
    },
    {
      id: "sent_to_apm_at",
      accessorKey: "sent_to_apm_at",
      meta: {
        width: "w-[9%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sent Date" />
      ),
      cell: ({ row }) => {
        const sentDate = row.getValue("sent_to_apm_at") as string;
        return (
          <div className="text-sm text-gray-900">
            {sentDate ? formatDate(sentDate) : "—"}
          </div>
        );
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      meta: {
        width: "w-[25%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Notes" />
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const recentNote = getMostRecentNote ? getMostRecentNote(bid.id) : '';
        
        return (
          <div className="text-sm text-gray-600 truncate max-w-32">
            {recentNote || "—"}
          </div>
        );
      },
    },
  ];
}