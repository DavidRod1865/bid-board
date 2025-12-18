import { type ColumnDef } from "@tanstack/table-core";
import type { Bid, ProjectNote, User } from "../../types";
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header";
import StatusBadge from "../../components/ui/StatusBadge";
import { getBidUrgency, formatDate, formatRelativeDate } from "../../utils/formatters";
import { BID_STATUSES } from "../../utils/constants";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import DialogModal from "../../components/ui/DialogModal";
import { useToast } from "../../hooks/useToast";
import { dbOperations } from "../supabase";

// Simplified BidVendor structure that's actually passed from components
interface SimpleBidVendor {
  bid_id: number;
  response_received_date?: string | null;
  cost_amount?: string | number | null;
  is_priority: boolean;
  assigned_apm_user?: string | null;
}

interface BidColumnsContext {
  bidVendors?: SimpleBidVendor[];
  projectNotes?: ProjectNote[];
  onStatusChange?: (bidId: number, newStatus: string) => Promise<void>;
  statusErrors?: Map<number, string>;
  isOperationLoading?: (bidId: number) => boolean;
  showEstimatingColumns?: boolean;
  onAddedToProcoreChange?: (bidId: number, checked: boolean) => Promise<void>;
  onProjectNameClick?: (bidId: number) => void;
  useAPMRouting?: boolean;
  apmUsers?: User[];
}

// Component to handle notes with clickable modal
const NotesCell: React.FC<{ 
  notes: ProjectNote[]; 
  projectName: string;
  truncateLength?: number;
}> = ({ 
  notes, 
  projectName,
  truncateLength = 80 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedNotes = notes.sort(
    (a: ProjectNote, b: ProjectNote) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const firstNote = sortedNotes[0]?.content || "";
  const hasMultipleNotes = sortedNotes.length > 1;
  const isTruncated = firstNote.length > truncateLength;
  const showClickable = hasMultipleNotes || isTruncated;

  if (notes.length === 0) return null;

  return (
    <>
      <div
        className={`text-gray-600 text-xs truncate flex items-center gap-1 ${showClickable ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          if (showClickable) {
            e.stopPropagation();
            setIsModalOpen(true);
          }
        }}
      >
        {hasMultipleNotes && (
          <>
            <DocumentTextIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium flex-shrink-0">{sortedNotes.length} Notes - </span>
          </>
        )}
        <span className="truncate">{firstNote}</span>
      </div>
      <DialogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={projectName}
        size="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {sortedNotes.map((note, index) => (
            <div key={note.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-[#d4af37]">
              <div className="whitespace-pre-wrap break-words text-sm text-gray-900 mb-2">
                {note.content}
              </div>
              <div className="text-xs text-gray-500">
                {formatRelativeDate(note.created_at)}
              </div>
            </div>
          ))}
        </div>
      </DialogModal>
    </>
  );
};

interface EditableAssignmentCellProps {
  bid: Bid;
  value: string;
  field: "apm" | "pm";
  apmUsers?: User[];
}

const EditableAssignmentCell: React.FC<EditableAssignmentCellProps> = ({
  bid,
  value,
  field,
  apmUsers = [],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value === "-" ? "" : value);
  const [displayValue, setDisplayValue] = useState(value === "-" ? "" : value);
  const [isSaving, setIsSaving] = useState(false);
  const { showError } = useToast();

  // Keep local display state in sync if parent value changes (e.g. real-time updates)
  useEffect(() => {
    const normalized = value === "-" ? "" : value;
    setDisplayValue(normalized);
    if (!isEditing) {
      setInputValue(normalized);
    }
  }, [value, isEditing]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    const normalized = value === "-" ? "" : value;
    setInputValue(normalized);
    setDisplayValue(normalized);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const trimmed = inputValue.trim();

    // If nothing changed, just exit edit mode
    if ((trimmed || "-") === (value || "-")) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Update the correct field based on whether this is APM or PM
      const updateData = field === "pm" 
        ? { assigned_pm: trimmed || null }
        : { assign_to: trimmed || null };
      
      await dbOperations.updateAPMProject(bid.id, updateData);
      setDisplayValue(trimmed);
      // Let the real-time subscription handle the data refresh to avoid race conditions
      // The optimistic update above will show immediate feedback
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update assignment:", error);
      showError(
        "Update Failed",
        error instanceof Error ? error.message : "Failed to update assignment"
      );
      handleCancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void handleSave();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      handleCancelEdit();
    }
  };

  if (isEditing) {
    // For APM field, show dropdown of APM users
    if (field === "apm" && apmUsers.length > 0) {
      const handleSelectChange: React.ChangeEventHandler<HTMLSelectElement> = (
        event,
      ) => {
        const selectedId = event.target.value;
        setInputValue(selectedId);
        void (async () => {
          setIsSaving(true);
          try {
            // APM field always updates assign_to since this is APM dropdown logic
            await dbOperations.updateAPMProject(bid.id, {
              assign_to: selectedId || null,
            });
            const selectedUser =
              apmUsers.find(
                (u) => u.id === selectedId || u.id.toString() === selectedId,
              ) || null;
            setDisplayValue(selectedUser?.name || "");
            // Let the real-time subscription handle the data refresh to avoid race conditions
            setIsEditing(false);
          } catch (error) {
            console.error("Failed to update APM assignment:", error);
            showError(
              "Update Failed",
              error instanceof Error
                ? error.message
                : "Failed to update APM assignment",
            );
            handleCancelEdit();
          } finally {
            setIsSaving(false);
          }
        })();
      };

      const currentId = (bid.assign_to ?? bid.assigned_to ?? "").toString();

      return (
        <div
          className="flex items-center justify-center text-gray-600 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            autoFocus
            className="w-full max-w-[110px] px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            value={currentId}
            onChange={handleSelectChange}
            onBlur={() => {
              // If user blurs without change, just close editor
              setIsEditing(false);
            }}
          >
            <option value="">Unassigned</option>
            {apmUsers.map((user) => (
              <option key={user.id} value={user.id.toString()}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // For PM (or if no APM users), fall back to text input
    return (
      <div
        className="flex items-center justify-center text-gray-600 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          className="w-full max-w-[90px] px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center text-gray-600 text-sm"
    >
      {displayValue || "-"}
    </div>
  );
};

export function createBidColumns(
  context: BidColumnsContext = {}
): ColumnDef<Bid>[] {
  const {
    bidVendors = [],
    projectNotes = [],
    onStatusChange,
    statusErrors,
    isOperationLoading,
    showEstimatingColumns = false,
    onProjectNameClick,
    useAPMRouting = false,
    apmUsers = [],
  } = context;

  if (showEstimatingColumns) {
    // Original Estimating columns
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
                <div 
                  className={`font-medium text-xs truncate ${onProjectNameClick ? 'cursor-pointer' : 'text-gray-900'}`}
                  onClick={(e) => {
                    if (onProjectNameClick) {
                      e.stopPropagation();
                      onProjectNameClick(bid.id);
                    }
                  }}
                >
                  {bid.title}
                </div>
                <div className="text-gray-600 text-xs truncate">
                  {bid.project_address || "No address provided"}
                </div>
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
            <div className="flex items-center justify-center text-gray-600 text-xs min-w-0">
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
          const isUpdating = isOperationLoading?.(bid.id) || false;
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
            <div className="flex items-center justify-center gap-2 text-gray-600 text-xs">
              <div
                className={`rounded px-2 py-1 ${
                  urgency.level === "overdue"
                    ? "border-2 border-red-500 text-red-600"
                    : urgency.level === "dueToday"
                    ? "border-2 border-orange-500 text-orange-600"
                    : "text-gray-700"
                }`}
              >
                {formatDate(bid.due_date)}
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
          // Calculate vendor response rate for priority vendors only
          const projectBidVendors = bidVendors.filter(
            (bv: SimpleBidVendor) => bv.bid_id === bid.id && bv.is_priority === true
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
                  <span className="font-medium text-gray-900 text-xs">
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
          return <NotesCell notes={bidNotes} projectName={bid.title} truncateLength={60} />;
        },
        enableSorting: false,
      },
    ];
  } else {
    // APM simplified columns
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
          const address = bid.project_address;

          return (
            <div className="flex items-center gap-3 min-w-0 flex-1 relative">
              <div className="min-w-0 flex-1">
                <div 
                  className={`font-medium text-xs truncate ${onProjectNameClick ? 'cursor-pointer' : 'text-gray-900'}`}
                  onClick={(e) => {
                    if (onProjectNameClick) {
                      e.stopPropagation();
                      onProjectNameClick(bid.id);
                    }
                  }}
                >
                  {bid.title}
                </div>
                <div className="text-gray-600 text-xs truncate">
                  {address || "No address provided"}
                </div>
              </div>
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
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <span
                className="text-center whitespace-nowrap overflow-hidden text-ellipsis"
                title={contractor || "Not specified"}
              >
                {contractor || "Not specified"}
              </span>
            </div>
          );
        },
      },
      {
        id: "apm",
        accessorFn: (bid) => {
          // First check the project's assign_to field (updated by modals)
          const projectAssignTo = bid.assign_to || bid.assigned_to;
          if (projectAssignTo) {
            const apmUser = apmUsers.find(u => u.id === projectAssignTo || u.id.toString() === projectAssignTo);
            return apmUser?.name || projectAssignTo;
          }
          
          // Fall back to BidVendor records if project assign_to is not set
          const projectBidVendors = bidVendors?.filter(bv => bv.bid_id === bid.id) || [];
          const apmAssignments = projectBidVendors
            .map(bv => bv.assigned_apm_user)
            .filter((apm): apm is string => Boolean(apm));
          
          if (apmAssignments.length === 0) return "-";
          if (apmAssignments.length === 1) {
            const apmUser = apmUsers.find(u => u.id === apmAssignments[0] || u.id.toString() === apmAssignments[0]);
            return apmUser?.name || apmAssignments[0];
          }
          
          // Multiple APM assignments - check if they're all the same
          const uniqueAssignments = [...new Set(apmAssignments)];
          if (uniqueAssignments.length === 1) {
            const apmUser = apmUsers.find(u => u.id === uniqueAssignments[0] || u.id.toString() === uniqueAssignments[0]);
            return apmUser?.name || uniqueAssignments[0];
          }
          
          return "Multiple APMs";
        },
        meta: {
          width: "w-[12%]",
        },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="APM"
            center
          />
        ),
        cell: ({ row }) => {
          const apm = row.getValue("apm") as string;
          return (
            <div className="flex items-center justify-center text-sm text-gray-900">
              <span
                className="text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
                title={apm}
              >
                {apm}
              </span>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "pm",
        accessorKey: "assigned_pm",
        meta: {
          width: "w-[12%] min-w-[100px]",
        },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="PM"
            center
          />
        ),
        cell: ({ row }) => {
          const bid = row.original;
          // Project Manager assignment - use assigned_pm field
          const pm = (bid.assigned_pm ?? "").trim() || "-";

          return <EditableAssignmentCell bid={bid} value={pm} field="pm" />;
        },
        enableSorting: true,
      },
      {
        id: "gc_system",
        meta: {
          width: "w-[10%]",
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
                <div className="flex items-center justify-center text-orange-600-600 text-sm">
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
        id: "binder",
        meta: {
          width: "w-[100px]",
        },
        header: () => (
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
            Binder
          </div>
        ),
        cell: ({ row }) => {
          const bid = row.original;
          const hasBinder = bid.binder; // boolean
          if (hasBinder) {
            return (
              <div className="flex items-center justify-center text-green-600">
                <CheckIcon className="h-5 w-5" />
              </div>
            );
          } else {
            return (
              <div className="flex items-center justify-center text-red-600">
                <XMarkIcon className="h-5 w-5" />
              </div>
            );
          }
        },
        enableSorting: false,
      },
      {
        id: "project_start_date",
        accessorKey: "project_start_date",
        meta: {
          width: "w-[110px]",
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Start Date" center />
        ),
        cell: ({ row }) => {
          const bid = row.original;
          return (
            <div className="flex items-center justify-center text-gray-600 text-sm">
              {bid.project_start_date ? formatDate(bid.project_start_date) : '-'}
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.project_start_date ? new Date(rowA.original.project_start_date).getTime() : 0;
          const b = rowB.original.project_start_date ? new Date(rowB.original.project_start_date).getTime() : 0;
          return a - b;
        },
      },
      {
        id: "added_to_procore",
        meta: {
          width: "w-[130px]",
        },
        header: () => (
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
            Added to Procore
          </div>
        ),
        cell: ({ row }) => {
          const bid = row.original;
          const validProcore = bid.added_to_procore; // boolean
          if (validProcore) {
            return (
              <div className="flex items-center justify-center text-green-600">
                <CheckIcon className="h-5 w-5" />
              </div>
            );
          } else {
            return (
              <div className="flex items-center justify-center text-red-600">
                <XMarkIcon className="h-5 w-5" />
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
          const bidNotes = projectNotes.filter(
            (note: ProjectNote) => note.bid_id === bid.id
          );
          return <NotesCell notes={bidNotes} projectName={bid.title} />;
        },
        enableSorting: false,
      },
    ];
  }
}
