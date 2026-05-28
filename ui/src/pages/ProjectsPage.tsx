import { useEffect, useMemo, useState } from 'react';
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
  ProjectProfile,
  ProjectRegistry,
  WorkspaceMode,
} from '../types/runtime';

interface ProjectsPageProps {
  selectedProject: ProjectProfile | null;
  onProjectSelected: (project: ProjectProfile) => void;
  onStartSession: (project: ProjectProfile) => void;
}

interface ProjectReadinessItem {
  label: string;
  ready: boolean;
  description: string;
}

export function ProjectsPage({
  selectedProject,
  onProjectSelected,
  onStartSession,
}: ProjectsPageProps) {
  const [registry, setRegistry] = useState<ProjectRegistry | null>(null);
  const [roots, setRoots] = useState<LocalDirectoryEntry[]>([]);
  const [directory, setDirectory] = useState<LocalDirectoryListResult | null>(null);
  const [rootPath, setRootPath] = useState('');
  const [name, setName] = useState('');
  const [workingMode, setWorkingMode] = useState<WorkspaceMode>('local_snapshot');
  const [loading, setLoading] = useState(false);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [lastScannedProject, setLastScannedProject] = useState<ProjectProfile | null>(null);

  const canScan = rootPath.trim().length > 0 && !loading;
  const selectedFolderName = rootPath ? defaultNameFromPath(rootPath) : 'No folder selected';
  const currentProject = selectedProject ?? lastScannedProject;

  const projectReadiness = useMemo<ProjectReadinessItem[]>(() => {
    if (!currentProject) {
      return [
        {
          label: 'package.json',
          ready: false,
          description: 'Scan a project to detect Node/React/Express metadata.',
        },
        {
          label: 'tsconfig',
          ready: false,
          description: 'TypeScript detection appears after scan.',
        },
        {
          label: 'src',
          ready: false,
          description: 'Source directory detection appears after scan.',
        },
        {
          label: 'Prisma',
          ready: false,
          description: 'Database tooling detection appears after scan.',
        },
      ];
    }

    return [
      {
        label: 'package.json',
        ready: currentProject.hasPackageJson,
        description: currentProject.hasPackageJson
          ? 'Project metadata found.'
          : 'No package.json detected.',
      },
      {
        label: 'tsconfig',
        ready: currentProject.hasTsConfig,
        description: currentProject.hasTsConfig
          ? 'TypeScript configuration found.'
          : 'No tsconfig detected.',
      },
      {
        label: 'src',
        ready: currentProject.hasSrcDirectory,
        description: currentProject.hasSrcDirectory
          ? 'Source directory found.'
          : 'No src directory detected.',
      },
      {
        label: 'Prisma',
        ready: currentProject.hasPrismaSchema,
        description: currentProject.hasPrismaSchema
          ? 'Prisma schema found.'
          : 'No Prisma schema detected.',
      },
    ];
  }, [currentProject]);

  async function refreshProjects() {
    const updated = await listProjects();

    setRegistry(updated);

    const current =
      updated.projects.find((project) => project.id === updated.currentProjectId) ??
      updated.projects.at(0) ??
      null;

    if (current) {
      onProjectSelected(current);
      setRootPath(current.rootPath);
      setName(current.name);
      setWorkingMode(current.workingMode as WorkspaceMode);
      setLastScannedProject(current);
    }
  }

  async function refreshRoots() {
    setRootsLoading(true);

    try {
      setRoots(await listFilesystemRoots());
    } finally {
      setRootsLoading(false);
    }
  }

  async function openDirectory(path: string) {
    setDirectoryLoading(true);

    try {
      const result = await listFilesystemChildren(path);

      setDirectory(result);
      setRootPath(result.currentPath);

      if (name.trim().length === 0) {
        setName(defaultNameFromPath(result.currentPath));
      }
    } finally {
      setDirectoryLoading(false);
    }
  }

  async function addProject() {
    setLoading(true);

    try {
      const updated = await scanProject({
        rootPath,
        name: name.trim().length > 0 ? name : defaultNameFromPath(rootPath),
        workingMode,
      });

      setRegistry(updated);

      const selected =
        updated.projects.find((project) => project.id === updated.currentProjectId) ??
        updated.projects.find((project) => project.rootPath === rootPath) ??
        null;

      if (selected) {
        onProjectSelected(selected);
        setRootPath(selected.rootPath);
        setName(selected.name);
        setWorkingMode(selected.workingMode as WorkspaceMode);
        setLastScannedProject(selected);
      }
    } finally {
      setLoading(false);
    }
  }

  function selectProjectPath(path: string) {
    setRootPath(path);
    setName(defaultNameFromPath(path));
  }

  function selectRegisteredProject(project: ProjectProfile) {
    onProjectSelected(project);
    setRootPath(project.rootPath);
    setName(project.name);
    setWorkingMode(project.workingMode as WorkspaceMode);
    setLastScannedProject(project);
  }
  function startGuidedSession(project: ProjectProfile) {
    onProjectSelected(project);
    setRootPath(project.rootPath);
    setName(project.name);
    setWorkingMode(project.workingMode as WorkspaceMode);
    setLastScannedProject(project);
    onStartSession(project);
  }
  useEffect(() => {
    void refreshProjects();
    void refreshRoots();
  }, []);

  return (
    <section className="project-onboarding-page">
      <article className="panel project-onboarding-hero">
        <div>
          <Badge tone="blue">local first</Badge>
          <h1>Open a local project</h1>
          <p className="muted">
            Pick the folder that contains your app. Zero scans project metadata only, then prepares
            a safer guided workflow from the Session page.
          </p>
        </div>

        <div className="project-onboarding-path">
          <OnboardingStep number="1" label="Choose folder" active done={rootPath.length > 0} />
          <OnboardingStep
            number="2"
            label="Scan project"
            active={rootPath.length > 0}
            done={currentProject !== null}
          />
          <OnboardingStep
            number="3"
            label="Start session"
            active={currentProject !== null}
            done={selectedProject !== null}
          />
        </div>
      </article>

      <section className="project-onboarding-grid">
        <article className="panel project-folder-panel">
          <div className="project-panel-heading">
            <div>
              <span className="project-panel-kicker">Step 1</span>
              <h2>Choose the project folder</h2>
              <p className="muted">
                Select the app root folder. A good project root usually contains package.json, src,
                tsconfig or framework files.
              </p>
            </div>

            <Badge tone="green">safe browse</Badge>
          </div>

          <div className="project-selected-folder-card">
            <div>
              <span>Selected folder</span>
              <strong>{selectedFolderName}</strong>
              <code>{rootPath || 'Choose a folder from the browser below.'}</code>
            </div>

            <Badge tone={rootPath ? 'green' : 'yellow'}>{rootPath ? 'selected' : 'required'}</Badge>
          </div>

          <div className="project-browser-modern">
            <aside className="project-root-list">
              <div className="project-browser-mini-header">
                <strong>Roots</strong>
                <button className="secondary-button" onClick={() => void refreshRoots()}>
                  Refresh
                </button>
              </div>

              <div className="project-browser-list">
                {rootsLoading ? (
                  <EmptyProjectNote
                    title="Loading roots"
                    message="Reading local filesystem roots."
                  />
                ) : roots.length === 0 ? (
                  <EmptyProjectNote
                    title="No roots loaded"
                    message="Check that the local runtime server is running."
                  />
                ) : (
                  roots.map((root) => (
                    <button
                      className="project-root-button"
                      key={root.path}
                      onClick={() => void openDirectory(root.path)}
                    >
                      <strong>{root.name}</strong>
                      <small>{root.path}</small>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="project-directory-panel">
              <div className="project-directory-toolbar">
                <div>
                  <strong>{directory?.currentPath ?? 'Select a root to browse'}</strong>
                  <p className="muted">
                    Open folders until you find the app root, then click Use this folder.
                  </p>
                </div>

                {directory?.parentPath ? (
                  <button
                    className="secondary-button"
                    onClick={() => void openDirectory(directory.parentPath ?? '')}
                  >
                    Up
                  </button>
                ) : null}
              </div>

              <div className="project-browser-list project-directory-list">
                {directoryLoading ? (
                  <EmptyProjectNote title="Opening folder" message="Loading child folders." />
                ) : directory?.entries.filter((entry) => entry.kind === 'directory').length ? (
                  directory.entries
                    .filter((entry) => entry.kind === 'directory')
                    .map((entry) => (
                      <div className="project-directory-row" key={entry.path}>
                        <button onClick={() => void openDirectory(entry.path)}>
                          <strong>{entry.name}</strong>
                          <small>{entry.path}</small>
                        </button>

                        <div className="project-directory-actions">
                          {entry.hasPackageJson ? <Badge tone="green">package.json</Badge> : null}
                          {entry.hasZeroConfig ? <Badge tone="blue">.zero</Badge> : null}

                          <button onClick={() => selectProjectPath(entry.path)}>
                            Use this folder
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <EmptyProjectNote
                    title="No folder opened yet"
                    message="Select a root on the left to start browsing."
                  />
                )}
              </div>
            </section>
          </div>
        </article>

        <aside className="project-onboarding-side">
          <article className="panel project-scan-card">
            <div className="project-panel-heading compact">
              <div>
                <span className="project-panel-kicker">Step 2</span>
                <h2>Scan and use</h2>
                <p className="muted">Register the selected folder as a local Zero project.</p>
              </div>
            </div>

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
                onChange={(event) => setWorkingMode(event.target.value as WorkspaceMode)}
              >
                <option value="local_snapshot">local_snapshot — safest default</option>
                <option value="local_patchless">local_patchless — analyze only</option>
                <option value="git_diff">git_diff — prepare changes as git diff</option>
                <option value="git_branch_pr">git_branch_pr — branch/PR workflow</option>
              </select>
            </label>

            <button
              className="project-primary-action"
              disabled={!canScan}
              onClick={() => void addProject()}
            >
              {loading ? 'Scanning project...' : 'Scan and use project'}
            </button>

            <p className="project-small-help">
              Recommended: <strong>local_snapshot</strong>. It keeps Zero conservative and
              recovery-friendly.
            </p>
          </article>

          <article className="panel project-detection-card">
            <div className="project-panel-heading compact">
              <div>
                <span className="project-panel-kicker">Detected</span>
                <h2>Project summary</h2>
                <p className="muted">
                  After scan, Zero shows the stack and signals it can use for guided sessions.
                </p>
              </div>
            </div>

            {currentProject ? (
              <>
                <div className="project-current-card">
                  <strong>{currentProject.name}</strong>
                  <code>{currentProject.rootPath}</code>
                </div>

                <div className="project-stack-modern">
                  {currentProject.stack.length ? (
                    currentProject.stack.map((stack) => (
                      <Badge
                        key={stack}
                        tone={stack === 'pern' || stack === 'mern' ? 'green' : 'blue'}
                      >
                        {stack}
                      </Badge>
                    ))
                  ) : (
                    <Badge tone="slate">stack unknown</Badge>
                  )}
                </div>

                <div className="project-readiness-list">
                  {projectReadiness.map((item) => (
                    <div
                      className={
                        item.ready ? 'project-readiness-item ready' : 'project-readiness-item'
                      }
                      key={item.label}
                    >
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.description}</p>
                      </div>

                      <Badge tone={item.ready ? 'green' : 'slate'}>
                        {item.ready ? 'found' : 'missing'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="project-session-cta">
                  <div>
                    <strong>Project is ready</strong>
                    <p>Continue to Session to create a guided goal and prepare the workflow.</p>
                  </div>

                  <button onClick={() => startGuidedSession(currentProject)}>
                    Start guided session
                  </button>
                </div>
              </>
            ) : (
              <EmptyProjectNote
                title="No scan yet"
                message="Choose a folder and scan it to see project intelligence here."
              />
            )}
          </article>
        </aside>
      </section>

      <article className="panel project-registered-modern">
        <div className="project-panel-heading">
          <div>
            <span className="project-panel-kicker">Previously scanned</span>
            <h2>Registered projects</h2>
            <p className="muted">Use an existing project when you want to continue quickly.</p>
          </div>

          <Badge tone={registry?.projects.length ? 'green' : 'slate'}>
            {registry?.projects.length ?? 0} registered
          </Badge>
        </div>

        <div className="project-registered-grid">
          {registry?.projects.length ? (
            registry.projects.map((project) => (
              <article
                className={
                  selectedProject?.id === project.id
                    ? 'project-registered-card active'
                    : 'project-registered-card'
                }
                key={project.id}
              >
                <div>
                  <strong>{project.name}</strong>
                  <p>{project.rootPath}</p>
                </div>

                <div className="project-stack-modern">
                  {project.stack.map((stack) => (
                    <Badge
                      key={stack}
                      tone={stack === 'pern' || stack === 'mern' ? 'green' : 'blue'}
                    >
                      {stack}
                    </Badge>
                  ))}
                </div>

                <div className="project-card-meta-modern">
                  <span>Mode: {project.workingMode}</span>
                  <span>Package manager: {project.packageManager}</span>
                </div>

                <div className="project-card-actions">
                  {selectedProject?.id === project.id ? <Badge tone="green">Current</Badge> : null}
                  <button onClick={() => selectRegisteredProject(project)}>Select</button>
                  <button onClick={() => startGuidedSession(project)}>Start session</button>
                </div>
              </article>
            ))
          ) : (
            <EmptyProjectNote
              title="No projects registered"
              message="Browse and scan a local project to add it here."
            />
          )}
        </div>
      </article>
    </section>
  );
}

function OnboardingStep({
  number,
  label,
  active,
  done,
}: {
  number: string;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={
        done
          ? 'project-onboarding-step done'
          : active
            ? 'project-onboarding-step active'
            : 'project-onboarding-step'
      }
    >
      <span>{number}</span>
      <strong>{label}</strong>
    </div>
  );
}

function EmptyProjectNote({ title, message }: { title: string; message: string }) {
  return (
    <article className="project-empty-note project-empty-note-modern">
      <strong>{title}</strong>
      <p>{message}</p>
    </article>
  );
}

function defaultNameFromPath(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const parts = normalized.split('/').filter((part) => part.trim().length > 0);

  return parts.at(-1) ?? 'target-project';
}
