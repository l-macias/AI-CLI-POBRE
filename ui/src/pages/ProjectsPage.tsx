import { useEffect, useState } from 'react';
import {
  listFilesystemChildren,
  listFilesystemRoots,
  listProjects,
  scanProject,
} from '../api/runtimeApi';
import { Badge } from '../components/Badge';
import type {
  LocalDirectoryEntry,
  LocalDirectoryListResult,
  ProjectRegistry,
} from '../types/runtime';

export function ProjectsPage() {
  const [registry, setRegistry] = useState<ProjectRegistry | null>(null);
  const [roots, setRoots] = useState<LocalDirectoryEntry[]>([]);
  const [directory, setDirectory] = useState<LocalDirectoryListResult | null>(null);
  const [rootPath, setRootPath] = useState('');
  const [name, setName] = useState('');
  const [workingMode, setWorkingMode] = useState<
    'local_patchless' | 'local_snapshot' | 'git_diff' | 'git_branch_pr'
  >('local_snapshot');

  async function refreshProjects() {
    setRegistry(await listProjects());
  }

  async function refreshRoots() {
    setRoots(await listFilesystemRoots());
  }

  async function openDirectory(path: string) {
    const result = await listFilesystemChildren(path);

    setDirectory(result);
    setRootPath(result.currentPath);

    if (name.trim().length === 0) {
      setName(defaultNameFromPath(result.currentPath));
    }
  }

  async function addProject() {
    const updated = await scanProject({
      rootPath,
      name: name.trim().length > 0 ? name : defaultNameFromPath(rootPath),
      workingMode,
    });

    setRegistry(updated);
  }

  function selectProjectPath(path: string) {
    setRootPath(path);
    setName(defaultNameFromPath(path));
  }

  useEffect(() => {
    void refreshProjects();
    void refreshRoots();
  }, []);

  return (
    <section className="project-picker-page">
      <article className="panel">
        <div className="panel-header">
          <div>
            <h1>Project Picker</h1>
            <p className="muted">Browse your local disk, select a project and register it.</p>
          </div>
          <Badge tone="green">local</Badge>
        </div>

        <div className="browser-layout">
          <section className="browser-sidebar">
            <h3>Roots</h3>
            <div className="browser-list">
              {roots.map((root) => (
                <button
                  className="browser-row"
                  key={root.path}
                  onClick={() => void openDirectory(root.path)}
                >
                  {root.name}
                </button>
              ))}
            </div>
          </section>

          <section className="browser-main">
            <div className="browser-toolbar">
              <div>
                <strong>{directory?.currentPath ?? 'Select a root'}</strong>
                <p className="muted">Folders only are selectable as projects.</p>
              </div>

              {directory?.parentPath ? (
                <button onClick={() => void openDirectory(directory.parentPath ?? '')}>Up</button>
              ) : null}
            </div>

            <div className="browser-list">
              {directory?.entries
                .filter((entry) => entry.kind === 'directory')
                .map((entry) => (
                  <div className="browser-entry" key={entry.path}>
                    <button onClick={() => void openDirectory(entry.path)}>
                      <span>{entry.name}</span>
                      <small>{entry.path}</small>
                    </button>

                    <div className="entry-actions">
                      {entry.hasPackageJson ? <Badge tone="green">package.json</Badge> : null}
                      {entry.hasZeroConfig ? <Badge tone="blue">.zero</Badge> : null}
                      <button onClick={() => selectProjectPath(entry.path)}>Select</button>
                    </div>
                  </div>
                )) ?? <p className="muted">Choose a drive or folder.</p>}
            </div>
          </section>
        </div>
      </article>

      <article className="panel">
        <h2>Add selected project</h2>

        <label>
          Project root
          <input value={rootPath} onChange={(event) => setRootPath(event.target.value)} />
        </label>

        <label>
          Project name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label>
          Workspace mode
          <select
            value={workingMode}
            onChange={(event) => setWorkingMode(event.target.value as typeof workingMode)}
          >
            <option value="local_snapshot">local_snapshot</option>
            <option value="local_patchless">local_patchless</option>
            <option value="git_diff">git_diff</option>
            <option value="git_branch_pr">git_branch_pr</option>
          </select>
        </label>

        <button disabled={rootPath.trim().length === 0} onClick={() => void addProject()}>
          Scan and add project
        </button>
      </article>

      <article className="panel project-list-panel">
        <h2>Registered projects</h2>

        <div className="cards">
          {registry?.projects.length ? (
            registry.projects.map((project) => (
              <div className="project-card" key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <p>{project.rootPath}</p>
                </div>

                <div className="stack-row">
                  {project.stack.map((stack) => (
                    <Badge
                      key={stack}
                      tone={stack === 'pern' || stack === 'mern' ? 'green' : 'blue'}
                    >
                      {stack}
                    </Badge>
                  ))}
                </div>

                <div className="project-meta">
                  <span>Mode: {project.workingMode}</span>
                  <span>Git required: {project.gitRequired ? 'yes' : 'no'}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No projects registered.</p>
          )}
        </div>
      </article>
    </section>
  );
}

function defaultNameFromPath(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const parts = normalized.split('/').filter((part) => part.trim().length > 0);

  return parts.at(-1) ?? 'target-project';
}
