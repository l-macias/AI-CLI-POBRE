import type {
  GitChangeBoundary,
  GitDiffSnapshot,
  GitStatusSnapshot,
  GitWorkingTreeGuardResult,
} from './GitAwarenessTypes.js';

export class GitReporter {
  public statusToText(status: GitStatusSnapshot): string {
    return `Git status

Repository: ${status.repositoryRoot}
Branch: ${status.branch}
Working tree: ${status.workingTreeState}

Files:
${this.formatStatusFiles(status.files)}

Issues:
${this.formatIssues(status.issues)}`;
  }

  public diffToText(diff: GitDiffSnapshot): string {
    return `Git diff

Repository: ${diff.repositoryRoot}
Target: ${diff.target ?? 'all'}
Staged: ${String(diff.staged)}
Changed: ${String(diff.changed)}
Truncated: ${String(diff.truncated)}

Diff:
${diff.diff || '- none'}

Issues:
${this.formatIssues(diff.issues)}`;
  }

  public boundaryToText(input: {
    boundary: GitChangeBoundary;
    guard: GitWorkingTreeGuardResult;
  }): string {
    return `Git change boundary

Repository: ${input.boundary.repositoryRoot}
Branch: ${input.boundary.branch}
Working tree: ${input.boundary.workingTreeState}
Allowed: ${String(input.guard.allowed)}
Decision: ${input.guard.decision}
Reason: ${input.guard.reason}

Modified:
${this.formatList(input.boundary.modifiedFiles)}

Untracked:
${this.formatList(input.boundary.untrackedFiles)}

Deleted:
${this.formatList(input.boundary.deletedFiles)}

Issues:
${this.formatIssues([...input.boundary.issues, ...input.guard.issues])}`;
  }

  private formatStatusFiles(
    files: readonly {
      path: string;
      kind: string;
      indexStatus: string;
      workingTreeStatus: string;
    }[],
  ): string {
    if (files.length === 0) {
      return '- none';
    }

    return files
      .map((file) => {
        return `- ${file.path}: ${file.kind} (${file.indexStatus}${file.workingTreeStatus})`;
      })
      .join('\n');
  }

  private formatIssues(
    issues: readonly {
      code: string;
      message: string;
      severity: string;
    }[],
  ): string {
    if (issues.length === 0) {
      return '- none';
    }

    return issues
      .map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}`)
      .join('\n');
  }

  private formatList(items: readonly string[]): string {
    if (items.length === 0) {
      return '- none';
    }

    return items.map((item) => `- ${item}`).join('\n');
  }
}
