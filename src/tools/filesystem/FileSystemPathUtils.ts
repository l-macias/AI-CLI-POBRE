import path from 'node:path';
import { fromRoot, projectRoot } from '../../utils/paths.js';
import { ZeroRuntimeError } from '../../utils/errors.js';

export interface ResolvedProjectPath {
  absolutePath: string;
  relativePath: string;
}

export class FileSystemPathUtils {
  public resolveProjectPath(target: string): ResolvedProjectPath {
    const normalizedTarget = this.normalizeTarget(target);

    if (path.isAbsolute(normalizedTarget)) {
      throw new ZeroRuntimeError(`Absolute paths are not allowed: ${target}`, {
        code: 'ABSOLUTE_PATH_BLOCKED',
        cause: {
          target,
        },
      });
    }

    const absolutePath = path.resolve(fromRoot(normalizedTarget));
    const normalizedProjectRoot = path.resolve(projectRoot);

    if (
      absolutePath !== normalizedProjectRoot &&
      !absolutePath.startsWith(`${normalizedProjectRoot}${path.sep}`)
    ) {
      throw new ZeroRuntimeError(`Path escapes project root: ${target}`, {
        code: 'PROJECT_ROOT_ESCAPE_BLOCKED',
        cause: {
          target,
          absolutePath,
          projectRoot: normalizedProjectRoot,
        },
      });
    }

    return {
      absolutePath,
      relativePath: normalizedTarget,
    };
  }

  private normalizeTarget(target: string): string {
    return target
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }
}
