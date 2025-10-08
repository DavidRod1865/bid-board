import React, { useState, useEffect } from 'react';
import type { Bid, User, ProjectNote } from '../types';
import { formatRelativeDate } from '../utils/formatters';
import ConfirmationModal from './ui/ConfirmationModal';
import ToastContainer from './ui/ToastContainer';
import { useToast } from '../hooks/useToast';
import Modal from './ui/Modal';
import { dbOperations } from '../lib/supabase';

interface ProjectNotesProps {
  bid: Bid;
  users: User[];
  projectNotes: ProjectNote[];
  setProjectNotes: React.Dispatch<React.SetStateAction<ProjectNote[]>>;
  currentUser: User;
}

const ProjectNotes: React.FC<ProjectNotesProps> = ({
  bid,
  users,
  projectNotes,
  setProjectNotes,
  currentUser
}) => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
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
      const updatedNote = await dbOperations.updateProjectNote(noteToEdit.id, editContent.trim());

      // Update local state with the response from database
      setProjectNotes(prev => prev.map(note => 
        note.id === noteToEdit.id ? updatedNote : note
      ));

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
      
      // Manually remove the note for immediate UI feedback
      setProjectNotes(prev => prev.filter(note => note.id !== noteToDelete));
      
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
          const noteAuthor = users.find(u => u.id === note.user_id);
          
          return (
            <div
              key={note.id}
              className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#d4af37] shadow-sm transition-shadow hover:shadow-md group"
            >
              <div className="flex justify-between items-start gap-2 mb-3">
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
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span className="font-semibold text-gray-700">
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
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Edit Note"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note Content
            </label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent text-gray-900 bg-white resize-none"
              rows={4}
              disabled={updatingNote}
              placeholder="Enter note content..."
              autoFocus
            />
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleDeleteNoteFromModal}
              disabled={updatingNote}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Note
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={handleCloseEditModal}
                disabled={updatingNote}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updatingNote || !editContent.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#d4af37] rounded-md hover:bg-[#b8941f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingNote ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
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
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default ProjectNotes;