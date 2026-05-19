import type { GitFileStatusKind, GitStatusFile } from '../types/GitTypes.js';

export class GitStatusParser {
  public parsePorcelain(output: string): GitStatusFile[] {
    return output
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
      .map((line) => this.parseLine(line));
  }

  private parseLine(line: string): GitStatusFile {
    const indexStatus = line.slice(0, 1);
    const workingTreeStatus = line.slice(1, 2);
    const rawPath = line.slice(3);
    const path = this.normalizePath(rawPath);

    return {
      path,
      indexStatus,
      workingTreeStatus,
      kind: this.resolveKind(indexStatus, workingTreeStatus),
    };
  }

  private resolveKind(indexStatus: string, workingTreeStatus: string): GitFileStatusKind {
    if (indexStatus === '?' && workingTreeStatus === '?') {
      return 'untracked';
    }

    if (indexStatus === 'A' || workingTreeStatus === 'A') {
      return 'added';
    }

    if (indexStatus === 'M' || workingTreeStatus === 'M') {
      return 'modified';
    }

    if (indexStatus === 'D' || workingTreeStatus === 'D') {
      return 'deleted';
    }

    if (indexStatus === 'R' || workingTreeStatus === 'R') {
      return 'renamed';
    }

    if (indexStatus === 'C' || workingTreeStatus === 'C') {
      return 'copied';
    }

    return 'unknown';
  }

  private normalizePath(rawPath: string): string {
    const renameParts = rawPath.split(' -> ');
    const finalPath = renameParts[renameParts.length - 1] ?? rawPath;

    return finalPath.replaceAll('\\', '/').trim();
  }
}
