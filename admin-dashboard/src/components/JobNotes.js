import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftIcon, 
  PlusIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const JobNotes = ({ jobId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const noteTypeOptions = [
    { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' },
    { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-800' },
    { value: 'interpreter', label: 'Interpreter', color: 'bg-green-100 text-green-800' },
    { value: 'claimant', label: 'Claimant', color: 'bg-purple-100 text-purple-800' },
    { value: 'billing', label: 'Billing', color: 'bg-yellow-100 text-yellow-800' }
  ];

  useEffect(() => {
    loadNotes();
  }, [jobId]);

  const loadNotes = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(data.data || []);
      } else {
        toast.error('Failed to load notes');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setIsAddingNote(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note_text: newNote.trim(),
          note_type: noteType
        })
      });

      if (response.ok) {
        const result = await response.json();
        setNotes(prev => [result.data, ...prev]);
        setNewNote('');
        setNoteType('general');
        toast.success('Note added successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getNoteTypeColor = (type) => {
    const option = noteTypeOptions.find(opt => opt.value === type);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  const getNoteTypeLabel = (type) => {
    const option = noteTypeOptions.find(opt => opt.value === type);
    return option ? option.label : 'General';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ChatBubbleLeftIcon className="h-5 w-5 mr-2 text-blue-600" />
          Job Notes
        </h3>
        <div className="text-sm text-gray-500">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add New Note
          </label>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter your note here..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note Type
            </label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {noteTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isAddingNote || !newNote.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isAddingNote ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding...
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Note
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-gray-500">
          💡 Notes cannot be edited once created. Choose the appropriate type for better organization.
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ChatBubbleLeftIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>No notes yet. Add the first note above.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNoteTypeColor(note.note_type)}`}>
                    {getNoteTypeLabel(note.note_type)}
                  </span>
                  {note.interpreter_first_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {note.interpreter_first_name} {note.interpreter_last_name}
                    </div>
                  )}
                  {note.admin_email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <UserIcon className="h-4 w-4 mr-1" />
                      Admin: {note.admin_email}
                    </div>
                  )}
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {formatDate(note.created_at)}
                </div>
              </div>
              
              <div className="text-gray-900 whitespace-pre-wrap">
                {note.note_text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobNotes;
