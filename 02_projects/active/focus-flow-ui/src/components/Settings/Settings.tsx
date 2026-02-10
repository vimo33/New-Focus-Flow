import { useState } from 'react';

type Tab = 'general' | 'guide';

interface Section {
  id: string;
  icon: string;
  title: string;
  content: React.ReactNode;
}

export function Settings() {
  const [tab, setTab] = useState<Tab>('guide');
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <span className="material-symbols-outlined text-primary text-[28px]">settings</span>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-dark rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('general')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'general' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            General
          </span>
        </button>
        <button
          onClick={() => setTab('guide')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'guide' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            Power User Guide
          </span>
        </button>
      </div>

      {tab === 'general' && <GeneralSettings darkMode={darkMode} onToggleDark={toggleDarkMode} />}
      {tab === 'guide' && <PowerUserGuide />}
    </div>
  );
}

/* ─── General Settings ─── */
function GeneralSettings({ darkMode, onToggleDark }: { darkMode: boolean; onToggleDark: () => void }) {
  return (
    <div className="space-y-6">
      <SettingCard
        icon="dark_mode"
        title="Appearance"
        description="Toggle between dark and light mode"
      >
        <button
          onClick={onToggleDark}
          className="flex items-center gap-3 px-4 py-2.5 bg-card-dark rounded-lg hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
          <span className="text-sm text-white font-medium">
            {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </span>
        </button>
      </SettingCard>

      <SettingCard
        icon="mic"
        title="Voice Bridge"
        description="Local Whisper STT and Piper TTS at 127.0.0.1:8473. When the bridge is running, voice input uses local Whisper for faster, offline transcription. Otherwise falls back to browser speech."
      >
        <div className="text-xs text-slate-500 font-mono">
          Detected automatically on page load
        </div>
      </SettingCard>
    </div>
  );
}

function SettingCard({ icon, title, description, children }: {
  icon: string; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-dark rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold mb-1">{title}</h3>
          <p className="text-slate-400 text-sm mb-3">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Power User Guide ─── */
function PowerUserGuide() {
  const sections: Section[] = [
    {
      id: 'philosophy',
      icon: 'psychology',
      title: 'How Focus Flow Works',
      content: (
        <div className="space-y-3">
          <p>
            Focus Flow is built around one principle: <Strong>capture fast, process later, execute with focus.</Strong> Everything
            flows through a pipeline that turns raw thoughts into structured outcomes.
          </p>
          <FlowDiagram steps={['Capture', 'Inbox', 'Route', 'Execute', 'Review']} />
          <p>
            Thoughts enter via <Strong>Capture</Strong> (text, voice, or Telegram). They land in your <Strong>Inbox</Strong> where
            AI auto-classifies them. You <Strong>Route</Strong> items to Projects, Tasks, or Ideas. You <Strong>Execute</Strong> from
            your Calendar and Project views. You <Strong>Review</Strong> progress on the Dashboard.
          </p>
        </div>
      ),
    },
    {
      id: 'capture',
      icon: 'add_circle',
      title: 'Capture — Get It Out of Your Head',
      content: (
        <div className="space-y-3">
          <p>The Capture page is your universal inbox. Think of it like a brain dump with superpowers.</p>
          <KeyboardShortcuts shortcuts={[
            { keys: ['Cmd', 'Enter'], action: 'Submit capture' },
            { keys: ['V'], action: 'Start voice input (when not typing)' },
          ]} />
          <Tips tips={[
            'Add an emoji prefix to pre-tag items before AI classifies them',
            'Voice captures are transcribed and classified the same way as text',
            'Every capture shows its AI classification with a confidence indicator',
            'Hit Undo within 5 seconds if you made a mistake',
          ]} />
        </div>
      ),
    },
    {
      id: 'inbox',
      icon: 'inbox',
      title: 'Inbox — Triage and Route',
      content: (
        <div className="space-y-3">
          <p>
            Your inbox is the processing hub. Items arrive pre-classified by AI into <Strong>Work</Strong>, <Strong>Personal</Strong>,
            and <Strong>Ideas</Strong> categories.
          </p>
          <h4 className="text-white font-medium text-sm">Processing workflow:</h4>
          <ol className="list-decimal list-inside text-slate-300 text-sm space-y-1">
            <li>Filter by category using the tabs</li>
            <li>Click <Strong>Process</Strong> on an item to route it to a Project, Task, or Idea</li>
            <li>Use checkboxes for batch archive/delete operations</li>
            <li>Search to find items by text or category</li>
          </ol>
          <Tips tips={[
            'Process your inbox daily — aim for Inbox Zero',
            'Items tagged "Quick" can be done in under 5 minutes',
            'Items tagged "Deep Work" need a focus block on your calendar',
          ]} />
        </div>
      ),
    },
    {
      id: 'projects',
      icon: 'folder',
      title: 'Projects — Your Active Workstreams',
      content: (
        <div className="space-y-3">
          <p>
            Projects are the core execution unit. Each project tracks tasks, progress, and status.
          </p>
          <h4 className="text-white font-medium text-sm">Project lifecycle:</h4>
          <FlowDiagram steps={['Create', 'Active', 'Paused', 'Completed']} />
          <Tips tips={[
            'Filter by Active/Paused to focus on what matters now',
            'Progress bars show task completion ratio at a glance',
            'Click into a project to manage tasks, add notes, and track milestones',
            'Ideas that pass AI validation can be promoted directly to projects',
          ]} />
        </div>
      ),
    },
    {
      id: 'ideas',
      icon: 'lightbulb',
      title: 'Ideas — From Spark to Validated Concept',
      content: (
        <div className="space-y-3">
          <p>
            The Ideas pipeline is unique to Focus Flow. It lets you validate ideas with an <Strong>AI Council</Strong> before
            investing time.
          </p>
          <h4 className="text-white font-medium text-sm">The idea journey:</h4>
          <FlowDiagram steps={['Capture', 'AI Expand', 'Council Vote', 'Promote']} />
          <ol className="list-decimal list-inside text-slate-300 text-sm space-y-1">
            <li><Strong>Capture</Strong> — write a raw idea (even a one-liner)</li>
            <li><Strong>AI Expand</Strong> — AI generates problem statement, solution, target users, value prop, risks, and competitive landscape</li>
            <li><Strong>Council Vote</Strong> — three AI evaluators score your idea independently, then synthesize a verdict (Approve / Needs Info / Reject)</li>
            <li><Strong>Promote</Strong> — approved ideas become Projects with one click</li>
          </ol>
          <Tips tips={[
            'You can expand and validate independently — expand first to give the council more to work with',
            'Rejected ideas show reasoning so you can iterate',
            'The confidence score helps you prioritize which ideas to pursue',
          ]} />
        </div>
      ),
    },
    {
      id: 'calendar',
      icon: 'calendar_month',
      title: 'Calendar — Time Blocking and Focus',
      content: (
        <div className="space-y-3">
          <p>
            The calendar shows your week view with events, tasks, reminders, and focus blocks color-coded by type.
          </p>
          <Tips tips={[
            'Click any time slot to quick-add an event',
            'Use the Today button to jump back to current week',
            'Focus blocks are highlighted distinctly — protect them for deep work',
            'Events linked to projects show the project name',
          ]} />
        </div>
      ),
    },
    {
      id: 'wellbeing',
      icon: 'favorite',
      title: 'Wellbeing — Track What Matters',
      content: (
        <div className="space-y-3">
          <p>
            Daily logging of mood, energy, sleep, and exercise. The system tracks trends and nudges you toward better habits.
          </p>
          <h4 className="text-white font-medium text-sm">Three views:</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li><Strong>Daily Log</Strong> — sliders for mood/energy, +/- buttons for sleep hours and exercise minutes. Hit Save to record.</li>
            <li><Strong>Trends</Strong> — 14-day sparkline charts for all four metrics, spot patterns at a glance.</li>
            <li><Strong>History</Strong> — active wellness experiments with their start dates and tracked metrics.</li>
          </ul>
          <Tips tips={[
            'Coach nudges appear contextually based on your recent logs',
            'Export a PDF report for sharing with a coach or therapist',
            'Log consistently — even a 30-second daily check-in builds valuable data',
          ]} />
        </div>
      ),
    },
    {
      id: 'sales',
      icon: 'monetization_on',
      title: 'Sales Pipeline — Track Deals',
      content: (
        <div className="space-y-3">
          <p>
            A Kanban board for your sales pipeline. Deals flow through 7 stages from Lead to Won/Lost.
          </p>
          <FlowDiagram steps={['Lead', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'Won']} />
          <Tips tips={[
            'Use the arrow buttons on deal cards to advance or retreat stages',
            'Summary row shows total pipeline value and deal counts',
            'Won and Lost are terminal stages',
          ]} />
        </div>
      ),
    },
    {
      id: 'crm',
      icon: 'contacts',
      title: 'CRM — Contact Management',
      content: (
        <div className="space-y-3">
          <p>
            Simple contact database with tagging. Search by name, email, or company.
          </p>
          <Tips tips={[
            'Use comma-separated tags when creating contacts for easy filtering',
            'Search activates with 2+ characters for fast filtering',
            'Click email or phone icons to quick-action',
          ]} />
        </div>
      ),
    },
    {
      id: 'voice',
      icon: 'mic',
      title: 'Voice Assistant — Hands-Free Control',
      content: (
        <div className="space-y-3">
          <p>
            The Voice page is a full conversational interface. Speak commands and the system executes them — navigating pages,
            creating items, querying data, and more.
          </p>
          <h4 className="text-white font-medium text-sm">Two interfaces:</h4>
          <ul className="text-slate-300 text-sm space-y-2">
            <li><Strong>Voice page</Strong> — 3-panel cockpit with thread history, chat, and suggested actions. Best for extended sessions.</li>
            <li><Strong>Command Center</Strong> — text-first interface with tool execution cards. Best for precise commands.</li>
            <li><Strong>Floating mic button</Strong> — available on every page (bottom-right). Quick one-off commands without leaving your current context.</li>
          </ul>
          <h4 className="text-white font-medium text-sm mt-2">Supported voice commands:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CommandGroup title="Navigate" commands={[
              '"Go to inbox"',
              '"Show projects"',
              '"Open calendar"',
              '"Go to ideas"',
            ]} />
            <CommandGroup title="Create" commands={[
              '"Create a task: Review Q2 goals"',
              '"New project: Mobile App"',
              '"Capture: Remember to call dentist"',
            ]} />
            <CommandGroup title="Query" commands={[
              '"How many items in inbox?"',
              '"What\'s my agenda?"',
              '"Show my tasks"',
            ]} />
            <CommandGroup title="Update" commands={[
              '"Mark task as done"',
              '"Delete that item" (asks for confirmation)',
            ]} />
          </div>
          <Tips tips={[
            'Hands-free mode keeps the mic open continuously — toggle it in the Voice HUD',
            'When a local voice bridge is running, transcription uses Whisper (faster, offline) and TTS uses Piper (natural voice)',
            'Destructive actions always require confirmation in the Actions panel',
            'The amber "Transcribing" state means your audio is being processed — wait for the result',
          ]} />
        </div>
      ),
    },
    {
      id: 'poweruser',
      icon: 'bolt',
      title: 'Power User Workflows',
      content: (
        <div className="space-y-4">
          <Workflow
            title="Morning Review (2 min)"
            steps={[
              'Open Dashboard — check Today\'s Brief for active projects and priority tasks',
              'Glance at Inbox count — process anything urgent',
              'Check Calendar for the day\'s schedule and focus blocks',
              'Log yesterday\'s wellbeing if you missed it',
            ]}
          />
          <Workflow
            title="Idea-to-Project Pipeline"
            steps={[
              'Capture a raw idea (even a single sentence)',
              'Open Ideas page, find it in Inbox filter',
              'Click AI Expand to auto-generate problem/solution/risks',
              'Click Validate with AI Council — wait for verdict',
              'If approved, click Promote to Project',
            ]}
          />
          <Workflow
            title="Voice-First Productivity"
            steps={[
              'Open Voice page or use the floating mic on any page',
              'Say "Create a task: Write project brief by Friday"',
              'Say "Go to inbox" to check new captures',
              'Say "How many items in inbox?" for a quick count',
              'Use hands-free mode for extended voice sessions',
            ]}
          />
          <Workflow
            title="Weekly Review (5 min)"
            steps={[
              'Dashboard — review active projects progress bars',
              'Ideas — check if any validated ideas are ready to promote',
              'Wellbeing Trends — scan 14-day mood and energy charts',
              'Inbox — batch archive processed items to start fresh',
              'Sales — review pipeline value and move deals forward',
            ]}
          />
        </div>
      ),
    },
    {
      id: 'keyboard',
      icon: 'keyboard',
      title: 'Keyboard Shortcuts',
      content: (
        <div className="space-y-3">
          <KeyboardShortcuts shortcuts={[
            { keys: ['Cmd', 'Enter'], action: 'Submit capture / save form' },
            { keys: ['V'], action: 'Start voice input (Capture page, when not focused on text input)' },
            { keys: ['Enter'], action: 'Send message (Command Center, Voice)' },
            { keys: ['Shift', 'Enter'], action: 'New line in message (Command Center)' },
          ]} />
        </div>
      ),
    },
    {
      id: 'vault',
      icon: 'database',
      title: 'Data & Vault Architecture',
      content: (
        <div className="space-y-3">
          <p>
            Focus Flow uses a <Strong>file-based vault</Strong> — no database. Every item you create is a plain JSON file
            on disk at <code className="px-1.5 py-0.5 bg-card-dark rounded text-xs font-mono text-primary">/srv/focus-flow/</code>.
            You can read, edit, back up, or version-control your data with standard tools.
          </p>

          <h4 className="text-white font-medium text-sm">Vault directory structure:</h4>
          <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed">
            <pre className="whitespace-pre">{`/srv/focus-flow/
├── 00_inbox/
│   ├── raw/            Unprocessed captures
│   ├── archive/        Processed items
│   └── processing/     Being classified by AI
├── 01_tasks/
│   ├── work/           Work category
│   ├── personal/       Personal category
│   └── scheduled/      Time-blocked tasks
├── 02_projects/
│   ├── active/         Active projects + source repos
│   ├── paused/         On hold
│   └── completed/      Done
├── 03_ideas/
│   ├── inbox/          Raw ideas
│   ├── validated/      Passed AI Council
│   └── rejected/       Did not pass
├── 06_health/logs/     CSV + JSON health entries
├── 08_threads/         Voice & command conversations
└── 09_crm/
    ├── contacts/       People
    ├── deals/          Sales pipeline
    └── interactions/   Activity log`}</pre>
          </div>

          <h4 className="text-white font-medium text-sm">How it works:</h4>
          <ul className="text-slate-300 text-sm space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">-</span>
              <span>Each entity is <Strong>one JSON file</Strong> named by its ID, e.g. <code className="px-1 py-0.5 bg-card-dark rounded text-xs font-mono">task-20260210-798204.json</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">-</span>
              <span>IDs are <Strong>date-based</Strong> — <code className="px-1 py-0.5 bg-card-dark rounded text-xs font-mono">{'{type}-{YYYYMMDD}-{timestamp}'}</code> — so files sort chronologically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">-</span>
              <span><Strong>Status changes move files</Strong> between directories (e.g. idea goes from <code className="px-1 py-0.5 bg-card-dark rounded text-xs font-mono">ideas/inbox/</code> to <code className="px-1 py-0.5 bg-card-dark rounded text-xs font-mono">ideas/validated/</code>)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">-</span>
              <span>Health logs use <Strong>dual storage</Strong>: a CSV file for easy analysis + individual JSON files for rich metadata</span>
            </li>
          </ul>

          <Tips tips={[
            'Back up your vault with a simple rsync or cp -r of /srv/focus-flow/',
            'The entire vault is git-tracked — you can see full history of every change',
            'Files are human-readable — open any JSON file to inspect or hand-edit your data',
            'No database means zero setup, zero migrations, and full portability',
            'AI classification results are written back into the same JSON file as an ai_classification field',
          ]} />
        </div>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const isOpen = activeSection === section.id;
        return (
          <div key={section.id} className="bg-surface-dark rounded-xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => setActiveSection(isOpen ? null : section.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-card-dark/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]">{section.icon}</span>
              </div>
              <span className="flex-1 text-white font-semibold text-[15px]">{section.title}</span>
              <span className={`material-symbols-outlined text-slate-500 text-[20px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-slate-300 text-sm leading-relaxed border-t border-slate-700/30">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Shared sub-components ─── */

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="text-white font-medium">{children}</span>;
}

function FlowDiagram({ steps }: { steps: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap py-2">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-md border border-primary/20">
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="material-symbols-outlined text-slate-600 text-[16px]">arrow_forward</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Tips({ tips }: { tips: string[] }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-amber-400 text-[16px]">tips_and_updates</span>
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Tips</span>
      </div>
      <ul className="space-y-1">
        {tips.map((tip, i) => (
          <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-600 mt-0.5">-</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeyboardShortcuts({ shortcuts }: { shortcuts: { keys: string[]; action: string }[] }) {
  return (
    <div className="space-y-2">
      {shortcuts.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {s.keys.map((key, j) => (
              <span key={j} className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-card-dark rounded border border-slate-600 text-xs text-slate-300 font-mono min-w-[28px] text-center">
                  {key}
                </kbd>
                {j < s.keys.length - 1 && <span className="text-slate-600 text-xs">+</span>}
              </span>
            ))}
          </div>
          <span className="text-slate-400 text-sm">{s.action}</span>
        </div>
      ))}
    </div>
  );
}

function CommandGroup({ title, commands }: { title: string; commands: string[] }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <ul className="space-y-1">
        {commands.map((cmd, i) => (
          <li key={i} className="text-slate-300 text-sm font-mono">{cmd}</li>
        ))}
      </ul>
    </div>
  );
}

function Workflow({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
      <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[18px]">route</span>
        {title}
      </h4>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-slate-300">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
