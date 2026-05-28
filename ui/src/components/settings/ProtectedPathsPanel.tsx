import { ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SettingsSection } from './SettingsSection';
import type { ProtectedPathSettings } from './SettingsTypes';

interface ProtectedPathsPanelProps {
  value: ProtectedPathSettings;
  onChange: (value: ProtectedPathSettings) => void;
}

export function ProtectedPathsPanel({ value, onChange }: ProtectedPathsPanelProps) {
  const [newPath, setNewPath] = useState('');

  function addPath() {
    const normalized = newPath.trim();

    if (normalized.length === 0 || value.paths.includes(normalized)) {
      return;
    }

    onChange({
      paths: [...value.paths, normalized],
    });

    setNewPath('');
  }

  function removePath(path: string) {
    onChange({
      paths: value.paths.filter((item) => item !== path),
    });
  }

  return (
    <SettingsSection
      title="Protected paths"
      description="Paths that should never be edited, leaked or included in unsafe context."
    >
      <div className="flex flex-col p-4 rounded-lg border border-red-500/20 bg-red-500/5 mb-2">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <strong className="block text-sm font-medium text-red-200">Add protected path</strong>
            <span className="block text-xs text-red-200/70 mt-1">
              Examples: .env, node_modules, .git, secrets.
            </span>

            <div className="flex items-center gap-2 mt-3">
              <input
                className="flex-1 rounded-md border border-red-500/30 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                value={newPath}
                placeholder=".env"
                onChange={(event) => setNewPath(event.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPath()}
              />
              <button
                className="rounded-md bg-red-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shrink-0"
                onClick={addPath}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {value.paths.map((path) => (
          <div
            className="flex items-center justify-between gap-3 p-3 rounded-md border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors group"
            key={path}
          >
            <code className="text-sm font-mono text-zinc-300 truncate">{path}</code>
            <button
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 focus:outline-none focus:opacity-100 shrink-0"
              onClick={() => removePath(path)}
              title="Remove path"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Remove</span>
            </button>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
