import React, { useState } from 'react';
import type { Bid, User, ProjectNote } from '../../types';
import { formatRelativeDate } from '../../utils/formatters';
import AlertDialog from '../ui/AlertDialog';
import { Toaster } from '../ui/sonner';
import { useToast } from '../../hooks/useToast';
import DialogModal from '../ui/DialogModal';
import { dbOperations } from '../../services/supabase';

interface ProjectNotesProps {
  bid: Bid;
  users: User[];
  projectNotes: ProjectNote[];
  setProjectNotes: React.Dispatch<React.SetStateAction<ProjectNote[]>>;
}

const ProjectNotes: React.FC<ProjectNotesProps> = ({
  bid,
  users,
  projectNotes,
  setProjectNotes
}) => {
  const { showSuccess, showError } = useToast();
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<ProjectNote | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updatingNote, setUpdatingNote] = useState(false);

  
  const handleEditNote = (note: ProjectNote) => {
    setNoteToEdit(note);
    setEditContent(note.content);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setNoteToEdit(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !noteToEdit) return;

    setUpdatingNote(true);
    try {
      // Update note in database
      await dbOperations.updateProjectNote(noteToEdit.id, {
        content: editContent.trim(),
        updated_at: new Date().toISOString()
      });

      // Real-time subscription will handle the UI update automatically

      handleCloseEditModal();
      showSuccess('Note Updated', 'Successfully updated project note');
    } catch (error) {
      showError('Update Failed', error instanceof Error ? error.message : 'Failed to update note. Please try again.');
    } finally {
      setUpdatingNote(false);
    }
  };

  const handleDeleteNoteFromModal = () => {
    if (!noteToEdit) return;
    setNoteToDelete(noteToEdit.id);
    setShowDeleteModal(true);
    handleCloseEditModal();
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;

    setDeletingNoteId(noteToDelete);
    try {
      await dbOperations.deleteProjectNote(noteToDelete);
      
      // Real-time subscription will handle the UI update automatically
      
      setShowDeleteModal(false);
      setNoteToDelete(null);
      showSuccess('Note Deleted', 'Successfully deleted project note');
    } catch (error) {
      showError('Delete Failed', error instanceof Error ? error.message : 'Failed to delete note. Please try again.');
    } finally {
      setDeletingNoteId(null);
    }
  };
  
  
  return (
    <div className="h-full flex flex-col relative">
      {/* Notes Display */}
      <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
        {/* Initial bid notes */}
        {bid.notes && (
          <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#d4af37] shadow-sm transition-shadow hover:shadow-md">
            <div className="text-gray-900 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
              {bid.notes}
            </div>
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span className="font-semibold text-gray-700">Initial Note</span>
            </div>
          </div>
        )}
        
        {/* Individual notes */}
        {projectNotes.map((note) => {
          // Use joined user data from the note if available, otherwise fall back to users array
          const noteAuthor = note.user || users.find(u => u.id === note.user_id);
          
          return (
            <div
              key={note.id}
              className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#d4af37] shadow-sm transition-shadow hover:shadow-md group flex flex-col"
            >
              <div className="flex justify-between items-start gap-2 mb-3 flex-1">
                <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap flex-1">
                  {note.content}
                </div>
                <button
                  onClick={() => handleEditNote(note)}
                  disabled={deletingNoteId === note.id}
                  className={`bg-transparent border-none cursor-pointer p-1 rounded-full w-6 h-6 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
                    deletingNoteId === note.id
                      ? 'text-gray-300 cursor-not-allowed opacity-100'
                      : 'text-gray-500 hover:text-gray-700 hover:scale-110'
                  }`}
                  title="Edit note"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600 mt-auto pt-2 border-t border-gray-200">
                <span 
                  className="font-semibold"
                  style={{ 
                    color: noteAuthor?.color_preference || '#374151' 
                  }}
                >
                  {noteAuthor?.name || 'Unknown User'}
                </span>
                <span className="italic">
                  {formatRelativeDate(note.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        
        {/* Empty state */}
        {projectNotes.length === 0 && !bid.notes && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No notes yet.</p>
            <p className="text-xs mt-1">Use the sidebar to add a note.</p>
          </div>
        )}
      </div>

      {/* Edit Note Modal */}
      <DialogModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Edit Note"
        footer={
          <div className="flex justify-between items-center w-full pt-4 border-t border-gray-200">
            <button
              onClick={handleDeleteNoteFromModal}
              disabled={updatingNote}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-red-700 bg-white border-2 border-red-300 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Note
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={handleCloseEditModal}
                disabled={updatingNote}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updatingNote || !editContent.trim()}
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#d4af37] rounded-lg hover:bg-[#b8941f] shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#d4af37] disabled:hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2"
              >
                {updatingNote ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] text-gray-900 bg-gray-50 resize-none transition-all duration-200 placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100"
              rows={6}
              disabled={updatingNote}
              placeholder="Enter note content..."
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              {editContent.trim().length} character{editContent.trim().length !== 1 ? 's' : ''}
            </p>
          </div>
          
        </div>
      </DialogModal>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setNoteToDelete(null);
        }}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete Note"
        cancelText="Cancel"
        variant="danger"
      />
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
};

export default ProjectNotes;