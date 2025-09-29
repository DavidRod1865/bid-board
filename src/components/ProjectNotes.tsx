import React, { useState } from 'react';
import type { Bid, User, ProjectNote } from '../types';
import { formatRelativeDate } from '../utils/formatters';
import ConfirmationModal from './ui/ConfirmationModal';
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
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);

  
  const handleDeleteNote = (noteId: number) => {
    setNoteToDelete(noteId);
    setShowDeleteModal(true);
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
    } catch (error) {
      // Could add error handling UI here
    } finally {
      setDeletingNoteId(null);
    }
  };
  
  
  return (
    <div className="h-full flex flex-col">
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
          const canDelete = note.user_id === currentUser.id;
          
          return (
            <div
              key={note.id}
              className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#d4af37] shadow-sm transition-shadow hover:shadow-md group"
            >
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap flex-1">
                  {note.content}
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deletingNoteId === note.id}
                    className={`bg-transparent border-none text-xl font-bold cursor-pointer p-1 rounded-full w-6 h-6 flex items-center justify-center transition-all flex-shrink-0 opacity-0 group-hover:opacity-100 ${
                      deletingNoteId === note.id
                        ? 'text-gray-300 cursor-not-allowed opacity-100'
                        : 'text-gray-500 hover:text-gray-700 hover:scale-110'
                    }`}
                    title={deletingNoteId === note.id ? "Deleting..." : "Delete note"}
                  >
                    {deletingNoteId === note.id ? '...' : '×'}
                  </button>
                )}
                {!canDelete && (
                  <div className="w-6 h-6 flex-shrink-0"></div>
                )}
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span className="font-semibold text-gray-700">
                  {noteAuthor?.name || noteAuthor?.email || 'Unknown'}
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
    </div>
  );
};

export default ProjectNotes;