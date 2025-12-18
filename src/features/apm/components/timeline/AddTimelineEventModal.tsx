import React, { useState, useEffect } from 'react';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import type { TimelineEvent, TimelineEventTemplate } from '../../../../shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../shared/components/ui/dialog';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/input';
import { Label } from '../../../../shared/components/ui/label';
import { Textarea } from '../../../../shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../shared/components/ui/select';
import { Calendar } from '../../../../shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../shared/components/ui/popover';
import { cn } from '../../../../shared/services/utils';

interface AddTimelineEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  eventTemplates: TimelineEventTemplate[];
  editingEvent?: TimelineEvent | null;
  onSubmit: (event: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const CUSTOM_CATEGORIES = [
  { value: 'demo', label: 'Demo' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'controls', label: 'Controls' },
  { value: 'startup', label: 'Start-up' },
  { value: 'commissioning', label: 'Commissioning' },
  { value: 'custom', label: 'Custom' },
];

export const AddTimelineEventModal: React.FC<AddTimelineEventModalProps> = ({
  open,
  onOpenChange,
  projectId,
  eventTemplates, // eslint-disable-line @typescript-eslint/no-unused-vars
  editingEvent,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    event_name: '',
    event_category: 'custom' as TimelineEvent['event_category'],
    order_by: '',
    required_by: '',
    status: 'pending' as TimelineEvent['status'],
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetDateOpen, setTargetDateOpen] = useState(false);
  const [actualDateOpen, setActualDateOpen] = useState(false);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    // Use UTC noon to avoid timezone shifts
    const date = new Date(dateString + 'T12:00:00Z');
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Convert date string to Date object for Calendar (UTC)
  const getDateFromString = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    // Use UTC noon to avoid timezone shifts
    return new Date(dateString + 'T12:00:00Z');
  };

  // Convert Date object to YYYY-MM-DD string (using UTC)
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Reset form when modal opens/closes or when editing event changes
  useEffect(() => {
    if (editingEvent) {
      setFormData({
        event_name: editingEvent.event_name,
        event_category: editingEvent.event_category,
        order_by: editingEvent.order_by || '',
        required_by: editingEvent.required_by || '',
        status: editingEvent.status,
        notes: editingEvent.notes || '',
      });
    } else if (open) {
      setFormData({
        event_name: '',
        event_category: 'custom',
        order_by: '',
        required_by: '',
        status: 'pending',
        notes: '',
      });
    }
    // Close date pickers when modal closes
    if (!open) {
      setTargetDateOpen(false);
      setActualDateOpen(false);
    }
  }, [open, editingEvent]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_name.trim()) return;

    setIsSubmitting(true);
    try {
      const eventData: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'> = {
        project_id: projectId,
        event_category: formData.event_category,
        event_name: formData.event_name,
        event_type: 'custom',
        order_by: formData.order_by || null,
        required_by: formData.required_by || null,
        status: formData.status,
        notes: formData.notes || null,
        sort_order: 9999,
        created_by: null, // Will be set by the backend
        updated_by: null, // Will be set by the backend
      };

      await onSubmit(eventData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save timeline event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}
          </DialogTitle>
          <DialogDescription>
            {editingEvent 
              ? 'Update the timeline event details.' 
              : 'Create a custom timeline event.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event details form */}
          <div className="space-y-4">
              <h3 className="font-medium">Event Details</h3>
              
              {/* Event name */}
              <div className="space-y-2">
                <Label htmlFor="event_name">Event Name *</Label>
                <Input
                  id="event_name"
                  value={formData.event_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
                  placeholder="Enter event name"
                  required
                />
              </div>

              {/* Event category */}
              <div className="space-y-2">
                <Label htmlFor="event_category">Category</Label>
                <Select
                  value={formData.event_category}
                  onValueChange={(value) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      event_category: value as TimelineEvent['event_category'] 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order By</Label>
                  <Popover open={targetDateOpen} onOpenChange={setTargetDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.order_by && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDate(formData.order_by)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={getDateFromString(formData.order_by)}
                        onSelect={(date) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            order_by: date ? formatDateForInput(date) : '' 
                          }));
                          if (date) {
                            setTargetDateOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Required By</Label>
                  <Popover open={actualDateOpen} onOpenChange={setActualDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.required_by && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDate(formData.required_by)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={getDateFromString(formData.required_by)}
                        onSelect={(date) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            required_by: date ? formatDateForInput(date) : '' 
                          }));
                          if (date) {
                            setActualDateOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      status: value as TimelineEvent['status'] 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.event_name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {editingEvent ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  {editingEvent ? 'Update Event' : 'Add Event'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};