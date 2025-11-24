import React, { useState, useRef, useEffect } from 'react';
import { DateRangePicker } from 'react-date-range';
import type { RangeKeyDict } from 'react-date-range';
import { Input } from './FormField';
import { Button } from "./Button";
import { useUserProfile } from '../../../contexts/UserContext';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateRange?: {startDate: Date | null, endDate: Date | null};
  setDateRange?: (range: {startDate: Date | null, endDate: Date | null}) => void;
  onReset?: () => void;
  searchPlaceholder?: string;
  showDateFilter?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  dateRange = {startDate: null, endDate: null},
  setDateRange = () => {},
  onReset,
  searchPlaceholder = "Search...",
  showDateFilter = true,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const { currentView } = useUserProfile();

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
    if (showDateFilter) {
      setDateRange({startDate: null, endDate: null});
    }
    setShowDatePicker(false);
    onReset?.();
  };

  const handleDateRangeChange = (ranges: RangeKeyDict) => {
    const { selection } = ranges;
    setDateRange({
      startDate: selection.startDate || null,
      endDate: selection.endDate || null
    });
  };

  const formatDateRange = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return 'Pick a date range...';
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
    <div className="px-6 py-4">
      <div className="flex gap-3">
        {/* Search Field */}
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-64 max-w-96"
        />

        {/* Date Picker */}
        {showDateFilter && (
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-52 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-0 text-left transition-colors rounded-md"
            >
              <span className={dateRange.startDate || dateRange.endDate ? "text-gray-900" : "text-gray-500"}>
                {formatDateRange()}
              </span>
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
                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-900"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1 text-sm text-white rounded transition-colors"
                    style={{ 
                      backgroundColor: currentView === "apm" ? "#16a34a" : "#2563eb"
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset Button */}
        <Button
          className="bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          size="default"
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default SearchFilters;