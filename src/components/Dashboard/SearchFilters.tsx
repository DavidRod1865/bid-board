import React from 'react';
import { Input } from '../ui/FormField';
import Button from '../ui/Button';
import { BID_STATUSES } from '../../utils/constants';
import { getStatusColor } from '../../utils/statusUtils';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  urgencyFilter?: string;
  setUrgencyFilter?: (urgency: string) => void;
  dateFilter?: string;
  setDateFilter?: (date: string) => void;
  onReset?: () => void;
  onNewProject?: () => void;
  searchPlaceholder?: string;
  showStatusFilter?: boolean;
  showUrgencyFilter?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  urgencyFilter = '',
  setUrgencyFilter = () => {},
  dateFilter = '',
  setDateFilter = () => {},
  onReset,
  onNewProject,
  searchPlaceholder = "Search...",
  showStatusFilter = true,
  showUrgencyFilter = true
}) => {
  // Avoid unused variable warnings
  void onNewProject;
  
  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter([]);
    if (showUrgencyFilter) {
      setUrgencyFilter('');
      setDateFilter('');
    }
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

  const handleUrgencyFilter = (urgency: string) => {
    setUrgencyFilter(urgencyFilter === urgency ? '' : urgency);
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
            size="md"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Status Filter Buttons */}
      {showStatusFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700 mr-2">Filter by status:</span>
          
          <button
            onClick={handleClearAllStatuses}
            className={`
              px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
              ${statusFilter.length === 0 
                ? 'bg-[#d4af37] text-white border-[#d4af37]' 
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }
            `}
          >
            All
          </button>

          {BID_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                ${statusFilter.includes(status) 
                  ? 'text-white border-transparent' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }
              `}
              style={{
                backgroundColor: statusFilter.includes(status) ? getStatusColor(status) : undefined
              }}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {/* Urgency Filter Buttons and Date Filter */}
      {showUrgencyFilter && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter by urgency:</span>
            
            <button
              onClick={() => handleUrgencyFilter('')}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                ${urgencyFilter === '' 
                  ? 'bg-[#d4af37] text-white border-[#d4af37]' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }
              `}
            >
              All
            </button>

            <button
              onClick={() => handleUrgencyFilter('today')}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                ${urgencyFilter === 'today' 
                  ? 'bg-red-500 text-white border-red-500' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }
              `}
            >
              Today
            </button>

            <button
              onClick={() => handleUrgencyFilter('thisweek')}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                ${urgencyFilter === 'thisweek' 
                  ? 'bg-orange-500 text-white border-orange-500' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }
              `}
            >
              This Week
            </button>
          </div>

          <div className="flex items-center">
            <Input
              type="date"
              placeholder="Filter by date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;