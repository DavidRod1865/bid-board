import { useState } from 'react';
import { bulkOperations, type BulkOperationResult } from '../services/bulkOperations';
import { useToast } from './useToast';

export type BulkActionType = 'moveToActive' | 'archive' | 'onHold' | 'delete';

export interface BulkAction {
  type: BulkActionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'primary' | 'secondary' | 'warning' | 'danger';
  confirmationRequired?: boolean;
}

interface BulkConfirmModal {
  isOpen: boolean;
  type: BulkActionType;
  count: number;
  onConfirm: () => void;
}

interface UseBulkActionsProps {
  onActionComplete?: (actionType: BulkActionType, result: BulkOperationResult) => void;
}

interface UseBulkActionsReturn {
  isLoading: boolean;
  confirmModal: BulkConfirmModal;
  setConfirmModal: React.Dispatch<React.SetStateAction<BulkConfirmModal>>;
  executeBulkAction: (actionType: BulkActionType, bidIds: number[]) => Promise<void>;
  showConfirmation: (actionType: BulkActionType, count: number, onConfirm: () => void) => void;
  closeConfirmation: () => void;
}

export const useBulkActions = ({ onActionComplete }: UseBulkActionsProps = {}): UseBulkActionsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<BulkConfirmModal>({
    isOpen: false,
    type: 'moveToActive',
    count: 0,
    onConfirm: () => {}
  });

  const { showSuccess, showError } = useToast();

  const executeBulkAction = async (actionType: BulkActionType, bidIds: number[]): Promise<void> => {
    if (bidIds.length === 0) return;

    setIsLoading(true);
    
    try {
      let result: BulkOperationResult;

      switch (actionType) {
        case 'moveToActive':
          result = await bulkOperations.bulkMoveToActive(bidIds);
          break;
        case 'archive':
          result = await bulkOperations.bulkArchive(bidIds);
          break;
        case 'onHold':
          result = await bulkOperations.bulkOnHold(bidIds);
          break;
        case 'delete':
          result = await bulkOperations.bulkDelete(bidIds);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      // Show success/error messages based on result
      if (result.success) {
        const actionLabels = {
          moveToActive: 'moved to active',
          archive: 'archived',
          onHold: 'moved to on-hold',
          delete: 'deleted'
        };
        
        showSuccess(
          `Bulk ${actionLabels[actionType]}`,
          `${result.successCount} project${result.successCount > 1 ? 's' : ''} ${actionLabels[actionType]} successfully`
        );
      } else {
        const partialMessage = result.successCount > 0 
          ? `${result.successCount} succeeded, ${result.failureCount} failed` 
          : `All ${result.failureCount} operations failed`;
          
        showError(
          `Bulk Action Failed`,
          `${partialMessage}. ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`
        );
      }

      // Notify parent component
      if (onActionComplete) {
        onActionComplete(actionType, result);
      }

    } catch (error) {
      showError(
        'Bulk Action Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showConfirmation = (actionType: BulkActionType, count: number, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      type: actionType,
      count,
      onConfirm
    });
  };

  const closeConfirmation = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  return {
    isLoading,
    confirmModal,
    setConfirmModal,
    executeBulkAction,
    showConfirmation,
    closeConfirmation
  };
};

// Helper function to get confirmation message for different action types
export const getBulkActionConfirmationMessage = (actionType: BulkActionType, count: number): string => {
  const projectText = count > 1 ? 'projects' : 'project';
  
  switch (actionType) {
    case 'moveToActive':
      return `Are you sure you want to move ${count} ${projectText} to active status?`;
    case 'archive':
      return `Are you sure you want to archive ${count} ${projectText}?`;
    case 'onHold':
      return `Are you sure you want to move ${count} ${projectText} to on-hold?`;
    case 'delete':
      return `Are you sure you want to permanently delete ${count} ${projectText}? This action cannot be undone.`;
    default:
      return `Are you sure you want to perform this action on ${count} ${projectText}?`;
  }
};

// Helper function to get confirmation button text
export const getBulkActionConfirmText = (actionType: BulkActionType): string => {
  switch (actionType) {
    case 'moveToActive':
      return 'Move to Active';
    case 'archive':
      return 'Archive';
    case 'onHold':
      return 'Move to On Hold';
    case 'delete':
      return 'Delete';
    default:
      return 'Confirm';
  }
};