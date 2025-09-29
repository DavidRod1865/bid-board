import React, { useState, useMemo } from 'react';
import type { Bid, BidVendor, Vendor } from '../types';
import Sidebar from './ui/Sidebar';
import BidPreviewModal from './BidPreviewModal';
import DayEventsModal from './DayEventsModal';

interface CalendarProps {
  bids: Bid[];
  bidVendors: BidVendor[];
  vendors: Vendor[];
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'bid_due' | 'vendor_due';
  date: Date;
  status?: string;
  bid?: Bid;
  vendor?: Vendor;
  bidVendor?: BidVendor;
}

const Calendar: React.FC<CalendarProps> = ({ bids, bidVendors, vendors }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'bid_due' | 'vendor_due'>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);

  // Get vendor by ID helper
  const getVendorById = (vendorId: number): Vendor | undefined => {
    return vendors.find(v => v.id === vendorId);
  };

  // Get bid by ID helper
  const getBidById = (bidId: number): Bid | undefined => {
    return bids.find(b => b.id === bidId);
  };

  // Generate calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add bid due dates
    bids.forEach(bid => {
      if (bid.due_date) {
        events.push({
          id: `bid-${bid.id}`,
          title: bid.project_name,
          type: 'bid_due',
          date: new Date(bid.due_date),
          status: bid.status,
          bid
        });
      }
    });

    // Add vendor cost due dates (only if no response received)
    bidVendors.forEach(bidVendor => {
      const vendor = getVendorById(bidVendor.vendor_id);
      const bid = getBidById(bidVendor.bid_id);
      
      // Only show if due date exists, vendor/bid found, and no response received
      if (bidVendor.due_date && vendor && bid && !bidVendor.response_received_date) {
        events.push({
          id: `vendor-${bidVendor.id}`,
          title: `${bid.project_name} - ${vendor.company_name}`,
          type: 'vendor_due',
          date: new Date(bidVendor.due_date),
          vendor,
          bid,
          bidVendor
        });
      }
    });

    return events;
  }, [bids, bidVendors, vendors]);

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'all') return calendarEvents;
    return calendarEvents.filter(event => event.type === selectedFilter);
  }, [calendarEvents, selectedFilter]);

  // Get month/year info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentDate);

  // Calculate calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get events for a specific day
  const getEventsForDay = (day: number): CalendarEvent[] => {
    const dayDate = new Date(year, month, day);
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year
      );
    });
  };

  // Get display events for a specific day (max 2 items - grouped by type)
  const getDisplayEventsForDay = (day: number) => {
    const allEvents = getEventsForDay(day);
    if (allEvents.length === 0) return { displayEvents: [], allEvents: [] };

    const bidDueEvents = allEvents.filter(event => event.type === 'bid_due');
    const vendorDueEvents = allEvents.filter(event => event.type === 'vendor_due');
    
    const displayEvents: Array<{
      id: string;
      title: string;
      type: 'bid_due' | 'vendor_due' | 'summary';
      count?: number;
      isSummary: boolean;
      originalEvents?: CalendarEvent[];
    }> = [];

    // Add bid due events (or summary)
    if (bidDueEvents.length === 1) {
      displayEvents.push({
        id: bidDueEvents[0].id,
        title: bidDueEvents[0].title,
        type: 'bid_due',
        isSummary: false
      });
    } else if (bidDueEvents.length > 1) {
      displayEvents.push({
        id: `bid-summary-${day}`,
        title: `${bidDueEvents.length} Bid Due Dates`,
        type: 'bid_due',
        count: bidDueEvents.length,
        isSummary: true,
        originalEvents: bidDueEvents
      });
    }

    // Add vendor due events (or summary)
    if (vendorDueEvents.length === 1) {
      displayEvents.push({
        id: vendorDueEvents[0].id,
        title: vendorDueEvents[0].title,
        type: 'vendor_due',
        isSummary: false
      });
    } else if (vendorDueEvents.length > 1) {
      displayEvents.push({
        id: `vendor-summary-${day}`,
        title: `${vendorDueEvents.length} Vendor Costs Due`,
        type: 'vendor_due',
        count: vendorDueEvents.length,
        isSummary: true,
        originalEvents: vendorDueEvents
      });
    }

    return { displayEvents, allEvents };
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Event styling
  const getEventStyle = (event: CalendarEvent) => {
    return event.type === 'bid_due' 
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Handle individual event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Handle day summary click
  const handleDayClick = (day: number, events: CalendarEvent[]) => {
    const dayDate = new Date(year, month, day);
    setSelectedDay(dayDate);
    setSelectedDayEvents(events);
    setIsDayModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleCloseDayModal = () => {
    setIsDayModalOpen(false);
    setSelectedDay(null);
    setSelectedDayEvents([]);
  };

  // Handle event click from day modal
  const handleDayModalEventClick = (event: CalendarEvent) => {
    setIsDayModalOpen(false);
    handleEventClick(event);
  };

  // Dummy handlers for sidebar (calendar page doesn't need these)
  const handleStatusFilter = () => {};
  const handleNewProject = () => {};
  const handleCopyProject = () => {};
  const handleAddVendor = () => {};

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        statusFilter=""
        setStatusFilter={handleStatusFilter}
        onNewProject={handleNewProject}
        onCopyProject={handleCopyProject}
        onAddVendor={handleAddVendor}
      />
      
      {/* Main Calendar */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h1 className="text-2xl font-semibold text-gray-800">
              {monthName} {year}
            </h1>
            
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'bid_due' | 'vendor_due')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#d4af37] bg-white"
            >
              <option value="all">All Events</option>
              <option value="bid_due">Bid Due Dates</option>
              <option value="vendor_due">Vendor Cost Due</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Bid Due Dates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Vendor Cost Due (No Response)</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const { displayEvents, allEvents } = day ? getDisplayEventsForDay(day) : { displayEvents: [], allEvents: [] };
              const isToday = day && 
                new Date().getDate() === day && 
                new Date().getMonth() === month && 
                new Date().getFullYear() === year;

              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-b border-r border-gray-200 last:border-r-0 p-2 ${
                    !day ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-2 ${
                        isToday ? 'bg-[#d4af37] text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'
                      }`}>
                        {day}
                      </div>
                      
                      <div className="space-y-1">
                        {displayEvents.map(displayEvent => {
                          if (displayEvent.isSummary) {
                            // Summary event - opens day modal
                            return (
                              <div
                                key={displayEvent.id}
                                className={`text-xs p-1 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${
                                  displayEvent.type === 'bid_due' 
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-red-100 text-red-800 border-red-200'
                                }`}
                                title={`${displayEvent.count} events - click to view all`}
                                onClick={() => handleDayClick(day, allEvents)}
                              >
                                <span className="flex-1">{displayEvent.title}</span>
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            );
                          } else {
                            // Individual event - opens event modal
                            const originalEvent = allEvents.find(e => e.id === displayEvent.id);
                            if (!originalEvent) return null;
                            
                            return (
                              <div
                                key={displayEvent.id}
                                className={`text-xs p-1 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getEventStyle(originalEvent)}`}
                                title={displayEvent.title}
                                onClick={() => handleEventClick(originalEvent)}
                              >
                                {displayEvent.title}
                              </div>
                            );
                          }
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Events Modal */}
      <DayEventsModal
        isOpen={isDayModalOpen}
        onClose={handleCloseDayModal}
        selectedDate={selectedDay}
        events={selectedDayEvents}
        onEventClick={handleDayModalEventClick}
      />

      {/* Bid Preview Modal */}
      <BidPreviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        bid={selectedEvent?.bid}
        vendor={selectedEvent?.vendor}
        bidVendor={selectedEvent?.bidVendor}
        eventType={selectedEvent?.type || 'bid_due'}
      />
    </div>
  );
};

export default Calendar;