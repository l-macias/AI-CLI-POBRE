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
      <div className="settings-row">
        <div className="settings-row-title">
          <ShieldAlert size={18} />
          <div>
            <strong>Add protected path</strong>
            <span>Examples: .env, node_modules, .git, secrets.</span>
          </div>
        </div>

        <div className="settings-inline-form">
          <input
            value={newPath}
            placeholder=".env"
            onChange={(event) => setNewPath(event.target.value)}
          />
          <button onClick={addPath}>Add</button>
        </div>
      </div>

      <div className="protected-path-list">
        {value.paths.map((path) => (
          <div className="protected-path-item" key={path}>
            <code>{path}</code>
            <button className="danger-button" onClick={() => removePath(path)}>
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
