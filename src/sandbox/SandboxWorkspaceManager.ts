import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import type { SandboxWorkspace } from './SandboxResult.js';

export interface SandboxWorkspaceManagerOptions {
  rootDir?: string | undefined;
}

export class SandboxWorkspaceManager {
  private readonly rootDir: string;

  public constructor(options: SandboxWorkspaceManagerOptions = {}) {
    this.rootDir = path.resolve(options.rootDir ?? '.runtime/sandboxes');
  }

  public async create(proposal: RuntimePatchProposal): Promise<SandboxWorkspace> {
    const createdAt = new Date().toISOString();
    const sandboxId = `sandbox-${createdAt.replaceAll(':', '').replaceAll('.', '')}`;
    const sourceProjectRoot = path.resolve(proposal.projectRoot);

    const sandboxRoot = path.join(
      this.rootDir,
      this.safeSegment(proposal.sessionId),
      this.safeSegment(sandboxId),
    );

    const workspaceRoot = path.join(sandboxRoot, 'workspace');

    await mkdir(sandboxRoot, {
      recursive: true,
    });

    await cp(sourceProjectRoot, workspaceRoot, {
      recursive: true,
      force: true,
      filter: (source) =>
        !this.shouldSkip({
          sourceProjectRoot,
          sourcePath: source,
        }),
    });

    return {
      sandboxId,
      sessionId: proposal.sessionId,
      sourceProjectRoot,
      sandboxRoot,
      workspaceRoot,
      createdAt,
    };
  }

  public async cleanup(workspace: SandboxWorkspace): Promise<void> {
    await rm(workspace.sandboxRoot, {
      recursive: true,
      force: true,
    });
  }

  private shouldSkip(input: { sourceProjectRoot: string; sourcePath: string }): boolean {
    const relativePath = path
      .relative(input.sourceProjectRoot, input.sourcePath)
      .replaceAll('\\', '/')
      .toLowerCase();

    if (relativePath.length === 0) {
      return false;
    }

    const segments = relativePath.split('/');

    return (
      segments.includes('node_modules') ||
      segments.includes('.git') ||
      segments.includes('.runtime') ||
      segments.includes('dist') ||
      segments.includes('build') ||
      segments.includes('.next')
    );
  }

  private safeSegment(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (normalized.length === 0) {
      throw new Error('Sandbox path segment cannot be empty.');
    }

    return normalized;
  }
}
