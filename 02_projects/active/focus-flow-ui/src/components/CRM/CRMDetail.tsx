import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';

interface Interaction {
  id: string;
  contact_id: string;
  type: string;
  subject: string;
  content?: string;
  date: string;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  tags: string[];
  project_ids: string[];
  created_at: string;
  updated_at: string;
  interactions?: Interaction[];
}

export function CRMDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [interactionType, setInteractionType] = useState('note');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', company: '', phone: '', tags: '' });

  useEffect(() => {
    if (id) loadContact(id);
  }, [id]);

  const loadContact = async (contactId: string) => {
    try {
      setLoading(true);
      const data = await api.getContact(contactId);
      setContact(data);
      setEditForm({
        name: data.name || '',
        email: data.email || '',
        company: data.company || '',
        phone: data.phone || '',
        tags: (data.tags || []).join(', '),
      });
    } catch (err) {
      console.error('Failed to load contact:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!id || !newNote.trim()) return;
    try {
      await api.addInteraction({ contact_id: id, type: interactionType, notes: newNote.trim() });
      setNewNote('');
      loadContact(id);
    } catch (err) {
      console.error('Failed to add interaction:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      await api.updateContact(id, {
        name: editForm.name,
        email: editForm.email || undefined,
        company: editForm.company || undefined,
        phone: editForm.phone || undefined,
        tags: editForm.tags ? editForm.tags.split(',').map((t: string) => t.trim()) : [],
      });
      setEditing(false);
      loadContact(id);
    } catch (err) {
      console.error('Failed to update contact:', err);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm(`Delete contact "${contact?.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteContact(id);
      navigate('/crm');
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Contact not found</p>
        <Link to="/crm" className="text-primary mt-2 inline-block">Back to Contacts</Link>
      </div>
    );
  }

  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const interactions = contact.interactions || [];

  const interactionIcons: Record<string, string> = {
    note: 'edit_note',
    call: 'phone',
    email: 'email',
    meeting: 'groups',
    deal: 'handshake',
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
        <Link to="/crm" className="hover:text-primary transition-colors">Contacts</Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-slate-900 dark:text-white font-medium">{contact.name}</span>
      </div>

      {/* Contact Card */}
      <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {initials}
            </div>
            <div>
              {editing ? (
                <div className="space-y-3">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:outline-none text-lg font-bold"
                    placeholder="Name" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none text-sm"
                      placeholder="Email" />
                    <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none text-sm"
                      placeholder="Phone" />
                    <input value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none text-sm"
                      placeholder="Company" />
                    <input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none text-sm"
                      placeholder="Tags (comma-separated)" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600">Save</button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{contact.name}</h1>
                  {contact.company && <p className="text-slate-500 dark:text-slate-400">{contact.company}</p>}
                  <div className="flex flex-wrap gap-4 mt-3">
                    {contact.email && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">email</span>
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">phone</span>
                        {contact.phone}
                      </span>
                    )}
                  </div>
                  {contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {contact.tags.map(tag => (
                        <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {!editing && (
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)}
                className="p-2 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
              <button onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Interaction */}
      <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Log Interaction</h3>
        <div className="flex gap-3 mb-3">
          {['note', 'call', 'email', 'meeting'].map(type => (
            <button
              key={type}
              onClick={() => setInteractionType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                interactionType === type
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{interactionIcons[type]}</span>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={`Add a ${interactionType} note...`}
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[80px]"
          />
        </div>
        <div className="flex justify-end mt-3">
          <button
            onClick={handleAddInteraction}
            disabled={!newNote.trim()}
            className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-50 transition-all"
          >
            Log {interactionType}
          </button>
        </div>
      </div>

      {/* Interaction History */}
      <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">History</h3>
        {interactions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No interactions logged yet.</p>
        ) : (
          <div className="space-y-4">
            {interactions.sort((a: Interaction, b: Interaction) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()).map((interaction: Interaction) => (
              <div key={interaction.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400" style={{ fontSize: '16px' }}>
                    {interactionIcons[interaction.type] || 'circle'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {interaction.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(interaction.date || interaction.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{interaction.content || interaction.subject}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CRMDetail;
