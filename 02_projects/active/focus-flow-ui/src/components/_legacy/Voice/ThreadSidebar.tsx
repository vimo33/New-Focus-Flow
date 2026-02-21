import { useState, useEffect, useRef } from 'react';
import { useThreadsStore } from '../../stores/threads';

interface ThreadSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadSidebar({ isOpen, onClose }: ThreadSidebarProps) {
  const {
    threads,
    activeThreadId,
    isLoading,
    fetchThreads,
    createThread,
    selectThread,
    deleteThread,
    renameThread,
  } = useThreadsStore();

  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (renameId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameId]);

  const handleNew = async () => {
    await createThread();
    onClose();
  };

  const handleSelect = async (id: string) => {
    await selectThread(id);
    onClose();
  };

  const handleRenameSubmit = async () => {
    if (renameId && renameValue.trim()) {
      await renameThread(renameId, renameValue.trim());
    }
    setRenameId(null);
    setContextMenu(null);
  };

  const handleDelete = async (id: string) => {
    await deleteThread(id);
    setContextMenu(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:relative top-0 left-0 h-full z-40 lg:z-auto
          w-72 bg-[#0d1520] border-r border-slate-800
          transform transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="text-white font-semibold text-sm">Threads</h3>
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-white bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && threads.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-3/4 mb-1.5" />
                  <div className="h-3 bg-slate-800/50 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">
                  forum
                </span>
              </div>
              <p className="text-slate-500 text-xs">No threads yet</p>
              <p className="text-slate-600 text-xs mt-1">Start a new conversation</p>
            </div>
          ) : (
            <div className="py-1">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`
                    relative group px-4 py-3 cursor-pointer transition-colors
                    ${
                      activeThreadId === thread.id
                        ? 'bg-primary/10 border-l-2 border-primary'
                        : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                    }
                  `}
                  onClick={() => handleSelect(thread.id)}
                >
                  {renameId === thread.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit();
                        if (e.key === 'Escape') {
                          setRenameId(null);
                          setContextMenu(null);
                        }
                      }}
                      className="w-full bg-slate-800 border border-primary/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white font-medium truncate pr-6">
                          {thread.title}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatDate(thread.updated_at)}
                        </span>
                      </div>
                      {thread.last_message_preview && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {thread.last_message_preview}
                        </p>
                      )}
                    </>
                  )}

                  {/* Context menu trigger */}
                  <button
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu(contextMenu === thread.id ? null : thread.id);
                    }}
                  >
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">
                      more_vert
                    </span>
                  </button>

                  {/* Context menu */}
                  {contextMenu === thread.id && (
                    <div
                      className="absolute right-2 top-10 bg-[#1e2936] border border-slate-700 rounded-lg shadow-xl z-50 py-1 min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                        onClick={() => {
                          setRenameId(thread.id);
                          setRenameValue(thread.title);
                          setContextMenu(null);
                        }}
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Rename
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2"
                        onClick={() => handleDelete(thread.id)}
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
