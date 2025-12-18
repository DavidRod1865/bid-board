import React from 'react';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon, 
  PencilIcon, 
  EllipsisVerticalIcon 
} from '@heroicons/react/24/outline';
import type { TimelineEvent } from '../../../../shared/types';
import { formatDateSafe } from '../../../../shared/utils/formatters';
import { Badge } from '../../../../shared/components/ui/badge';
import { Button } from '../../../../shared/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../shared/components/ui/dropdown-menu';

interface TimelineItemProps {
  event: TimelineEvent;
  onEdit?: (event: TimelineEvent) => void;
  onDelete?: (event: TimelineEvent) => void;
  onStatusChange?: (event: TimelineEvent, status: TimelineEvent['status']) => void;
  isLast?: boolean;
}

const getStatusConfig = (status: TimelineEvent['status']) => {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircleIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        badgeVariant: 'default' as const,
        badgeClass: 'bg-green-100 text-green-800'
      };
    case 'in_progress':
      return {
        icon: ClockIcon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        badgeVariant: 'secondary' as const,
        badgeClass: 'bg-blue-100 text-blue-800'
      };
    case 'cancelled':
      return {
        icon: XCircleIcon,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        badgeVariant: 'destructive' as const,
        badgeClass: 'bg-red-100 text-red-800'
      };
    default:
      return {
        icon: ClockIcon,
        color: 'text-gray-400',
        bgColor: 'bg-gray-100',
        badgeVariant: 'outline' as const,
        badgeClass: 'bg-gray-100 text-gray-800'
      };
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

const isOverdue = (orderByDate: string | null, status: TimelineEvent['status']) => {
  if (!orderByDate || status === 'completed' || status === 'cancelled') return false;
  return new Date(orderByDate) < new Date();
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  event,
  onEdit,
  onDelete,
  onStatusChange,
  isLast = false
}) => {
  const statusConfig = getStatusConfig(event.status);
  const overdue = isOverdue(event.order_by, event.status);

  return (
    <div className="relative flex items-start space-x-4 pb-6">
      {/* Event content */}
      <div className="flex-1 min-w-0">
        <div className={`border border-gray-200 rounded-lg bg-white p-4 shadow-sm ${overdue ? 'border-red-300 bg-red-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Event name, category, and dates */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {event.event_name}
                  </h3>
                  {event.order_by && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <CalendarIcon className="w-3 h-3" />
                      <span>Order By: {formatDateSafe(event.order_by)}</span>
                    </div>
                  )}
                  {event.required_by && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>Required By: {formatDateSafe(event.required_by)}</span>
                    </div>
                  )}
                  <Badge className={getCategoryColor(event.event_category)} variant="outline">
                    {event.event_category}
                  </Badge>
                  {overdue && (
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      Overdue
                    </Badge>
                  )}
                </div>

                {/* Notes */}
                {event.notes && (
                  <p className="mt-2 text-xs text-gray-700 bg-gray-50 p-2 rounded">
                    {event.notes}
                  </p>
                )}
              </div>

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(event)}>
                      <PencilIcon className="mr-2 h-4 w-4" />
                      Edit Event
                    </DropdownMenuItem>
                  )}
                  {onStatusChange && event.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onStatusChange(event, 'completed')}>
                      <CheckCircleIcon className="mr-2 h-4 w-4" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  {onStatusChange && event.status !== 'in_progress' && event.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onStatusChange(event, 'in_progress')}>
                      <ClockIcon className="mr-2 h-4 w-4" />
                      Mark In Progress
                    </DropdownMenuItem>
                  )}
                  {onStatusChange && event.status !== 'pending' && event.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onStatusChange(event, 'pending')}>
                      <ClockIcon className="mr-2 h-4 w-4" />
                      Mark Pending
                    </DropdownMenuItem>
                  )}
                  {onDelete && event.event_type === 'custom' && (
                    <DropdownMenuItem onClick={() => onDelete(event)} className="text-red-600">
                      <XCircleIcon className="mr-2 h-4 w-4" />
                      Delete Event
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>
      </div>
    </div>
  );
};