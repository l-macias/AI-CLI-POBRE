import { resolve } from 'node:path';
import type { GitDiffSnapshot } from './GitAwarenessTypes.js';
import { GitReadOnlyClient } from './GitReadOnlyClient.js';
import { GitRepositoryDetector } from './GitRepositoryDetector.js';

export interface GitDiffReaderInput {
  projectRoot: string;
  target?: string | undefined;
  staged?: boolean | undefined;
  maxBytes?: number | undefined;
}

export interface GitDiffReaderOptions {
  detector?: GitRepositoryDetector | undefined;
}

export class GitDiffReader {
  private readonly detector: GitRepositoryDetector;

  public constructor(options: GitDiffReaderOptions = {}) {
    this.detector = options.detector ?? new GitRepositoryDetector();
  }

  public async read(input: GitDiffReaderInput): Promise<GitDiffSnapshot> {
    const root = resolve(input.projectRoot);
    const maxBytes = input.maxBytes ?? 200_000;
    const staged = input.staged ?? false;
    const detection = await this.detector.detect(root);

    if (detection.repositoryState !== 'present' || !detection.repositoryRoot) {
      return {
        projectRoot: root,
        repositoryRoot: root,
        target: input.target,
        staged,
        changed: false,
        diff: '',
        truncated: false,
        checkedAt: new Date().toISOString(),
        issues: detection.issues,
      };
    }

    const client = new GitReadOnlyClient({
      cwd: detection.repositoryRoot,
      maxBufferBytes: Math.max(maxBytes, 1_000_000),
    });

    const args = staged ? ['diff', '--cached'] : ['diff'];

    if (input.target) {
      args.push('--', input.target);
    }

    const result = await client.run(args);
    const diff = result.stdout.slice(0, maxBytes);

    return {
      projectRoot: root,
      repositoryRoot: detection.repositoryRoot,
      target: input.target,
      staged,
      changed: diff.length > 0,
      diff,
      truncated: result.stdout.length > diff.length,
      checkedAt: new Date().toISOString(),
      issues: [],
    };
  }
}
