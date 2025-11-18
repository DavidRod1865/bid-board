import React, { useState, useMemo } from 'react';
import type { Bid, BidVendor, Vendor, User } from '../../shared/types';
import Sidebar from '../../shared/components/ui/Sidebar';
import BidPreviewModal from '../../shared/components/modals/BidPreviewModal';
import DayEventsModal from '../../shared/components/modals/DayEventsModal';
import { useUserProfile } from '../../contexts/UserContext';

interface CalendarProps {
  bids: Bid[];
  bidVendors: BidVendor[];
  vendors: Vendor[];
  users: User[];
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'bid_due' | 'vendor_due' | 'apm_task';
  date: Date;
  status?: string;
  bid?: Bid;
  vendor?: Vendor;
  bidVendor?: BidVendor;
  user?: User;
  phase?: string;
  urgency?: string;
}

const Calendar: React.FC<CalendarProps> = ({ bids, bidVendors, vendors, users }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'bid_due' | 'vendor_due' | 'apm_task'>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  
  // Get current view context
  const { currentView } = useUserProfile();

  // Filter data based on current view
  const viewFilteredBids = useMemo(() => {
    if (currentView === 'apm') {
      // APM view: show bids sent to APM that aren't archived or on hold
      return bids.filter(bid => 
        bid.sent_to_apm && !bid.apm_archived && !bid.apm_on_hold
      );
    } else {
      // Estimating view: show active bids (not archived, not on hold, not sent to APM)
      return bids.filter(bid => 
        !bid.archived && !bid.on_hold && !bid.sent_to_apm
      );
    }
  }, [bids, currentView]);

  const viewFilteredBidVendors = useMemo(() => {
    if (currentView === 'apm') {
      // APM view: only show bid vendors for bids that are sent to APM
      return bidVendors.filter(bv => {
        const bid = bids.find(b => b.id === bv.bid_id);
        return bid && bid.sent_to_apm && !bid.apm_archived && !bid.apm_on_hold;
      });
    } else {
      // Estimating view: only show bid vendors for active estimating bids
      return bidVendors.filter(bv => {
        const bid = bids.find(b => b.id === bv.bid_id);
        return bid && !bid.archived && !bid.on_hold && !bid.sent_to_apm;
      });
    }
  }, [bidVendors, bids, currentView]);

  // Helper function to properly parse date strings avoiding timezone issues
  const parseDate = (dateString: string): Date => {
    // If the date string doesn't include time, treat it as local date
    if (!dateString.includes('T') && !dateString.includes(' ')) {
      // For date-only strings like "2025-10-09", create local date to avoid timezone shifts
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    return new Date(dateString);
  };

  // Get vendor by ID helper
  const getVendorById = (vendorId: number): Vendor | undefined => {
    return vendors.find(v => v.id === vendorId);
  };

  // Get bid by ID helper
  const getBidById = (bidId: number): Bid | undefined => {
    return bids.find(b => b.id === bidId);
  };

  // Get user by ID helper
  const getUserById = (userId: string): User | undefined => {
    return users?.find(u => u.id === userId);
  };

  // Get color scheme for each APM phase
  const getPhaseColor = (phaseName: string) => {
    switch (phaseName) {
      case 'buy_number':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          border: 'border-purple-200',
          dot: 'bg-purple-500'
        };
      case 'po':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'submittals':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          border: 'border-orange-200',
          dot: 'bg-orange-500'
        };
      case 'revised_plans':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'equipment_release':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          dot: 'bg-green-500'
        };
      case 'closeouts':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          dot: 'bg-red-500'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          dot: 'bg-gray-500'
        };
    }
  };

  // Generate calendar events using filtered data
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    if (currentView === 'estimating') {
      // ESTIMATING VIEW: Show bid due dates and vendor cost due dates
      
      // Add bid due dates
      viewFilteredBids.forEach(bid => {
        if (bid.due_date) {
          events.push({
            id: `bid-${bid.id}`,
            title: bid.project_name,
            type: 'bid_due',
            date: parseDate(bid.due_date),
            status: bid.status,
            bid
          });
        }
      });

      // Add vendor cost due dates (only if no response received)
      viewFilteredBidVendors.forEach(bidVendor => {
        const vendor = getVendorById(bidVendor.vendor_id);
        const bid = getBidById(bidVendor.bid_id);
        
        // Only show if due date exists, vendor/bid found, and no response received
        if (bidVendor.due_date && vendor && bid && !bidVendor.response_received_date) {
          events.push({
            id: `vendor-${bidVendor.id}`,
            title: `${bid.project_name} - ${vendor.company_name}`,
            type: 'vendor_due',
            date: parseDate(bidVendor.due_date),
            vendor,
            bid,
            bidVendor
          });
        }
      });
    } else if (currentView === 'apm') {
      // APM VIEW: Only show individual phase follow-up tasks (no project due dates)
      
      viewFilteredBidVendors.forEach(bidVendor => {
        // Skip completed vendors
        if (bidVendor.closeout_received_date) return;

        const vendor = getVendorById(bidVendor.vendor_id);
        const bid = getBidById(bidVendor.bid_id);
        const assignedUser = bidVendor.assigned_apm_user ? getUserById(bidVendor.assigned_apm_user) : undefined;

        if (!vendor || !bid) return;

        // All possible phases with their follow-up and received date fields
        const phases = [
          {
            name: "buy_number",
            displayName: "Buy Number",
            followUpDate: bidVendor.buy_number_follow_up_date,
            receivedDate: bidVendor.buy_number_received_date,
          },
          {
            name: "po",
            displayName: "Purchase Order",
            followUpDate: bidVendor.po_follow_up_date,
            receivedDate: bidVendor.po_received_date,
          },
          {
            name: "submittals",
            displayName: "Submittals",
            followUpDate: bidVendor.submittals_follow_up_date,
            receivedDate: bidVendor.submittals_received_date,
          },
          {
            name: "revised_plans",
            displayName: "Revised Plans",
            followUpDate: bidVendor.revised_plans_follow_up_date,
            receivedDate: bidVendor.revised_plans_confirmed_date,
          },
          {
            name: "equipment_release",
            displayName: "Equipment Release",
            followUpDate: bidVendor.equipment_release_follow_up_date,
            receivedDate: bidVendor.equipment_released_date,
          },
          {
            name: "closeouts",
            displayName: "Closeouts",
            followUpDate: bidVendor.closeout_follow_up_date,
            receivedDate: bidVendor.closeout_received_date,
          },
        ];

        // Create individual task for each pending phase
        phases.forEach((phase) => {
          // Skip phases that are already received or have no follow-up date
          if (phase.receivedDate || !phase.followUpDate) return;

          const assignmentInfo = assignedUser ? ` (${assignedUser.name})` : ' (Unassigned)';
          
          events.push({
            id: `apm-task-${bidVendor.id}-${phase.name}`,
            title: `${phase.displayName}: ${bid.project_name} - ${vendor.company_name}${assignmentInfo}`,
            type: 'apm_task',
            date: parseDate(phase.followUpDate),
            vendor,
            bid,
            bidVendor,
            user: assignedUser,
            phase: phase.displayName,
            urgency: phase.name, // Store the phase name for color coding
          });
        });
      });
    }

    return events;
  }, [viewFilteredBids, viewFilteredBidVendors, vendors, users, currentView]);

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
  
  // Add empty cells for days after month ends to complete the grid (42 total cells = 6 weeks)
  const totalCells = 42; // 6 weeks * 7 days
  const cellsUsed = firstDayWeekday + daysInMonth;
  const emptyCellsAfter = totalCells - cellsUsed;
  
  for (let i = 0; i < emptyCellsAfter; i++) {
    calendarDays.push(null);
  }

  // Get events for a specific day
  const getEventsForDay = (day: number): CalendarEvent[] => {
    return filteredEvents.filter(event => {
      // event.date is already properly parsed from parseDate function
      return (
        event.date.getDate() === day &&
        event.date.getMonth() === month &&
        event.date.getFullYear() === year
      );
    });
  };

  // Get display events for a specific day (max 2 items - grouped by type)
  const getDisplayEventsForDay = (day: number) => {
    const allEvents = getEventsForDay(day);
    if (allEvents.length === 0) return { displayEvents: [], allEvents: [] };

    const bidDueEvents = allEvents.filter(event => event.type === 'bid_due');
    const vendorDueEvents = allEvents.filter(event => event.type === 'vendor_due');
    const apmTaskEvents = allEvents.filter(event => event.type === 'apm_task');
    
    const displayEvents: Array<{
      id: string;
      title: string;
      type: 'bid_due' | 'vendor_due' | 'apm_task' | 'summary';
      count?: number;
      isSummary: boolean;
      originalEvents?: CalendarEvent[];
    }> = [];

    // Add bid due events (or summary) - ESTIMATING only
    if (currentView === 'estimating') {
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

      // Add vendor due events (or summary) - ESTIMATING only
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
    }

    // Add APM task events (or summary) - APM only
    if (currentView === 'apm') {
      if (apmTaskEvents.length === 1) {
        displayEvents.push({
          id: apmTaskEvents[0].id,
          title: apmTaskEvents[0].title,
          type: 'apm_task',
          isSummary: false
        });
      } else if (apmTaskEvents.length > 1) {
        displayEvents.push({
          id: `apm-summary-${day}`,
          title: `${apmTaskEvents.length} Follow-up Tasks`,
          type: 'apm_task',
          count: apmTaskEvents.length,
          isSummary: true,
          originalEvents: apmTaskEvents
        });
      }
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
    if (event.type === 'bid_due') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (event.type === 'vendor_due') {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (event.type === 'apm_task' && event.urgency) {
      const colors = getPhaseColor(event.urgency);
      return `${colors.bg} ${colors.text} ${colors.border}`;
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Handle individual event click
  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'apm_task') {
      // For APM tasks, use the detailed day modal instead of bid preview
      const eventDate = event.date;
      setSelectedDay(eventDate);
      setSelectedDayEvents([event]);
      setIsDayModalOpen(true);
    } else {
      // For estimating events, use the bid preview modal
      setSelectedEvent(event);
      setIsModalOpen(true);
    }
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        statusFilter={[]}
        setStatusFilter={handleStatusFilter}
        showViewToggle={true}
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
              onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'bid_due' | 'vendor_due' | 'apm_task')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#d4af37] bg-white"
            >
              <option value="all">All Events</option>
              {currentView === 'estimating' && (
                <>
                  <option value="bid_due">Bid Due Dates</option>
                  <option value="vendor_due">Vendor Cost Due</option>
                </>
              )}
              {currentView === 'apm' && <option value="apm_task">Follow-up Tasks</option>}
            </select>
          </div>
        </div>

        {/* Legend */}
        {currentView === 'estimating' ? (
          <div className="flex items-center gap-6 mb-6">
            <div className="text-sm text-gray-500 font-medium">Estimating Projects:</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Bid Due Dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Vendor Cost Due (No Response)</span>
            </div>
          </div>
        ) : (
          /* APM Phase Directory */
          <div className=" flex items-center gap-2 mb-6">
            <div className="text-sm text-gray-500 font-medium">APM Follow-up Directory:</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Buy Number |</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Purchase Order |</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Submittals |</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Revised Plans |</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Equipment Release |</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Closeouts</span>
              </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 border-r border-gray-200">
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
                  className={`min-h-[120px] border-b border-r border-gray-200 p-2 ${
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
                                    : displayEvent.type === 'vendor_due'
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-teal-200 text-teal-800 border-teal-300' // APM tasks summary
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

      {/* Bid Preview Modal - Only for non-APM tasks */}
      {selectedEvent?.type !== 'apm_task' && (
        <BidPreviewModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          bid={selectedEvent?.bid}
          vendor={selectedEvent?.vendor}
          bidVendor={selectedEvent?.bidVendor}
          eventType={selectedEvent?.type || 'bid_due'}
        />
      )}
    </div>
  );
};

export default Calendar;