import { Code2, FolderKanban, LayoutDashboard, Settings, TerminalSquare } from 'lucide-react';
import type { RuntimeHealth } from '../types/runtime';
import { RuntimeStatus } from '../components/RuntimeStatus';

export type AppPage = 'dashboard' | 'projects' | 'session' | 'settings';

interface AppLayoutProps {
  page: AppPage;
  health: RuntimeHealth | null;
  children: React.ReactNode;
  onNavigate: (page: AppPage) => void;
}

const navigationItems: {
  page: AppPage;
  label: string;
  icon: React.ReactNode;
}[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { page: 'projects', label: 'Projects', icon: <FolderKanban size={18} /> },
  { page: 'session', label: 'Session', icon: <TerminalSquare size={18} /> },
  { page: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

export function AppLayout({ page, health, children, onNavigate }: AppLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col w-full">
      {/* Topbar con efecto cristal oscuro */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-4 md:px-6 backdrop-blur-md">
        {/* Brand */}
        <button
          className="flex items-center gap-3 transition-colors hover:text-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
          onClick={() => onNavigate('dashboard')}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/10">
            <Code2 size={20} />
          </div>
          <div className="flex flex-col items-start hidden sm:flex">
            <span className="text-sm font-semibold text-zinc-100 leading-tight">Zero Runtime</span>
            <span className="text-xs text-zinc-500 leading-tight">Local cockpit</span>
          </div>
        </button>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const isActive = page === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'bg-zinc-800/80 text-indigo-400 shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                }`}
              >
                {item.icon}
                <span className="hidden md:inline-block">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status */}
        <div className="flex items-center pl-4 border-l border-zinc-800/60">
          <RuntimeStatus health={health} compact />
        </div>
      </header>

      {/* Content Area */}
      <section className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
        {children}
      </section>
    </main>
  );
}
