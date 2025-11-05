import React from 'react';
import type { Bid, BidVendor, Vendor } from '../../types';
import { getStatusColor } from '../../utils/statusUtils';
import DialogModal from '../ui/DialogModal';
import { DocumentIcon, CurrencyDollarIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

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
  if (!selectedDate) return null;

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
      <DocumentIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <CurrencyDollarIcon className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Events for ${formatDate(selectedDate)}`}
      description={`${events.length} event${events.length !== 1 ? 's' : ''} scheduled`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Bid Due Events */}
        {bidDueEvents.length > 0 && (
          <div>
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
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendor Cost Due Events */}
        {vendorDueEvents.length > 0 && (
          <div>
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
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
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
              <CalendarIcon className="mx-auto h-12 w-12" />
            </div>
            <p className="text-gray-500">No events scheduled for this date</p>
          </div>
        )}
      </div>
    </DialogModal>
  );
};

export default DayEventsModal;