import React, { useState, useRef, useEffect } from "react";
import { DateRangePicker } from "react-date-range";
import type { RangeKeyDict } from "react-date-range";
import { TrashIcon, PlusIcon, DocumentDuplicateIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { Input } from "../ui/FormField";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";
import { BID_STATUSES } from "../../utils/constants";
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
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter((s) => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
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
      {/* Title Section */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* Full-width line */}
      <div className="border-b border-gray-200"></div>

      {/* Filters and Actions Section */}
      <div className="px-6 py-4 space-y-4">
        {/* Top Row: Search, Date Picker, Reset (left) | Create Button (right) */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
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
            <Button variant="secondary" size="md" onClick={handleReset}>
              Reset
            </Button>

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

          <div className="relative flex gap-2 flex-shrink-0">
            {/* Primary Action Buttons Container */}
            <div className={`flex gap-2 ${
              bulkActions && bulkActions.selectedCount > 0 
                ? 'mr-4' // Small margin when bulk actions are shown
                : 'mr-0'
            }`}>
              {/* Action Button - hide when bulk actions are active */}
              {actionButton && !(bulkActions && bulkActions.selectedCount > 0) && (
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

              {/* Secondary Action Button - hide when bulk actions are active */}
              {secondaryActionButton && !(bulkActions && bulkActions.selectedCount > 0) && (
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

              {/* Tertiary Action Button - hide when bulk actions are active */}
              {tertiaryActionButton && !(bulkActions && bulkActions.selectedCount > 0) && (
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
              
              {/* Invisible spacer when no action buttons - ensures margin transition works */}
              {!actionButton && !secondaryActionButton && !tertiaryActionButton && (
                <div className="w-0 h-10"></div>
              )}
            </div>
            {/* Bulk Actions Container - positioned absolutely to avoid layout jumps */}
            {bulkActions && bulkActions.selectedCount > 0 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-2 items-center">
                {/* Individual Bulk Action Buttons */}
                {bulkActions.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap ${
                      action.color === "blue"
                        ? "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
                        : action.color === "yellow"
                        ? "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500"
                        : "bg-orange-500 hover:bg-orange-600 focus:ring-orange-500"
                    }`}
                  >
                    {action.label} ({bulkActions.selectedCount})
                  </button>
                ))}

                {/* Delete Button */}
                {bulkActions.onDelete && (
                  <button
                    onClick={bulkActions.onDelete}
                    className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 whitespace-nowrap"
                    title={`Delete ${bulkActions.selectedCount} selected items`}
                  >
                    <TrashIcon className="w-5 h-5 mr-2" />
                    Delete ({bulkActions.selectedCount})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Status Badge Filters */}
        {showStatusFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <div
              onClick={handleClearAllStatuses}
              className={`
              px-3 py-1 w-30 rounded-full text-center text-xs font-medium transition-all duration-200 border cursor-pointer
              ${
                statusFilter.length === 0
                  ? "bg-[#d4af37] text-white border-2 border-black"
                  : "bg-[#d4af37] text-gray-700 border-gray-300 opacity-55 hover:opacity-70"
              }
            `}
            >
              All
            </div>

            {BID_STATUSES.map((status) => (
              <StatusBadge
                key={status}
                status={status}
                variant="badge"
                onClick={() => handleStatusFilter(status)}
                className={`
                cursor-pointer transition-all duration-200 border w-30
                ${
                  statusFilter.includes(status)
                    ? " opacity-100 border-black border-2"
                    : "bg-gray-100 !text-gray-700 border-gray-300 hover:bg-gray-200 opacity-55 hover:opacity-70"
                }
              `}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
