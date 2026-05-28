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
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { page: 'projects', label: 'Projects', icon: <FolderKanban size={17} /> },
  { page: 'session', label: 'Session', icon: <TerminalSquare size={17} /> },
  { page: 'settings', label: 'Settings', icon: <Settings size={17} /> },
];

export function AppLayout({ page, health, children, onNavigate }: AppLayoutProps) {
  return (
    <main className="app-shell app-shell-topbar">
      <header className="topbar">
        <button className="topbar-brand" onClick={() => onNavigate('dashboard')}>
          <span className="brand-mark compact">
            <Code2 size={21} />
          </span>

          <span>
            <strong>Zero Runtime</strong>
            <small>Local cockpit</small>
          </span>
        </button>

        <nav className="topbar-nav" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <button
              key={item.page}
              className={page === item.page ? 'active' : ''}
              onClick={() => onNavigate(item.page)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-status">
          <RuntimeStatus health={health} compact />
        </div>
      </header>

      <section className="content content-wide">{children}</section>
    </main>
  );
}
