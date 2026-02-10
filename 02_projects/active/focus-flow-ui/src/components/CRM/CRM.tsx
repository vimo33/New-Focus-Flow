import { useState, useEffect } from 'react';
import { api } from '../../services/api';

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
}

function ContactCard({ contact }: { contact: Contact }) {
  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500',
  ];
  const colorIdx = contact.id.charCodeAt(contact.id.length - 1) % colors.length;

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl p-5 border border-slate-200 dark:border-[#2a3b4d] hover:border-primary/50 transition-all">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full ${colors[colorIdx]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
            {contact.name}
          </h3>
          {contact.company && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {contact.company}
            </p>
          )}
          <div className="flex flex-col gap-1 mt-2">
            {contact.email && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[14px]">email</span>
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[14px]">phone</span>
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {contact.tags.map(tag => (
                <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', company: '', phone: '', tags: '' });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async (searchQuery?: string) => {
    try {
      setLoading(true);
      const res = await api.getContacts(searchQuery);
      setContacts(res.contacts || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    if (query.length >= 2 || query.length === 0) {
      loadContacts(query || undefined);
    }
  };

  const handleCreate = async () => {
    if (!newContact.name.trim()) return;
    try {
      await api.createContact({
        name: newContact.name,
        email: newContact.email || undefined,
        company: newContact.company || undefined,
        phone: newContact.phone || undefined,
        tags: newContact.tags ? newContact.tags.split(',').map(t => t.trim()) : [],
      });
      setNewContact({ name: '', email: '', company: '', phone: '', tags: '' });
      setShowCreate(false);
      loadContacts();
    } catch (err) {
      console.error('Failed to create contact:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1200px] mx-auto w-full p-6 md:p-8 flex flex-col gap-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Contacts
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Manage your network and relationships.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              New Contact
            </button>
          </header>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Contacts Grid */}
          {!loading && contacts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-[64px] mb-4">
                contacts
              </span>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                {search ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                {search
                  ? 'Try adjusting your search query'
                  : 'Start building your network by adding your first contact.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-blue-500/20"
                >
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  Add First Contact
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Contact Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md border border-slate-200 dark:border-[#2a3b4d]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">New Contact</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name *"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
                autoFocus
              />
              <input
                type="email"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Company"
                value={newContact.company}
                onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={newContact.tags}
                onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
              <div className="flex gap-3 justify-end mt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newContact.name.trim()}
                  className="px-4 py-2 text-sm font-bold bg-primary hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-all"
                >
                  Create Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CRM;
