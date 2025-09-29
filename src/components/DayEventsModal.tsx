import React, { useEffect, useState } from 'react';
import type { Bid, BidVendor, Vendor } from '../types';
import { getStatusColor } from '../utils/statusUtils';

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

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  events,
  onEventClick
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen || !selectedDate) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200); // Wait for animation to complete
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Group events by type
  const bidDueEvents = events.filter(event => event.type === 'bid_due');
  const vendorDueEvents = events.filter(event => event.type === 'vendor_due');

  const getEventStyle = (event: CalendarEvent) => {
    return event.type === 'bid_due' 
      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      : 'bg-red-50 border-red-200 hover:bg-red-100';
  };

  const getEventIcon = (event: CalendarEvent) => {
    return event.type === 'bid_due' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    );
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out transform ${
        isAnimating 
          ? 'scale-100 opacity-100' 
          : 'scale-95 opacity-0'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Events for {formatDate(selectedDate)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {events.length} event{events.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Bid Due Events */}
          {bidDueEvents.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Bid Due Dates ({bidDueEvents.length})
                </h3>
              </div>
              <div className="space-y-2">
                {bidDueEvents.map(event => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${getEventStyle(event)}`}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-center gap-3">
                      {getEventIcon(event)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        {event.status && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor Cost Due Events */}
          {vendorDueEvents.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Vendor Costs Due ({vendorDueEvents.length})
                </h3>
              </div>
              <div className="space-y-2">
                {vendorDueEvents.map(event => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${getEventStyle(event)}`}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-center gap-3">
                      {getEventIcon(event)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        {event.vendor && (
                          <p className="text-sm text-gray-600">
                            {event.vendor.contact_person && `Contact: ${event.vendor.contact_person}`}
                            {event.vendor.phone && ` • ${event.vendor.phone}`}
                          </p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {events.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No events scheduled for this date</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayEventsModal;