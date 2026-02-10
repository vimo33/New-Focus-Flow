interface ToolCall {
  tool: string;
  input: Record<string, any>;
  result: {
    success: boolean;
    data?: any;
    error?: string;
    navigate_to?: string;
  };
}

interface ToolExecutionCardProps {
  toolCall: ToolCall;
}

const TOOL_ICONS: Record<string, string> = {
  create_task: 'task_alt',
  list_tasks: 'checklist',
  update_task: 'edit',
  create_project: 'folder',
  list_projects: 'folder_open',
  get_project: 'folder_special',
  update_project: 'drive_file_rename_outline',
  create_idea: 'lightbulb',
  list_ideas: 'tips_and_updates',
  get_idea: 'emoji_objects',
  validate_idea: 'gavel',
  promote_idea_to_project: 'trending_up',
  capture_item: 'add_circle',
  list_inbox: 'inbox',
  process_inbox_item: 'move_to_inbox',
  log_health: 'favorite',
  search_memory: 'psychology',
  get_dashboard_summary: 'dashboard',
  navigate: 'open_in_new',
};

const TOOL_COLORS: Record<string, string> = {
  create_task: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  create_project: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  create_idea: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  validate_idea: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  capture_item: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  log_health: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  navigate: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

export function ToolExecutionCard({ toolCall }: ToolExecutionCardProps) {
  const icon = TOOL_ICONS[toolCall.tool] || 'build';
  const colorClass = TOOL_COLORS[toolCall.tool] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  const message = toolCall.result.data?.message || toolCall.tool.replace(/_/g, ' ');

  return (
    <div className={`flex items-start gap-3 px-3 py-2 rounded-lg border ${colorClass} text-sm`}>
      <span className="material-symbols-outlined text-[18px] mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium">{message}</span>
        {toolCall.result.data?.id && (
          <span className="ml-2 text-xs opacity-60">({toolCall.result.data.id})</span>
        )}
        {!toolCall.result.success && (
          <p className="text-red-400 text-xs mt-1">{toolCall.result.error}</p>
        )}
      </div>
      <span className="material-symbols-outlined text-[16px]">
        {toolCall.result.success ? 'check_circle' : 'error'}
      </span>
    </div>
  );
}
