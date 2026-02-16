import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VoiceControlFAB } from '../VoiceControl';
import { PWAInstallPrompt } from '../PWAInstallPrompt';
import { AgentPanel } from '../Agent/AgentPanel';
import { useAgentStore } from '../../stores/agent';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Capture', path: '/capture', icon: 'add_circle' },
  { name: 'Inbox', path: '/inbox', icon: 'inbox' },
  { name: 'Projects', path: '/projects', icon: 'folder' },
  { name: 'Calendar', path: '/calendar', icon: 'calendar_month' },
  { name: 'Wellbeing', path: '/wellbeing', icon: 'favorite' },
  { name: 'Sales', path: '/sales', icon: 'monetization_on' },
  { name: 'CRM', path: '/crm', icon: 'contacts' },
  { name: 'Voice', path: '/voice', icon: 'mic' },
  { name: 'Memory', path: '/memory', icon: 'psychology' },
  { name: 'Uploads', path: '/uploads', icon: 'upload_file' },
  { name: 'Agent', path: '/agent', icon: 'smart_toy' },
  { name: 'Command', path: '/command', icon: 'terminal' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const { unreadCount, connectSSE, fetchNotifications } = useAgentStore();

  useEffect(() => {
    connectSSE();
    fetchNotifications(true);
  }, []);

  // Ctrl+. keyboard shortcut to toggle agent panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setAgentPanelOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        {/* Desktop Sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-surface-dark">
            {/* Logo/Brand */}
            <div className="flex h-16 flex-shrink-0 items-center px-6">
              <h1 className="text-xl font-semibold text-white">
                Focus Flow
              </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg
                      transition-colors duration-150
                      ${
                        active
                          ? 'bg-primary text-white'
                          : 'text-gray-300 hover:bg-card-dark hover:text-white'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined mr-3 text-[20px]">
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Settings */}
            <div className="flex-shrink-0 p-4 border-t border-card-dark">
              <Link
                to="/settings"
                className={`flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive('/settings')
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-card-dark hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined mr-3 text-[20px]">settings</span>
                Settings
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface-dark border-t border-card-dark z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.slice(0, 5).map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center justify-center flex-1 h-full
                    ${active ? 'text-primary' : 'text-gray-400'}
                  `}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {item.icon}
                  </span>
                  <span className="text-xs mt-1">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="md:pl-64 pb-16 md:pb-0">
          <div className={`mx-auto ${
            location.pathname === '/calendar' || location.pathname.startsWith('/command') || location.pathname.startsWith('/voice')
              ? 'h-screen max-w-full p-0'
              : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8'
          }`}>
            {children}
          </div>
        </main>

        {/* Global Voice Control FAB - Show on all pages except /voice */}
        {!location.pathname.startsWith('/voice') && !location.pathname.startsWith('/command') && <VoiceControlFAB />}

        {/* Agent Panel Toggle */}
        <button
          onClick={() => setAgentPanelOpen(!agentPanelOpen)}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 bg-primary hover:bg-primary/80 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined">smart_toy</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Agent Panel */}
        <AgentPanel open={agentPanelOpen} onClose={() => setAgentPanelOpen(false)} />

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </div>
  );
}
