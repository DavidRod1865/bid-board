import React, { useState, useEffect } from 'react';
import { CalendarIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import type { TimelineEvent } from '../../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Badge } from './badge';

interface TimelineEventDropdownProps {
  projectId: number;
  value?: number | null;
  onChange: (timelineEventId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  timelineEvents: TimelineEvent[]; // Pass events from parent to avoid API calls
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-3 h-3 text-green-600" />;
    case 'in_progress':
      return <ClockIcon className="w-3 h-3 text-blue-600" />;
    case 'cancelled':
      return <XCircleIcon className="w-3 h-3 text-red-600" />;
    default:
      return <CalendarIcon className="w-3 h-3 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'demo':
      return 'bg-orange-100 text-orange-800';
    case 'mechanical':
      return 'bg-blue-100 text-blue-800';
    case 'equipment':
      return 'bg-green-100 text-green-800';
    case 'controls':
      return 'bg-purple-100 text-purple-800';
    case 'startup':
      return 'bg-yellow-100 text-yellow-800';
    case 'commissioning':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const TimelineEventDropdown: React.FC<TimelineEventDropdownProps> = ({
  projectId,
  value,
  onChange,
  placeholder = "Select timeline event...",
  disabled = false,
  timelineEvents
}) => {
  // Filter events for this project and group by category
  const projectEvents = timelineEvents.filter(event => event.project_id === projectId);
  
  // Group events by category
  const eventsByCategory = projectEvents.reduce((acc, event) => {
    if (!acc[event.event_category]) {
      acc[event.event_category] = [];
    }
    acc[event.event_category].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  // Sort categories and events within each category
  const sortedCategories = Object.keys(eventsByCategory).sort();
  
  const selectedEvent = projectEvents.find(event => event.id === value);

  const handleChange = (eventIdString: string) => {
    if (eventIdString === 'none') {
      onChange(null);
    } else {
      onChange(parseInt(eventIdString, 10));
    }
  };

  return (
    <Select 
      value={value ? value.toString() : 'none'} 
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedEvent ? (
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedEvent.status)}
              <span className="truncate">{selectedEvent.event_name}</span>
              <Badge className={getCategoryColor(selectedEvent.event_category)} variant="outline">
                {selectedEvent.event_category}
              </Badge>
              <Badge className={getStatusColor(selectedEvent.status)} variant="outline">
                {selectedEvent.status.replace('_', ' ')}
              </Badge>
            </div>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {/* None option */}
        <SelectItem value="none">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">None</span>
          </div>
        </SelectItem>
        
        {/* Grouped events */}
        {projectEvents.length === 0 ? (
          <SelectItem value="none" disabled>
            <span className="text-gray-500 italic">No timeline events available</span>
          </SelectItem>
        ) : (
          sortedCategories.map(category => (
            <div key={category}>
              {/* Category header */}
              <div className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border-t">
                {category.charAt(0).toUpperCase() + category.slice(1)} Events
              </div>
              
              {/* Events in this category */}
              {eventsByCategory[category]
                .sort((a, b) => {
                  // Sort by order by date, with null dates last
                  if (a.order_by && b.order_by) {
                    return new Date(a.order_by).getTime() - new Date(b.order_by).getTime();
                  }
                  if (a.order_by) return -1;
                  if (b.order_by) return 1;
                  return a.event_name.localeCompare(b.event_name);
                })
                .map(event => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    <div className="flex items-center gap-2 w-full">
                      {getStatusIcon(event.status)}
                      <span className="truncate flex-1">{event.event_name}</span>
                      <Badge className={getStatusColor(event.status)} variant="outline">
                        {event.status.replace('_', ' ')}
                      </Badge>
                      {event.order_by && (
                        <span className="text-xs text-gray-500 ml-auto">
                          {new Date(event.order_by).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
            </div>
          ))
        )}
      </SelectContent>
    </Select>
  );
};