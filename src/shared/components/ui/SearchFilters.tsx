import React, { useState, useRef, useEffect } from 'react';
import { DateRangePicker } from 'react-date-range';
import { Input } from './FormField';
import { Button } from "./Button";
import StatusBadge from './StatusBadge';
import { BID_STATUSES } from '../../utils/constants';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  dateRange?: {startDate: Date | null, endDate: Date | null};
  setDateRange?: (range: {startDate: Date | null, endDate: Date | null}) => void;
  onReset?: () => void;
  onNewProject?: () => void;
  searchPlaceholder?: string;
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
  overdueFilter?: boolean;
  setOverdueFilter?: (overdue: boolean) => void;
  overdueCount?: number;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateRange = {startDate: null, endDate: null},
  setDateRange = () => {},
  onReset,
  onNewProject,
  searchPlaceholder = "Search...",
  showStatusFilter = true,
  showDateFilter = true,
  overdueFilter = false,
  setOverdueFilter = () => {},
  overdueCount = 0
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // Avoid unused variable warnings
  void onNewProject;

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);
  
  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter([]);
    if (showDateFilter) {
      setDateRange({startDate: null, endDate: null});
    }
    setOverdueFilter(false);
    setShowDatePicker(false);
    onReset?.();
  };

  const handleStatusFilter = (status: string) => {
    if (statusFilter.includes(status)) {
      // Remove status if already selected
      setStatusFilter(statusFilter.filter(s => s !== status));
    } else {
      // Add status to selection
      setStatusFilter([...statusFilter, status]);
    }
  };

  const handleClearAllStatuses = () => {
    setStatusFilter([]);
  };

  const handleDateRangeChange = (ranges: any) => {
    const { selection } = ranges;
    setDateRange({
      startDate: selection.startDate,
      endDate: selection.endDate
    });
  };

  const formatDateRange = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return 'Select date range';
    }
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    if (dateRange.startDate && dateRange.endDate) {
      if (dateRange.startDate.toDateString() === dateRange.endDate.toDateString()) {
        return formatDate(dateRange.startDate);
      }
      return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
    }

    if (dateRange.startDate) {
      return `From ${formatDate(dateRange.startDate)}`;
    }

    if (dateRange.endDate) {
      return `Until ${formatDate(dateRange.endDate)}`;
    }

    return 'Select date range';
  };
  
  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2 max-w-2xl flex-1">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          
          <Button
            variant="secondary"
            size="default"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Status Filter Badges */}
      {showStatusFilter && (
        <div className="flex items-center gap-2 m-2 flex-wrap">
          <div
            onClick={handleClearAllStatuses}
            className={`
              px-3 py-1 w-30 rounded-full text-center text-xs font-medium transition-all duration-200 border cursor-pointer
              ${statusFilter.length === 0 
                ? 'bg-[#d4af37] text-white border-2 border-black' 
                : 'bg-[#d4af37] text-gray-700 border-gray-300 opacity-55 hover:opacity-70'
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
                ${statusFilter.includes(status)
                  ? ' opacity-100 border-black border-2'
                  : 'bg-gray-100 !text-gray-700 border-gray-300 hover:bg-gray-200 opacity-55 hover:opacity-70'
                }
              `}
            />
          ))}
        </div>
      )}

      {/* Date Range Filter */}
      {showDateFilter && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter by date:</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] min-w-48 text-left"
              >
                {formatDateRange()}
              </button>
            
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <DateRangePicker
                    ranges={[{
                      startDate: dateRange.startDate || new Date(),
                      endDate: dateRange.endDate || new Date(),
                      key: 'selection'
                    }]}
                    onChange={handleDateRangeChange}
                    moveRangeOnFirstSelection={false}
                    months={1}
                    direction="horizontal"
                    rangeColors={['#d4af37']}
                  />
                  <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setDateRange({startDate: null, endDate: null});
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
            
            {/* Overdue Items Filter - Only show if there are overdue items */}
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
      )}
    </div>
  );
};

export default SearchFilters;