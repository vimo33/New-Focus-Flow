import { useState } from 'react';
import type { InboxItem, ProcessInboxRequest, Task, Project, Idea } from '../../services/api';

interface ProcessModalProps {
  item: InboxItem;
  onClose: () => void;
  onProcess: (data: ProcessInboxRequest) => Promise<void>;
}

type ActionType = 'task' | 'project' | 'idea' | 'note' | 'archive';

export function ProcessModal({ item, onClose, onProcess }: ProcessModalProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>(
    item.ai_classification?.suggested_action || 'task'
  );
  const [processing, setProcessing] = useState(false);

  // Task form state
  const [taskTitle, setTaskTitle] = useState(item.text);
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState<'work' | 'personal' | 'scheduled'>(
    item.category === 'ideas' ? 'work' : (item.category as 'work' | 'personal') || 'work'
  );
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Project form state
  const [projectTitle, setProjectTitle] = useState(item.text);
  const [projectDescription, setProjectDescription] = useState('');

  // Idea form state
  const [ideaTitle, setIdeaTitle] = useState(item.text);
  const [ideaDescription, setIdeaDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      let processData: ProcessInboxRequest;

      switch (selectedAction) {
        case 'task':
          processData = {
            action: 'task',
            task_data: {
              title: taskTitle,
              description: taskDescription || undefined,
              category: taskCategory,
              priority: taskPriority,
              status: 'todo',
            } as Partial<Task>,
          };
          break;

        case 'project':
          processData = {
            action: 'project',
            project_data: {
              title: projectTitle,
              description: projectDescription || undefined,
              status: 'active',
            } as Partial<Project>,
          };
          break;

        case 'idea':
          processData = {
            action: 'idea',
            idea_data: {
              title: ideaTitle,
              description: ideaDescription,
              status: 'inbox',
            } as Partial<Idea>,
          };
          break;

        case 'note':
        case 'archive':
          processData = { action: 'archive' };
          break;

        default:
          throw new Error('Invalid action type');
      }

      await onProcess(processData);
    } catch (error) {
      console.error('Failed to process item:', error);
      alert('Failed to process item. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="process-modal">
      <div className="bg-[#1c2630] border border-[#324d67] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#324d67]">
          <h3 className="text-xl font-semibold text-white">Process Inbox Item</h3>
          <button
            onClick={onClose}
            className="text-[#92adc9] hover:text-white transition-colors"
            data-testid="close-modal-button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Original Item Preview */}
            <div className="bg-[#111a22] border border-[#233648] rounded-lg p-4">
              <p className="text-sm font-medium text-[#92adc9] mb-2">Original Item</p>
              <p className="text-white">{item.text}</p>
              {item.ai_classification && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-[#92adc9]">AI Suggestion:</span>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {item.ai_classification.suggested_action.charAt(0).toUpperCase() +
                      item.ai_classification.suggested_action.slice(1)}
                  </span>
                  <span className="text-[#587391]">
                    ({Math.round(item.ai_classification.confidence * 100)}% confidence)
                  </span>
                </div>
              )}
            </div>

            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                What would you like to do with this item?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAction('task')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedAction === 'task'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[#324d67] text-[#92adc9] hover:border-[#587391]'
                  }`}
                  data-testid="action-task"
                >
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                  <span className="text-xs font-medium">Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction('project')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedAction === 'project'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[#324d67] text-[#92adc9] hover:border-[#587391]'
                  }`}
                  data-testid="action-project"
                >
                  <span className="material-symbols-outlined text-[24px]">folder</span>
                  <span className="text-xs font-medium">Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction('idea')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedAction === 'idea'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[#324d67] text-[#92adc9] hover:border-[#587391]'
                  }`}
                  data-testid="action-idea"
                >
                  <span className="material-symbols-outlined text-[24px]">lightbulb</span>
                  <span className="text-xs font-medium">Idea</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction('note')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedAction === 'note'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[#324d67] text-[#92adc9] hover:border-[#587391]'
                  }`}
                  data-testid="action-note"
                >
                  <span className="material-symbols-outlined text-[24px]">description</span>
                  <span className="text-xs font-medium">Note</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction('archive')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedAction === 'archive'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[#324d67] text-[#92adc9] hover:border-[#587391]'
                  }`}
                  data-testid="action-archive"
                >
                  <span className="material-symbols-outlined text-[24px]">archive</span>
                  <span className="text-xs font-medium">Archive</span>
                </button>
              </div>
            </div>

            {/* Task Form */}
            {selectedAction === 'task' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Task Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#587391] focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter task title"
                    data-testid="task-title-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#587391] focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Add task description (optional)"
                    data-testid="task-description-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Category</label>
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value as typeof taskCategory)}
                      className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                      data-testid="task-category-select"
                    >
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as typeof taskPriority)}
                      className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                      data-testid="task-priority-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Project Form */}
            {selectedAction === 'project' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#587391] focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter project title"
                    data-testid="project-title-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#587391] focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Describe the project goals and scope (optional)"
                    data-testid="project-description-input"
                  />
                </div>
              </div>
            )}

            {/* Idea Form */}
            {selectedAction === 'idea' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Idea Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={ideaTitle}
                    onChange={(e) => setIdeaTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#587391] focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter idea title"
                    data-testid="idea-title-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={ideaDescription}
                    onChange={(e) => setIdeaDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-2 bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-[#587391] focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Describe your idea in detail"
                    data-testid="idea-description-input"
                  />
                </div>
              </div>
            )}

            {/* Archive/Note Confirmation */}
            {(selectedAction === 'note' || selectedAction === 'archive') && (
              <div className="bg-[#111a22] border border-[#324d67] rounded-lg p-4">
                <p className="text-[#92adc9] text-sm">
                  {selectedAction === 'archive'
                    ? 'This item will be archived and removed from your inbox.'
                    : 'This item will be saved as a note for future reference.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[#324d67]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-transparent border border-[#324d67] text-[#92adc9] hover:bg-[#233648] hover:text-white transition-colors"
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-6 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="submit-button"
            >
              {processing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {processing ? 'Processing...' : 'Process Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
