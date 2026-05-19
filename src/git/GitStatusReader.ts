import { resolve } from 'node:path';
import type { GitStatusSnapshot } from './GitAwarenessTypes.js';
import { GitReadOnlyClient } from './GitReadOnlyClient.js';
import { GitRepositoryDetector } from './GitRepositoryDetector.js';
import { GitStatusParser } from './GitStatusParser.js';

export interface GitStatusReaderOptions {
  detector?: GitRepositoryDetector | undefined;
  parser?: GitStatusParser | undefined;
}

export class GitStatusReader {
  private readonly detector: GitRepositoryDetector;
  private readonly parser: GitStatusParser;

  public constructor(options: GitStatusReaderOptions = {}) {
    this.detector = options.detector ?? new GitRepositoryDetector();
    this.parser = options.parser ?? new GitStatusParser();
  }

  public async read(projectRoot: string): Promise<GitStatusSnapshot> {
    const root = resolve(projectRoot);
    const detection = await this.detector.detect(root);

    if (detection.repositoryState !== 'present' || !detection.repositoryRoot) {
      return {
        projectRoot: root,
        repositoryRoot: root,
        branch: 'unknown',
        workingTreeState: 'unknown',
        clean: false,
        files: [],
        checkedAt: new Date().toISOString(),
        issues: detection.issues,
      };
    }

    const client = new GitReadOnlyClient({
      cwd: detection.repositoryRoot,
    });

    const branch = await client.run(['rev-parse', '--abbrev-ref', 'HEAD']);
    const status = await client.run(['status', '--porcelain']);
    const files = this.parser.parsePorcelain(status.stdout);

    return {
      projectRoot: root,
      repositoryRoot: detection.repositoryRoot,
      branch: branch.stdout.trim(),
      workingTreeState: files.length === 0 ? 'clean' : 'dirty',
      clean: files.length === 0,
      files,
      checkedAt: new Date().toISOString(),
      issues: [],
    };
  }
}
