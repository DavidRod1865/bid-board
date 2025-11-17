import React, { useState, useRef, useEffect } from "react";
import { DateRangePicker } from "react-date-range";
import type { RangeKeyDict } from "react-date-range";
import { 
  TrashIcon, 
  PlusIcon, 
  DocumentDuplicateIcon, 
  EnvelopeIcon,
  ChevronDownIcon,
  PauseIcon,
  ArchiveBoxIcon,
  PaperAirplaneIcon 
} from "@heroicons/react/24/outline";
import { Input } from "./FormField";
import { Button } from "./Button";
import StatusBadge from "./StatusBadge";
import { BID_STATUSES } from "../../utils/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface PageHeaderProps {
  title: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string[];
  setStatusFilter?: (statuses: string[]) => void;
  dateRange?: { startDate: Date | null; endDate: Date | null };
  setDateRange?: (range: {
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
  overdueFilter?: boolean;
  setOverdueFilter?: (overdue: boolean) => void;
  overdueCount?: number;
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
  actionButton?: {
    label: string;
    onClick: () => void;
    color?: "green" | "blue" | "yellow";
  };
  secondaryActionButton?: {
    label: string;
    onClick: () => void;
    color?: "green" | "blue" | "yellow";
  };
  tertiaryActionButton?: {
    label: string;
    onClick: () => void;
    color?: "green" | "blue" | "yellow";
    disabled?: boolean;
  };
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

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  searchTerm,
  setSearchTerm,
  searchPlaceholder = "Search...",
  statusFilter = [],
  setStatusFilter = () => {},
  dateRange = { startDate: null, endDate: null },
  setDateRange = () => {},
  overdueFilter = false,
  setOverdueFilter = () => {},
  overdueCount = 0,
  showStatusFilter = true,
  showDateFilter = true,

  actionButton,
  secondaryActionButton,
  tertiaryActionButton,
  bulkActions,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDatePicker]);

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter([]);
    setDateRange({ startDate: null, endDate: null });
    setOverdueFilter(false);
    setShowDatePicker(false);
  };

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

  const handleDateRangeChange = (ranges: RangeKeyDict) => {
    const { selection } = ranges;
    setDateRange({
      startDate: selection.startDate || null,
      endDate: selection.endDate || null,
    });
  };

  const formatDateRange = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return "Pick a date range...";
    }

    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    if (dateRange.startDate && dateRange.endDate) {
      if (
        dateRange.startDate.toDateString() === dateRange.endDate.toDateString()
      ) {
        return formatDate(dateRange.startDate);
      }
      return `${formatDate(dateRange.startDate)} - ${formatDate(
        dateRange.endDate
      )}`;
    }

    if (dateRange.startDate) {
      return `From ${formatDate(dateRange.startDate)}`;
    }

    if (dateRange.endDate) {
      return `Until ${formatDate(dateRange.endDate)}`;
    }

    return "Select date range";
  };

  return (
    <div className="bg-gray-50">
      {/* Top Row: Search, Date Picker, Reset */}
      <div className="px-6 py-4">
        <div className="flex gap-3">
          {/* Search Field */}
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-64 max-w-96 text-gray-500"
          />

          {/* Date Picker */}
          {showDateFilter && (
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-52 px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-0 focus:ring-[#d4af37] focus:border-[#d4af37] text-left transition-colors"
              >
                {formatDateRange()}
              </button>

              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <DateRangePicker
                    ranges={[
                      {
                        startDate: dateRange.startDate || new Date(),
                        endDate: dateRange.endDate || new Date(),
                        key: "selection",
                      },
                    ]}
                    onChange={handleDateRangeChange}
                    moveRangeOnFirstSelection={false}
                    months={1}
                    direction="horizontal"
                    rangeColors={["#d4af37"]}
                  />
                  <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setDateRange({ startDate: null, endDate: null });
                        setShowDatePicker(false);
                      }}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="px-3 py-1 text-sm bg-[#d4af37] text-white rounded hover:bg-[#c19b26]"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset Button */}
          <Button className="bg-gray-500 text-white hover:bg-gray-600" size="default" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Full-width line */}
      <div className="border-b border-gray-200"></div>

      {/* Main Header: Title, Action Buttons, Bulk Actions, Overdue Filter, Status Tabs */}
      <div className="px-6 pt-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="items-center">
            <h1 className="text-2xl h-10 font-bold text-gray-900">{title}</h1> 
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Regular Action Buttons - show when no bulk actions are active */}
            {!(bulkActions && bulkActions.selectedCount > 0) && (
              <>
                {/* Action Button */}
                {actionButton && (
                  <button
                    onClick={actionButton.onClick}
                    className={`
                  inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    actionButton.color === "green"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : actionButton.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : actionButton.color === "yellow"
                      ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                      : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  }
                    `}
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {actionButton.label}
                  </button>
                )}

                {/* Secondary Action Button */}
                {secondaryActionButton && (
                  <button
                    onClick={secondaryActionButton.onClick}
                    className={`
                  inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    secondaryActionButton.color === "green"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : secondaryActionButton.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : secondaryActionButton.color === "yellow"
                      ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                  }
                    `}
                  >
                    {secondaryActionButton.color === "blue" ? (
                      <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                    ) : (
                      <PlusIcon className="w-5 h-5 mr-2" />
                    )}
                    {secondaryActionButton.label}
                  </button>
                )}

                {/* Tertiary Action Button */}
                {tertiaryActionButton && (
                  <button
                    onClick={tertiaryActionButton.onClick}
                    disabled={tertiaryActionButton.disabled}
                    className={`
                  inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${tertiaryActionButton.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  ${
                    tertiaryActionButton.color === "green"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : tertiaryActionButton.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : tertiaryActionButton.color === "yellow"
                      ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                      : "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                  }
                    `}
                  >
                    <EnvelopeIcon className="w-5 h-5 mr-2" />
                    {tertiaryActionButton.label}
                  </button>
                )}
              </>
            )}

            {/* Bulk Actions Dropdown - show when bulk actions are active */}
            {bulkActions && bulkActions.selectedCount > 0 && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap">
                      Bulk Actions ({bulkActions.selectedCount})
                      <ChevronDownIcon className="w-4 h-4 ml-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {bulkActions.actions.map((action, index) => {
                      const getActionIcon = (label: string) => {
                        if (label.toLowerCase().includes('hold')) return <PauseIcon className="w-4 h-4" />;
                        if (label.toLowerCase().includes('archive')) return <ArchiveBoxIcon className="w-4 h-4" />;
                        if (label.toLowerCase().includes('apm') || label.toLowerCase().includes('send')) return <PaperAirplaneIcon className="w-4 h-4" />;
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
                        {bulkActions.actions.length > 0 && <DropdownMenuSeparator />}
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
              </div>
            )}
          </div>

          {/* Overdue Items Filter */}
          {overdueCount > 0 && (
            <button
              onClick={() => setOverdueFilter(!overdueFilter)}
              className={`
                px-3 py-2 text-sm border rounded-md font-medium transition-all duration-200
                ${
                  overdueFilter
                    ? "bg-red-600 text-white border-red-600 hover:bg-red-800"
                    : "bg-red-500 text-white border-red-500 hover:bg-red-600"
                }
              `}
            >
              {overdueCount} Overdue Items
            </button>
          )}
        </div>

        {/* Bottom Row: Status Tab Filters */}
        {showStatusFilter && (
          <div className="border-b border-gray-200 bg-gray-50 -mx-6 px-6">
            <nav 
              role="tablist" 
              aria-label="Filter projects by status"
              className="-mb-px flex space-x-8"
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
                  id={`status-tab-${status.toLowerCase().replace(/\s+/g, '-')}`}
                  status={status}
                  variant="tab"
                  isActive={statusFilter.length === 1 && statusFilter[0] === status}
                  ariaControls="projects-table"
                  onClick={() => handleStatusFilter(status)}
                />
              ))}
            </nav>
            {/* Screen reader announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {statusFilter.length === 0 
                ? "Showing all projects" 
                : `Showing projects with ${statusFilter[0]} status`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
