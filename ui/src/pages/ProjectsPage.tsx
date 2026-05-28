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
      if (name.trim().length === 0) setName(defaultNameFromPath(result.currentPath));
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
    <section className="flex flex-col gap-6 md:gap-8">
      {/* Hero */}
      <article className="flex flex-col md:flex-row gap-6 md:items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 backdrop-blur-md">
        <div className="max-w-xl">
          <div className="mb-3">
            <Badge tone="blue">local first</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
            Open a local project
          </h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Pick the folder that contains your app. Zero scans project metadata only, then prepares
            a safer guided workflow from the Session page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-2">
          <OnboardingStep number="1" label="Choose folder" active done={rootPath.length > 0} />
          <div className="hidden sm:block h-[1px] w-8 bg-zinc-800" />
          <OnboardingStep
            number="2"
            label="Scan project"
            active={rootPath.length > 0}
            done={currentProject !== null}
          />
          <div className="hidden sm:block h-[1px] w-8 bg-zinc-800" />
          <OnboardingStep
            number="3"
            label="Start session"
            active={currentProject !== null}
            done={selectedProject !== null}
          />
        </div>
      </article>

      {/* Main Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Browser */}
        <article className="lg:col-span-2 flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden shadow-sm">
          <div className="border-b border-zinc-800/60 p-5 flex items-start justify-between bg-zinc-900/80">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 block">
                Step 1
              </span>
              <h2 className="text-lg font-medium text-zinc-100">Choose the project folder</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Select the app root folder containing package.json or src.
              </p>
            </div>
            <Badge tone="green">safe browse</Badge>
          </div>

          <div className="p-5 border-b border-zinc-800/60 bg-zinc-950/30 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 mb-1">Selected folder</span>
              <strong className="text-sm text-zinc-200">{selectedFolderName}</strong>
              <code className="text-xs text-zinc-400 mt-1 font-mono">
                {rootPath || 'Choose a folder from the browser below.'}
              </code>
            </div>
            <Badge tone={rootPath ? 'green' : 'yellow'}>{rootPath ? 'selected' : 'required'}</Badge>
          </div>

          <div className="flex flex-col sm:flex-row h-[400px]">
            {/* Roots Sidebar */}
            <aside className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-zinc-800/60 flex flex-col bg-zinc-950/20">
              <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/40">
                <strong className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Roots
                </strong>
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => void refreshRoots()}
                >
                  Refresh
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                      key={root.path}
                      onClick={() => void openDirectory(root.path)}
                      className="w-full flex flex-col text-left p-2 rounded-md hover:bg-zinc-800/60 transition-colors"
                    >
                      <strong className="text-sm text-zinc-200">{root.name}</strong>
                      <small className="text-xs text-zinc-500 truncate">{root.path}</small>
                    </button>
                  ))
                )}
              </div>
            </aside>

            {/* Directory View */}
            <section className="flex-1 flex flex-col">
              <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/40">
                <div className="truncate pr-4">
                  <strong className="text-xs font-semibold text-zinc-300 uppercase tracking-wider truncate block">
                    {directory?.currentPath ?? 'Select a root'}
                  </strong>
                </div>
                {directory?.parentPath && (
                  <button
                    className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors shrink-0"
                    onClick={() => void openDirectory(directory.parentPath ?? '')}
                  >
                    Up
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {directoryLoading ? (
                  <EmptyProjectNote title="Opening folder" message="Loading child folders." />
                ) : directory?.entries.filter((entry) => entry.kind === 'directory').length ? (
                  directory.entries
                    .filter((entry) => entry.kind === 'directory')
                    .map((entry) => (
                      <div
                        key={entry.path}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-800/40 group transition-colors"
                      >
                        <button
                          className="flex flex-col text-left flex-1 min-w-0 pr-4"
                          onClick={() => void openDirectory(entry.path)}
                        >
                          <strong className="text-sm text-zinc-200 truncate">{entry.name}</strong>
                          <small className="text-xs text-zinc-500 truncate">{entry.path}</small>
                        </button>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {entry.hasPackageJson && <Badge tone="green">npm</Badge>}
                          <button
                            className="px-3 py-1.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium border border-indigo-500/20 transition-colors"
                            onClick={() => selectProjectPath(entry.path)}
                          >
                            Use
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

        {/* Right Col: Scan & Settings */}
        <aside className="flex flex-col gap-6">
          <article className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 shadow-sm">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 block">
                Step 2
              </span>
              <h2 className="text-lg font-medium text-zinc-100">Scan and use</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Register the selected folder as a local project.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-300">Project root</span>
                <input
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  value={rootPath}
                  onChange={(event) => setRootPath(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-300">Project name</span>
                <input
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-300">Workspace mode</span>
                <select
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none"
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
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={!canScan}
                onClick={() => void addProject()}
              >
                {loading ? 'Scanning project...' : 'Scan and use project'}
              </button>
            </div>
          </article>

          <article className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 shadow-sm">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 block">
                Detected
              </span>
              <h2 className="text-lg font-medium text-zinc-100">Project summary</h2>
            </div>

            {currentProject ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
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

                <div className="space-y-3">
                  {projectReadiness.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <strong
                          className={`text-sm ${item.ready ? 'text-zinc-200' : 'text-zinc-400'}`}
                        >
                          {item.label}
                        </strong>
                        <p className="text-xs text-zinc-500">{item.description}</p>
                      </div>
                      <Badge tone={item.ready ? 'green' : 'slate'}>
                        {item.ready ? 'found' : 'missing'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors"
                  onClick={() => startGuidedSession(currentProject)}
                >
                  Start guided session
                </button>
              </div>
            ) : (
              <EmptyProjectNote
                title="No scan yet"
                message="Choose a folder and scan it to see project intelligence here."
              />
            )}
          </article>
        </aside>
      </section>

      {/* Registered Projects */}
      <article className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 shadow-sm mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">Registered projects</h2>
            <p className="text-sm text-zinc-400">
              Use an existing project when you want to continue quickly.
            </p>
          </div>
          <Badge tone={registry?.projects.length ? 'green' : 'slate'}>
            {registry?.projects.length ?? 0} registered
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {registry?.projects.length ? (
            registry.projects.map((project) => {
              const isActive = selectedProject?.id === project.id;
              return (
                <article
                  key={project.id}
                  className={`rounded-lg border p-4 flex flex-col transition-colors ${isActive ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700'}`}
                >
                  <div className="mb-3">
                    <strong className="text-base text-zinc-100 block truncate">
                      {project.name}
                    </strong>
                    <p className="text-xs text-zinc-500 font-mono truncate mt-1">
                      {project.rootPath}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.stack.slice(0, 3).map((stack) => (
                      <Badge key={stack} tone="blue">
                        {stack}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-zinc-800/60">
                    {isActive ? <Badge tone="green">Current</Badge> : <div />}
                    <div className="flex gap-2">
                      <button
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        onClick={() => selectRegisteredProject(project)}
                      >
                        Select
                      </button>
                      <button
                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                        onClick={() => startGuidedSession(project)}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="col-span-full">
              <EmptyProjectNote
                title="No projects registered"
                message="Browse and scan a local project to add it here."
              />
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

// Subcomponents Tailwindified
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
      className={`flex items-center gap-2 ${done ? 'text-emerald-400' : active ? 'text-indigo-400' : 'text-zinc-600'}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border ${done ? 'bg-emerald-500/10 border-emerald-500/20' : active ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-transparent border-zinc-700'}`}
      >
        {number}
      </span>
      <strong className="text-sm font-medium">{label}</strong>
    </div>
  );
}

function EmptyProjectNote({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 py-8 px-4 text-center">
      <strong className="text-sm font-medium text-zinc-300">{title}</strong>
      <p className="mt-1 text-xs text-zinc-500 max-w-xs">{message}</p>
    </div>
  );
}

function defaultNameFromPath(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const parts = normalized.split('/').filter((part) => part.trim().length > 0);
  return parts.at(-1) ?? 'target-project';
}
