import { useState } from 'react';
import type { Project } from '../../services/api';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (data: Partial<Project> & { concept?: string }) => Promise<void>;
}

export function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [title, setTitle] = useState('');
  const [concept, setConcept] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onCreate({
        title: title.trim(),
        concept: concept.trim() || undefined,
      } as any);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      data-testid="create-project-modal"
    >
      <div
        className="bg-white dark:bg-card-dark rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-[#2a3b4d] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-[#2a3b4d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">rocket_launch</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                New Project
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Describe your concept and refine it with AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            disabled={loading}
            data-testid="close-modal-button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-col gap-4">
            {/* Title Input */}
            <div>
              <label
                htmlFor="project-title"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
              >
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                id="project-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AI Recipe Generator, Smart Home Dashboard"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#111a22] border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                disabled={loading}
                autoFocus
                data-testid="project-title-input"
              />
            </div>

            {/* Concept Input */}
            <div>
              <label
                htmlFor="project-concept"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
              >
                Concept
              </label>
              <textarea
                id="project-concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Describe your project concept — what problem does it solve, who is it for, what's the core idea? An AI Concept Analyst will help you refine it."
                rows={5}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#111a22] border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
                disabled={loading}
                data-testid="project-description-input"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                The more detail you provide, the better the AI can help refine your concept.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                data-testid="modal-error-message"
              >
                <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-[#2a3b4d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              disabled={loading}
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !title.trim()}
              data-testid="create-button"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>{concept.trim() ? 'Create & Refine' : 'Create Project'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
