import { useState } from 'react';

interface CreateIdeaModalProps {
  onClose: () => void;
  onCreate: (title: string, description: string) => Promise<void>;
}

export function CreateIdeaModal({ onClose, onCreate }: CreateIdeaModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await onCreate(title.trim(), description.trim());
    } catch (error) {
      console.error('Failed to create idea:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="create-idea-modal"
    >
      <div
        className="bg-[#192633] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-[#233648]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#233648]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">Create New Idea</h2>
              <p className="text-[#92adc9] text-sm">Capture your creative concept</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#233648] text-[#92adc9] hover:text-white transition-colors"
            data-testid="close-modal-button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Title Input */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Idea Title
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AI-powered task summarization"
                className="w-full px-4 py-3 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#92adc9] focus:outline-none focus:border-primary transition-colors"
                data-testid="title-input"
                autoFocus
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Description
                <span className="text-red-400 ml-1">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem you're trying to solve and your proposed solution..."
                rows={6}
                className="w-full px-4 py-3 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#92adc9] focus:outline-none focus:border-primary transition-colors resize-none"
                data-testid="description-input"
              />
              <p className="text-[#92adc9] text-xs mt-2">
                Be specific about the problem statement and your proposed solution
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-400 text-[20px] mt-0.5">info</span>
                <div className="flex-1">
                  <div className="text-blue-400 text-sm font-medium mb-1">AI Council Validation</div>
                  <p className="text-blue-200/80 text-xs leading-relaxed">
                    After creating your idea, you can validate it with our AI Council. Three specialized agents will evaluate feasibility, alignment, and impact to help you make informed decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[#233648]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-transparent hover:bg-[#233648] text-[#92adc9] hover:text-white border border-[#324d67] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !description.trim()}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white transition-colors text-sm font-medium shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="create-button"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Create Idea</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
