import { resolve } from 'node:path';
import type { GitRepositoryDetectionResult } from './GitAwarenessTypes.js';
import { GitReadOnlyClient } from './GitReadOnlyClient.js';

export class GitRepositoryDetector {
  public async detect(projectRoot: string): Promise<GitRepositoryDetectionResult> {
    const root = resolve(projectRoot);
    const checkedAt = new Date().toISOString();
    const client = new GitReadOnlyClient({
      cwd: root,
    });

    try {
      const inside = await client.run(['rev-parse', '--is-inside-work-tree']);

      if (inside.stdout.trim() !== 'true') {
        return {
          projectRoot: root,
          repositoryState: 'missing',
          checkedAt,
          issues: [
            {
              code: 'GIT_REPOSITORY_NOT_FOUND',
              message: 'Project is not inside a git working tree.',
              severity: 'warning',
            },
          ],
        };
      }

      const repositoryRoot = await client.run(['rev-parse', '--show-toplevel']);

      return {
        projectRoot: root,
        repositoryState: 'present',
        repositoryRoot: resolve(repositoryRoot.stdout.trim()),
        checkedAt,
        issues: [],
      };
    } catch (error) {
      return {
        projectRoot: root,
        repositoryState: 'missing',
        checkedAt,
        issues: [
          {
            code: 'GIT_REPOSITORY_DETECTION_FAILED',
            message: error instanceof Error ? error.message : String(error),
            severity: 'warning',
          },
        ],
      };
    }
  }
}
