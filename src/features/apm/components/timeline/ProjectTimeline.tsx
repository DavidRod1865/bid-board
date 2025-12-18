import React, { useState, useMemo } from 'react';
import { PlusIcon, FunnelIcon, MagnifyingGlassIcon, CalendarIcon } from '@heroicons/react/24/outline';
import type { TimelineEvent, TimelineEventTemplate } from '../../../../shared/types';
import { TimelineItem } from './TimelineItem';
import { AddTimelineEventModal } from './AddTimelineEventModal';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/input';
import { Badge } from '../../../../shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../shared/components/ui/select';

interface ProjectTimelineProps {
  projectId: number;
  events: TimelineEvent[];
  eventTemplates: TimelineEventTemplate[];
  onEventAdd: (event: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onEventUpdate: (event: TimelineEvent) => Promise<void>;
  onEventDelete: (eventId: number) => Promise<void>;
  isLoading?: boolean;
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  projectId,
  events,
  eventTemplates,
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  isLoading = false
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(event => {
      const matchesSearch = event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (event.notes && event.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || event.event_category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sort by order_by (earliest first), putting events without an order_by at the end
    return filtered.sort((a, b) => {
      if (a.order_by && b.order_by) {
        return new Date(a.order_by).getTime() - new Date(b.order_by).getTime();
      }
      if (a.order_by) return -1;
      if (b.order_by) return 1;
      return 0;
    });
  }, [events, searchTerm, statusFilter, categoryFilter]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(events.map(e => e.event_category));
    return Array.from(cats).sort();
  }, [events]);

  const handleEventAdd = async (eventData: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>) => {
    await onEventAdd(eventData);
    setShowAddModal(false);
  };

  const handleEventEdit = async (eventData: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingEvent) return;
    
    await onEventUpdate({
      ...editingEvent,
      ...eventData
    });
    setEditingEvent(null);
  };

  const handleStatusChange = async (event: TimelineEvent, status: TimelineEvent['status']) => {
    const updatedEvent: TimelineEvent = {
      ...event,
      status,
      required_by: status === 'completed' && !event.required_by 
        ? new Date().toISOString().split('T')[0] 
        : event.required_by
    };
    
    await onEventUpdate(updatedEvent);
  };

  const handleDelete = async (event: TimelineEvent) => {
    if (confirm(`Are you sure you want to delete "${event.event_name}"?`)) {
      await onEventDelete(event.id);
    }
  };

  return (
    <div className="">
      {/* Filters */}
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Timeline */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {events.length === 0 ? (
                <>
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No timeline events yet. Add your first milestone!</p>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    Add First Event
                  </Button>
                </>
              ) : (
                <p>No events match your current filters.</p>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {filteredEvents.map((event, index) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  onEdit={setEditingEvent}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  isLast={index === filteredEvents.length - 1}
                />
              ))}
            </div>
          )}
        </div>

      {/* Add/Edit Modal */}
      <AddTimelineEventModal
        open={showAddModal || !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingEvent(null);
          }
        }}
        projectId={projectId}
        eventTemplates={eventTemplates}
        editingEvent={editingEvent}
        onSubmit={editingEvent ? handleEventEdit : handleEventAdd}
      />
    </div>
  );
};