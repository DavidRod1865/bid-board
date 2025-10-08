import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Textarea } from './ui/FormField';
import Button from './ui/Button';
import ToastContainer from './ui/ToastContainer';
import { useToast } from '../hooks/useToast';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (content: string) => Promise<void>;
  isLoading?: boolean;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  onAddNote
}) => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset content when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNoteContent('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!noteContent.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddNote(noteContent.trim());
      setNoteContent('');
      onClose();
      showSuccess('Note Added', 'Successfully added project note');
    } catch (error) {
      showError('Add Failed', error instanceof Error ? error.message : 'Failed to add note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Project Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note Content
          </label>
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Enter your note here..."
            rows={4}
            disabled={isSubmitting}
            onKeyDown={handleKeyPress}
            autoFocus
            className="font-inherit focus:shadow-[0_0_0_2px_rgba(212,175,55,0.2)]"
          />
          <p className="text-xs text-gray-500 mt-1">
            Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to add note quickly
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!noteContent.trim() || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
      </form>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </Modal>
  );
};

export default AddNoteModal;