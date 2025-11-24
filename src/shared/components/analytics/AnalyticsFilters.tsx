import React, { useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import FormField, { Select, Input } from '../ui/FormField';
import { Button } from '../ui/Button';
import type { AnalyticsFilters } from '../../types/analytics';

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFilterChange: (filters: AnalyticsFilters) => void;
  isLoading?: boolean;
}

const AnalyticsFiltersComponent: React.FC<AnalyticsFiltersProps> = ({ 
  filters, 
  onFilterChange, 
  isLoading = false 
}) => {
  // Local state for date range to prevent immediate updates
  const [localStartDate, setLocalStartDate] = useState(filters.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(filters.endDate || '');
  const [dateRangeError, setDateRangeError] = useState('');

  // Handle date range validation and application
  const applyDateRange = (startDate: string, endDate: string) => {
    setDateRangeError('');
    
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        setDateRangeError('Start date must be before end date');
        return;
      }
    }

    if (startDate || endDate) {
      onFilterChange({
        ...filters,
        filterType: 'custom',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedMonth: undefined
      });
    } else {
      // If both dates are cleared, revert to quick filter
      onFilterChange({
        ...filters,
        filterType: 'quick',
        timeframe: '30days',
        startDate: undefined,
        endDate: undefined,
        selectedMonth: undefined
      });
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setLocalStartDate(value);
      // Only auto-apply when clearing the date (reverting to default)
      if (!value && !localEndDate) {
        applyDateRange('', '');
      }
    } else {
      setLocalEndDate(value);
      // Only auto-apply when clearing the date (reverting to default)
      if (!value && !localStartDate) {
        applyDateRange('', '');
      }
    }
    
    // Clear any previous error when dates change
    setDateRangeError('');
  };


  const handleReset = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    setDateRangeError('');
    onFilterChange({
      filterType: 'quick',
      timeframe: '30days',
      costRange: 'all',
      vendorType: 'all'
    });
  };

  // Sync local state when filters change externally (e.g., from dropdown selection)
  React.useEffect(() => {
    setLocalStartDate(filters.startDate || '');
    setLocalEndDate(filters.endDate || '');
    setDateRangeError('');
  }, [filters.startDate, filters.endDate]);

  // Generate month options for the last 24 months
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();


  // Get current filter description for display
  const getCurrentFilterDescription = () => {
    if (filters.filterType === 'custom' && (filters.startDate || filters.endDate)) {
      return 'Custom Date Range';
    } else if (filters.filterType === 'month' && filters.selectedMonth) {
      const [year, month] = filters.selectedMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      switch (filters.timeframe) {
        case '30days': return 'Last 30 days';
        case '90days': return 'Last 90 days';
        case '12months': return 'Last 12 months';
        case 'all': return 'All time';
        default: return 'Last 30 days';
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
        {/* Current Filter Display */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {getCurrentFilterDescription()}
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-6 items-center">
          {/* Time Period Dropdown */}
          <FormField label="Quick Filter">
            <Select 
              value={
                filters.filterType === 'quick' ? filters.timeframe :
                filters.filterType === 'month' && filters.selectedMonth ? filters.selectedMonth :
                ''
              }
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                
                // Check if it's a month selection (contains hyphen) or quick timeframe
                if (value.includes('-')) {
                  // Month selection - clear local date state and update filters
                  setLocalStartDate('');
                  setLocalEndDate('');
                  setDateRangeError('');
                  const newFilters = {
                    ...filters,
                    filterType: 'month' as const,
                    selectedMonth: value,
                    startDate: undefined,
                    endDate: undefined
                  };
                  onFilterChange(newFilters);
                } else {
                  // Quick timeframe selection - clear local date state and update filters
                  setLocalStartDate('');
                  setLocalEndDate('');
                  setDateRangeError('');
                  const newFilters = {
                    ...filters,
                    filterType: 'quick' as const,
                    timeframe: value as '30days' | '90days' | '12months' | 'all',
                    selectedMonth: undefined,
                    startDate: undefined,
                    endDate: undefined
                  };
                  onFilterChange(newFilters);
                }
              }}
              disabled={isLoading}
            >
              <option value="">Select period...</option>
              <optgroup label="Quick Periods">
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="12months">Last 12 months</option>
                <option value="all">All time</option>
              </optgroup>
              <optgroup label="By Month">
                {monthOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </optgroup>
            </Select>
          </FormField>

          {/* Vertical Divider */}
          <div className="h-16 w-px bg-gray-300" />

          {/* Custom Date Range */}
          <div className="flex gap-3 items-end">
            <FormField label="Start Date">
              <Input
                type="date"
                value={localStartDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
                disabled={isLoading}
                max={localEndDate || new Date().toISOString().split('T')[0]}
              />
            </FormField>

            <FormField label="End Date">
              <Input
                type="date"
                value={localEndDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
                disabled={isLoading}
                min={localStartDate || ''}
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>

            {(localStartDate || localEndDate) && (
              <Button
                variant="default"
                onClick={() => applyDateRange(localStartDate, localEndDate)}
                disabled={isLoading || !!dateRangeError}
                className={`whitespace-nowrap ${
                  (localStartDate !== (filters.startDate || '')) || 
                  (localEndDate !== (filters.endDate || ''))
                    ? 'bg-orange-600 hover:bg-orange-700 text-white animate-pulse' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {localStartDate && localEndDate ? 'Apply Range' : 'Clear Dates'}
              </Button>
            )}
          </div>
          
          {dateRangeError && (
            <div className="text-red-600 text-sm mt-1">
              {dateRangeError}
            </div>
          )}
        </div>
      </div>
  );
};

export default AnalyticsFiltersComponent;