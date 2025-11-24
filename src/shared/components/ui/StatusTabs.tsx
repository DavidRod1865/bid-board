import React from 'react';
import StatusBadge from './StatusBadge';
import { BID_STATUSES } from '../../utils/constants';
import { 
  PlusIcon, 
  DocumentDuplicateIcon,
  TrashIcon,
  ChevronDownIcon,
  PauseIcon,
  ArchiveBoxIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface StatusTabsProps {
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  overdueFilter?: boolean;
  setOverdueFilter?: (overdue: boolean) => void;
  overdueCount?: number;
  onNewProject?: () => void;
  onCopyProject?: () => void;
  bulkActions?: {
    selectedCount: number;
    actions: Array<{
      label: string;
      onClick: () => void;
      color?: "blue" | "yellow" | "orange";
    }>;
    onDelete?: () => void;
  };
}

const StatusTabs: React.FC<StatusTabsProps> = ({
  statusFilter,
  setStatusFilter,
  overdueFilter = false,
  setOverdueFilter = () => {},
  overdueCount = 0,
  onNewProject,
  onCopyProject,
  bulkActions,
}) => {
  const handleStatusFilter = (status: string) => {
    // Only allow single selection - if clicking the same status, clear it
    if (statusFilter.length === 1 && statusFilter[0] === status) {
      setStatusFilter([]);
    } else {
      setStatusFilter([status]);
    }
  };

  const handleClearAllStatuses = () => {
    setStatusFilter([]);
  };

  return (
    <div className="rounded-t-xl border-b border-gray-200 bg-gray-50">
      <div className="px-6 flex items-end justify-between">
        {/* Status Filter Tabs */}
        <nav
          role="tablist"
          aria-label="Filter projects by status"
          className="flex space-x-8"
        >
          <button
            role="tab"
            aria-selected={statusFilter.length === 0}
            aria-controls="projects-table"
            aria-label="Show all projects"
            tabIndex={statusFilter.length === 0 ? 0 : -1}
            onClick={handleClearAllStatuses}
            className={`py-3 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-200 ${
              statusFilter.length === 0
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All
          </button>

          {BID_STATUSES.map((status) => (
            <StatusBadge
              key={status}
              id={`status-tab-${status.toLowerCase().replace(/\s+/g, "-")}`}
              status={status}
              variant="tab"
              isActive={
                statusFilter.length === 1 && statusFilter[0] === status
              }
              ariaControls="projects-table"
              onClick={() => handleStatusFilter(status)}
            />
          ))}
        </nav>

        {/* Action Buttons, Bulk Actions, and Overdue Filter */}
        <div className="flex py-3 gap-2 items-center">
          {/* Regular Action Buttons - show when no bulk actions are active */}
          {!(bulkActions && bulkActions.selectedCount > 0) && (
            <>
              {/* New Button */}
              {onNewProject && (
                <button
                  onClick={onNewProject}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New
                </button>
              )}

              {/* Copy Button */}
              {onCopyProject && (
                <button
                  onClick={onCopyProject}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                  Copy
                </button>
              )}
            </>
          )}

          {/* Bulk Actions Dropdown - show when bulk actions are active */}
          {bulkActions && bulkActions.selectedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap">
                  Bulk Actions ({bulkActions.selectedCount})
                  <ChevronDownIcon className="w-4 h-4 ml-2" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {bulkActions.actions.map((action, index) => {
                  const getActionIcon = (label: string) => {
                    if (label.toLowerCase().includes("hold"))
                      return <PauseIcon className="w-4 h-4" />;
                    if (label.toLowerCase().includes("archive"))
                      return <ArchiveBoxIcon className="w-4 h-4" />;
                    if (
                      label.toLowerCase().includes("apm") ||
                      label.toLowerCase().includes("send")
                    )
                      return <PaperAirplaneIcon className="w-4 h-4" />;
                    return <DocumentDuplicateIcon className="w-4 h-4" />;
                  };

                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.onClick}
                      className="cursor-pointer"
                    >
                      {getActionIcon(action.label)}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}

                {/* Separator before delete if delete action exists and there are other actions */}
                {bulkActions.onDelete && (
                  <>
                    {bulkActions.actions.length > 0 && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      onClick={bulkActions.onDelete}
                      variant="destructive"
                      className="cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Overdue Items Filter */}
          {overdueCount > 0 && (
            <button
              onClick={() => setOverdueFilter(!overdueFilter)}
              className={`
                px-3 py-2 text-sm border rounded-md font-medium transition-all duration-200
                ${overdueFilter 
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-800' 
                  : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                }
              `}
            >
              {overdueCount} Overdue Items
            </button>
          )}
        </div>
      </div>
      
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusFilter.length === 0
          ? "Showing all projects"
          : `Showing projects with ${statusFilter[0]} status`}
      </div>
    </div>
  );
};

export default StatusTabs;