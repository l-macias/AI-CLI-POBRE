import { Code2, FolderKanban, Settings, TerminalSquare } from 'lucide-react';
import type { RuntimeHealth } from '../types/runtime';
import { RuntimeStatus } from '../components/RuntimeStatus';

export type AppPage = 'projects' | 'session' | 'settings';

interface AppLayoutProps {
  page: AppPage;
  health: RuntimeHealth | null;
  children: React.ReactNode;
  onNavigate: (page: AppPage) => void;
}

export function AppLayout({ page, health, children, onNavigate }: AppLayoutProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Code2 size={24} />
          </div>
          <div>
            <strong>Zero Runtime</strong>
            <span>Local cockpit</span>
          </div>
        </div>

        <nav>
          <button
            className={page === 'projects' ? 'active' : ''}
            onClick={() => onNavigate('projects')}
          >
            <FolderKanban size={18} />
            Projects
          </button>
          <button
            className={page === 'session' ? 'active' : ''}
            onClick={() => onNavigate('session')}
          >
            <TerminalSquare size={18} />
            Session
          </button>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => onNavigate('settings')}
          >
            <Settings size={18} />
            Settings
          </button>
        </nav>
      </aside>

      <section className="content">
        <RuntimeStatus health={health} />
        {children}
      </section>
    </main>
  );
}
