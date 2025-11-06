import { type ColumnDef } from "@tanstack/table-core"
import type { Bid, ProjectNote } from "../../types"
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header"
import StatusBadge from "../../components/ui/StatusBadge"
import { formatDate } from "../../utils/formatters"

interface ArchiveColumnsContext {
  projectNotes?: ProjectNote[]
  getMostRecentNote?: (bidId: number) => string
}

export function createArchiveColumns(context: ArchiveColumnsContext = {}): ColumnDef<Bid>[] {
  const { getMostRecentNote } = context

  return [
    {
      id: "project",
      accessorKey: "project_name",
      meta: {
        width: "w-[20%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Project Name" />
      ),
      cell: ({ row }) => {
        const bid = row.original
        
        return (
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-sm truncate">
                {bid.project_name}
              </div>
              {bid.project_address && (
                <div className="text-sm text-gray-500 truncate" title={bid.project_address}>
                  {bid.project_address.length > 40 
                    ? `${bid.project_address.substring(0, 40)}...` 
                    : bid.project_address}
                </div>
              )}
            </div>
        )
      },
    },
    {
      id: "general_contractor",
      accessorKey: "general_contractor",
      meta: {
        width: "w-[12%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="General Contractor" center />
      ),
      cell: ({ row }) => {
        const contractor = row.getValue("general_contractor") as string
        return (
          <div className="flex items-center justify-center text-gray-600 text-sm min-w-0">
            <span 
              className="text-center leading-tight overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word'
              }}
              title={contractor || 'Not specified'}
            >
              {contractor || 'Not specified'}
            </span>
          </div>
        )
      },
    },
    {
      id: "status",
      accessorKey: "status",
      meta: {
        width: "w-[10%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" center />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <div className="flex items-center justify-center">
            <StatusBadge 
              status={status} 
              variant="badge"
              className="min-w-32"
            />
          </div>
        )
      },
    },
    {
      id: "due_date",
      accessorKey: "due_date",
      meta: {
        width: "w-[9%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bid Date" center />
      ),
      cell: ({ row }) => {
        const bid = row.original
        
        return (
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
            <div className="rounded px-2 py-1">
              <span>{formatDate(bid.due_date, "short")}</span>
            </div>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = new Date(rowA.original.due_date).getTime()
        const b = new Date(rowB.original.due_date).getTime()
        return b - a
      },
    },
    {
      id: "archivedDate",
      accessorKey: "archived_at",
      meta: {
        width: "w-[9%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Archived On" center />
      ),
      cell: ({ row }) => {
        const archivedAt = row.getValue("archivedDate") as string
        return (
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
            <div className="rounded px-2 py-1">
              <span>{archivedAt ? formatDate(archivedAt, 'short') : 'Unknown'}</span>
            </div>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.archived_at ? new Date(rowA.original.archived_at).getTime() : 0
        const b = rowB.original.archived_at ? new Date(rowB.original.archived_at).getTime() : 0
        return b - a
      },
    },
    {
      id: "notes",
      meta: {
        width: "w-[25%]"
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original
        if (getMostRecentNote) {
          return (
            <div className="text-gray-600 text-sm truncate">
              {getMostRecentNote(bid.id)}
            </div>
          )
        }
        return ""
      },
      enableSorting: false,
    },
  ]
}

export function createOnHoldColumns(context: ArchiveColumnsContext = {}): ColumnDef<Bid>[] {
  const { getMostRecentNote } = context

  return [
    {
      id: "project",
      accessorKey: "project_name",
      meta: {
        width: "w-[20%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Project Name" />
      ),
      cell: ({ row }) => {
        const bid = row.original
        
        return (
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-sm truncate">
                {bid.project_name}
              </div>
              {bid.project_address && (
                <div className="text-sm text-gray-500 truncate" title={bid.project_address}>
                  {bid.project_address.length > 40 
                    ? `${bid.project_address.substring(0, 40)}...` 
                    : bid.project_address}
                </div>
              )}
            </div>
        )
      },
    },
    {
      id: "general_contractor",
      accessorKey: "general_contractor",
      meta: {
        width: "w-[12%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="General Contractor" center />
      ),
      cell: ({ row }) => {
        const contractor = row.getValue("general_contractor") as string
        return (
          <div className="flex items-center justify-center text-gray-600 text-sm min-w-0">
            <span 
              className="text-center leading-tight overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word'
              }}
              title={contractor || 'Not specified'}
            >
              {contractor || 'Not specified'}
            </span>
          </div>
        )
      },
    },
    {
      id: "status",
      accessorKey: "status",
      meta: {
        width: "w-[10%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" center />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <div className="flex items-center justify-center">
            <StatusBadge 
              status={status} 
              variant="badge"
              className="min-w-32"
            />
          </div>
        )
      },
    },
    {
      id: "due_date",
      accessorKey: "due_date",
      meta: {
        width: "w-[9%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bid Date" center />
      ),
      cell: ({ row }) => {
        const bid = row.original
        
        return (
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
            <div className="rounded px-2 py-1">
              <span>{formatDate(bid.due_date, "short")}</span>
            </div>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = new Date(rowA.original.due_date).getTime()
        const b = new Date(rowB.original.due_date).getTime()
        return a - b
      },
    },
    {
      id: "onHoldSince",
      accessorKey: "on_hold_at",
      meta: {
        width: "w-[9%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="On Hold" center />
      ),
      cell: ({ row }) => {
        const onHoldAt = row.getValue("onHoldSince") as string
        return (
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
            <div className="rounded px-2 py-1">
              <span>{onHoldAt ? formatDate(onHoldAt, 'short') : 'Unknown'}</span>
            </div>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.on_hold_at ? new Date(rowA.original.on_hold_at).getTime() : 0
        const b = rowB.original.on_hold_at ? new Date(rowB.original.on_hold_at).getTime() : 0
        return a - b
      },
    },
    {
      id: "notes",
      meta: {
        width: "w-[25%]"
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original
        if (getMostRecentNote) {
          return (
            <div className="text-gray-600 text-sm truncate">
              {getMostRecentNote(bid.id)}
            </div>
          )
        }
        return ""
      },
      enableSorting: false,
    },
  ]
}

// APM-specific column functions that match the 4-column layout used in APM Active Projects
export function createAPMOnHoldColumns(context: ArchiveColumnsContext = {}): ColumnDef<Bid>[] {
  const { getMostRecentNote } = context

  return [
    {
      id: "project",
      accessorKey: "title",
      meta: {
        width: "w-[25%]",
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
            </div>
          </div>
        );
      },
    },
    {
      id: "address",
      accessorKey: "project_address",
      meta: {
        width: "w-[22%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Address" />
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const address = bid.project_address;
        return (
          <div className="flex items-center text-gray-600 text-sm min-w-0">
            <span
              className="leading-tight overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                wordBreak: "break-word",
              }}
              title={address || "No address provided"}
            >
              {address || "No address provided"}
            </span>
          </div>
        );
      },
    },
    {
      id: "general_contractor",
      accessorKey: "general_contractor",
      meta: {
        width: "w-[20%]",
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
      id: "gc_system",
      meta: {
        width: "w-[15%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
          GC System
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const gc_system = bid.gc_system;
        switch (gc_system) {
          case "Procore":
            return (
              <div className="flex items-center justify-center text-blue-600 text-sm">
                Procore
              </div>
            );
          case "AutoDesk":
            return (
              <div className="flex items-center justify-center text-purple-600 text-sm">
                AutoDesk
              </div>
            );
          case "Email":
            return (
              <div className="flex items-center justify-center text-green-600 text-sm">
                Email
              </div>
            );
          case "Other":
            return (
              <div className="flex items-center justify-center text-gray-600 text-sm">
                Other
              </div>
            );
          default:
            return (
              <div className="flex items-center justify-center text-gray-400 text-sm">
                N/A
              </div>
            );
        }
      },
      enableSorting: false,
    },
    {
      id: "added_to_procore",
      meta: {
        width: "w-[15%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
          Added to Procore
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const validProcore = bid.added_to_procore;
        if (validProcore) {
          return (
            <div className="flex items-center justify-center text-green-600 text-sm">
              Yes
            </div>
          );
        } else {
          return (
            <div className="flex items-center justify-center text-red-600 text-sm">
              No
            </div>
          );
        }
      },
      enableSorting: false,
    },
    {
      id: "notes",
      meta: {
        width: "w-[33%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        if (getMostRecentNote) {
          return (
            <div className="text-gray-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {getMostRecentNote(bid.id)}
            </div>
          )
        }
        return "";
      },
      enableSorting: false,
    },
  ];
}

export function createAPMArchiveColumns(context: ArchiveColumnsContext = {}): ColumnDef<Bid>[] {
  const { getMostRecentNote } = context

  return [
    {
      id: "project",
      accessorKey: "title",
      meta: {
        width: "w-[25%]",
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
            </div>
          </div>
        );
      },
    },
    {
      id: "address",
      accessorKey: "project_address",
      meta: {
        width: "w-[22%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Address" />
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const address = bid.project_address;
        return (
          <div className="flex items-center text-gray-600 text-sm min-w-0">
            <span
              className="leading-tight overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                wordBreak: "break-word",
              }}
              title={address || "No address provided"}
            >
              {address || "No address provided"}
            </span>
          </div>
        );
      },
    },
    {
      id: "general_contractor",
      accessorKey: "general_contractor",
      meta: {
        width: "w-[20%]",
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
      id: "gc_system",
      meta: {
        width: "w-[15%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
          GC System
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const gc_system = bid.gc_system;
        switch (gc_system) {
          case "Procore":
            return (
              <div className="flex items-center justify-center text-blue-600 text-sm">
                Procore
              </div>
            );
          case "AutoDesk":
            return (
              <div className="flex items-center justify-center text-purple-600 text-sm">
                AutoDesk
              </div>
            );
          case "Email":
            return (
              <div className="flex items-center justify-center text-green-600 text-sm">
                Email
              </div>
            );
          case "Other":
            return (
              <div className="flex items-center justify-center text-gray-600 text-sm">
                Other
              </div>
            );
          default:
            return (
              <div className="flex items-center justify-center text-gray-400 text-sm">
                N/A
              </div>
            );
        }
      },
      enableSorting: false,
    },
    {
      id: "added_to_procore",
      meta: {
        width: "w-[15%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
          Added to Procore
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        const validProcore = bid.added_to_procore;
        if (validProcore) {
          return (
            <div className="flex items-center justify-center text-green-600 text-sm">
              Yes
            </div>
          );
        } else {
          return (
            <div className="flex items-center justify-center text-red-600 text-sm">
              No
            </div>
          );
        }
      },
      enableSorting: false,
    },
    {
      id: "notes",
      meta: {
        width: "w-[33%]",
      },
      header: () => (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </div>
      ),
      cell: ({ row }) => {
        const bid = row.original;
        if (getMostRecentNote) {
          return (
            <div className="text-gray-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {getMostRecentNote(bid.id)}
            </div>
          )
        }
        return "";
      },
      enableSorting: false,
    },
  ];
}