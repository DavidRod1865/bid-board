import React, { useState, useRef, useEffect } from "react";
import { DateRangePicker } from "react-date-range";
import type { RangeKeyDict } from "react-date-range";
import {
  TrashIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  PauseIcon,
  ArchiveBoxIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { Input } from "./FormField";
import { Button } from "./Button";
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
  exportButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  reportsDropdown?: {
    reports: Array<{
      label: string;
      onClick: () => void;
      disabled?: boolean;
      isLoading?: boolean;
    }>;
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
  exportButton,
  reportsDropdown,
  bulkActions,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Detect when container is too narrow for button text
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Switch to icon-only mode when container is less than 800px wide
        setIsCompact(width < 800);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter([]);
    setDateRange({ startDate: null, endDate: null });
    setOverdueFilter(false);
    setShowDatePicker(false);
  };

  const handleStatusFilter = (tab: string) => {
    // "Open Jobs" shows all items (empty filter)
    if (tab === "Open Jobs") {
      setStatusFilter([]);
    } else {
      // For other tabs, toggle the filter - if clicking the same tab, clear it
      if (statusFilter.length === 1 && statusFilter[0] === tab) {
        setStatusFilter([]);
      } else {
        setStatusFilter([tab]);
      }
    }
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
    <div className="bg-slate-100 min-w-0">
      {/* Single Row: Search, Date Picker, Reset, and Action Buttons */}
      <div className="px-6 py-4 min-w-0" ref={containerRef}>
        <div className="flex items-center justify-between gap-4 flex-wrap min-w-0" style={{ rowGap: '0.5rem' }}>
          {/* Left Side: Search, Date Picker, Reset */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Field */}
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-72 flex-shrink-0 py-2 text-sm text-gray-500 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-0 focus:ring-[#d4af37] focus:border-[#d4af37] text-left transition-colors"
            />

            {/* Date Picker */}
            {showDateFilter && (
              <div className="relative flex-shrink-0" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-56 px-3 py-2 text-sm text-gray-400 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-0 focus:ring-[#d4af37] focus:border-[#d4af37] text-left transition-colors"
                >
                  {formatDateRange()}
                </button>

                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-300 rounded shadow-lg">
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
                      <Button
                        size="default"
                        onClick={() => {
                          setDateRange({ startDate: null, endDate: null });
                          setShowDatePicker(false);
                        }}
                        className="px-3 py-1 text-sm text-white hover:bg-gray-500 bg-gray-400"
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={() => setShowDatePicker(false)}
                        size="default"
                        className="px-3 py-1 text-sm bg-[#d4af37] text-white hover:bg-[#c19b26]"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reset Button */}
            <Button
              className="bg-gray-500 text-white hover:bg-gray-600"
              size="default"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>

          {/* Right Side: Action Buttons */}
          <div className="flex gap-2 flex-wrap min-w-0">
            {/* Regular Action Buttons - show when no bulk actions are active */}
            {!(bulkActions && bulkActions.selectedCount > 0) && (
              <>
                {/* Action Button */}
                {actionButton && (
                  <Button
                    onClick={actionButton.onClick}
                    size="default"
                    className={`
                  inline-flex items-center justify-center border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
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
                    title={actionButton.label}
                  >
                    <PlusIcon className={`w-5 h-5 ${!isCompact ? "mr-2" : ""}`} />
                    {!isCompact && <span>{actionButton.label}</span>}
                  </Button>
                )}

                {/* Reports Dropdown */}
                {reportsDropdown && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center justify-center px-4 h-9 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                        title="Release Report"
                      >
                        {!isCompact && <span>Release Report</span>}
                        {isCompact && <span>Report</span>}
                        <ChevronDownIcon className="w-4 h-4 ml-2" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {reportsDropdown.reports.map((report, index) => (
                        <DropdownMenuItem
                          key={index}
                          onClick={report.onClick}
                          disabled={report.disabled || report.isLoading}
                          className="cursor-pointer"
                        >
                          {report.isLoading ? (
                            <>
                              <span className="mr-2">⏳</span>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              {index === reportsDropdown.reports.length - 1 && (
                                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                              )}
                              {index !== reportsDropdown.reports.length - 1 && (
                                <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                              )}
                              {report.label}
                            </>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Secondary Action Button - fallback if reportsDropdown not used */}
                {!reportsDropdown && secondaryActionButton && (
                  <Button
                    onClick={secondaryActionButton.onClick}
                    size="default"
                    className={`
                  inline-flex items-center justify-center border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
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
                    title={secondaryActionButton.label}
                  >
                    {secondaryActionButton.color === "blue" ? (
                      <DocumentDuplicateIcon className={`w-5 h-5 ${!isCompact ? "mr-2" : ""}`} />
                    ) : (
                      <PlusIcon className={`w-5 h-5 ${!isCompact ? "mr-2" : ""}`} />
                    )}
                    {!isCompact && <span>{secondaryActionButton.label}</span>}
                  </Button>
                )}

                {/* Tertiary Action Button - fallback if reportsDropdown not used */}
                {!reportsDropdown && tertiaryActionButton && (
                  <Button
                    onClick={tertiaryActionButton.onClick}
                    size="default"
                    disabled={tertiaryActionButton.disabled}
                    className={`
                  inline-flex items-center justify-center border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    tertiaryActionButton.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                  ${
                    tertiaryActionButton.color === "green"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : tertiaryActionButton.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : tertiaryActionButton.color === "yellow"
                      ? "bg-orange-500 hover:bg-orange-600 focus:ring-orange-500"
                      : "bg-orange-500 hover:bg-orange-600 focus:ring-orange-500"
                  }
                    `}
                    title={tertiaryActionButton.label}
                  >
                    <ArrowDownTrayIcon className={`w-5 h-5 ${!isCompact ? "mr-2" : ""}`} />
                    {!isCompact && <span>{tertiaryActionButton.label}</span>}
                  </Button>
                )}

                {/* Export Button */}
                {exportButton && (
                  <Button
                    onClick={exportButton.onClick}
                    size="default"
                    disabled={exportButton.disabled}
                    className={`
                  inline-flex items-center justify-center border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500
                  ${
                    exportButton.disabled
                      ? "bg-yellow-300 cursor-not-allowed"
                      : "bg-yellow-500 hover:bg-yellow-600"
                  }
                    `}
                    title={exportButton.label}
                  >
                    <ArrowDownTrayIcon className={`w-5 h-5 ${!isCompact ? "mr-2" : ""}`} />
                    {!isCompact && <span>{exportButton.label}</span>}
                  </Button>
                )}
              </>
            )}

            {/* Bulk Actions Dropdown - show when bulk actions are active */}
            {bulkActions && bulkActions.selectedCount > 0 && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center justify-center px-4 h-9 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap" title={`Bulk Actions (${bulkActions.selectedCount})`}>
                      {isCompact ? (
                        <>
                          <span>({bulkActions.selectedCount})</span>
                          <ChevronDownIcon className="w-4 h-4 ml-1" />
                        </>
                      ) : (
                        <>
                          <span>Bulk Actions ({bulkActions.selectedCount})</span>
                          <ChevronDownIcon className="w-4 h-4 ml-2" />
                        </>
                      )}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
