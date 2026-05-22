import { resolve } from 'node:path';
import { GitRepositoryDetector } from '../git/GitRepositoryDetector.js';
import { ProjectConfigStore } from '../projects/ProjectConfigStore.js';
import type { ProjectWorkingMode } from '../projects/ProjectProfile.js';
import type {
  WorkspaceMode,
  WorkspaceModeIssue,
  WorkspaceModeResolutionInput,
  WorkspaceModeResolutionResult,
  WorkspaceSession,
} from './WorkspaceMode.js';
import { GitWorkspace } from './GitWorkspace.js';
import { LocalPatchlessWorkspace } from './LocalPatchlessWorkspace.js';
import { LocalSnapshotWorkspace } from './LocalSnapshotWorkspace.js';

export interface WorkspaceModeResolverOptions {
  projectConfigStore?: ProjectConfigStore | undefined;
  gitDetector?: GitRepositoryDetector | undefined;
  localPatchlessWorkspace?: LocalPatchlessWorkspace | undefined;
  localSnapshotWorkspace?: LocalSnapshotWorkspace | undefined;
  gitWorkspace?: GitWorkspace | undefined;
}

export class WorkspaceModeResolver {
  private readonly projectConfigStore: ProjectConfigStore;
  private readonly gitDetector: GitRepositoryDetector;
  private readonly localPatchlessWorkspace: LocalPatchlessWorkspace;
  private readonly localSnapshotWorkspace: LocalSnapshotWorkspace;
  private readonly gitWorkspace: GitWorkspace;

  public constructor(options: WorkspaceModeResolverOptions = {}) {
    this.projectConfigStore = options.projectConfigStore ?? new ProjectConfigStore();
    this.gitDetector = options.gitDetector ?? new GitRepositoryDetector();
    this.localPatchlessWorkspace = options.localPatchlessWorkspace ?? new LocalPatchlessWorkspace();
    this.localSnapshotWorkspace = options.localSnapshotWorkspace ?? new LocalSnapshotWorkspace();
    this.gitWorkspace = options.gitWorkspace ?? new GitWorkspace();
  }

  public async resolve(
    input: WorkspaceModeResolutionInput,
  ): Promise<WorkspaceModeResolutionResult> {
    const projectRoot = resolve(input.projectRoot);
    const config = await this.projectConfigStore.read(projectRoot);
    const mode = input.requestedMode ?? config?.workingMode ?? 'local_snapshot';
    const gitRequired = this.resolveGitRequirement({
      mode,
      requestedMode: input.requestedMode,
      inputGitRequired: input.gitRequired,
      configGitRequired: config?.gitRequired,
    });

    const gitDetection = await this.gitDetector.detect(projectRoot);
    const gitAvailable = gitDetection.repositoryState === 'present';
    const issues: WorkspaceModeIssue[] = [];

    issues.push(
      ...gitDetection.issues.map((issue): WorkspaceModeIssue => {
        return {
          code: issue.code,
          message: issue.message,
          severity: issue.severity,
        };
      }),
    );

    if (gitRequired && !gitAvailable) {
      issues.push({
        code: 'WORKSPACE_GIT_REQUIRED_BUT_MISSING',
        message: `Workspace mode "${mode}" requires Git, but no repository was detected.`,
        severity: 'error',
      });
    }

    if (!gitRequired && !gitAvailable) {
      issues.push({
        code: 'WORKSPACE_GIT_OPTIONAL_NOT_AVAILABLE',
        message:
          'Git repository was not detected. Continuing because current workspace mode does not require Git.',
        severity: 'info',
      });
    }

    return {
      projectRoot,
      mode,
      gitRequired,
      gitAvailable,
      ...(gitDetection.repositoryRoot ? { repositoryRoot: gitDetection.repositoryRoot } : {}),
      status: issues.some((issue) => issue.severity === 'error') ? 'blocked' : 'ready',
      issues,
      resolvedAt: new Date().toISOString(),
    };
  }

  public async createSession(input: WorkspaceModeResolutionInput): Promise<WorkspaceSession> {
    const resolution = await this.resolve(input);

    if (resolution.mode === 'local_patchless') {
      return this.localPatchlessWorkspace.createSession(resolution);
    }

    if (resolution.mode === 'local_snapshot') {
      return this.localSnapshotWorkspace.createSession(resolution);
    }

    return this.gitWorkspace.createSession(resolution);
  }

  private resolveGitRequirement(input: {
    mode: ProjectWorkingMode;
    requestedMode?: ProjectWorkingMode | undefined;
    inputGitRequired?: boolean | undefined;
    configGitRequired?: boolean | undefined;
  }): boolean {
    if (input.inputGitRequired !== undefined) {
      return input.inputGitRequired;
    }

    if (input.requestedMode !== undefined) {
      return this.modeRequiresGit(input.requestedMode);
    }

    return input.configGitRequired ?? this.modeRequiresGit(input.mode);
  }

  private modeRequiresGit(mode: ProjectWorkingMode): boolean {
    return mode === 'git_diff' || mode === 'git_branch_pr';
  }
}

export function isWorkspaceMode(value: string): value is WorkspaceMode {
  return (
    value === 'local_patchless' ||
    value === 'local_snapshot' ||
    value === 'git_diff' ||
    value === 'git_branch_pr'
  );
}
