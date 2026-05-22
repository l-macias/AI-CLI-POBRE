import { createHash } from 'node:crypto';
import type {
  PatchDiffBuildInput,
  PatchDiffBuildResult,
  PatchDiffFile,
  PatchDiffFileStatus,
  PatchDiffLine,
} from './PatchDiffTypes.js';

export class PatchDiffBuilder {
  public build(input: PatchDiffBuildInput): PatchDiffBuildResult {
    const files = input.proposal.files.map((file): PatchDiffFile => {
      const beforeContent = file.operation === 'create' ? null : '';
      const afterContent = file.operation === 'delete' ? null : file.content;

      const status = this.toStatus({
        operation: file.operation,
        beforeContent,
        afterContent,
      });

      const lines = this.buildLineDiff({
        beforeContent,
        afterContent,
      });

      return {
        path: file.path,
        status,
        beforeHash: file.beforeHash,
        afterHash: afterContent === null ? null : this.hashContent(afterContent),
        additions: lines.filter((line) => line.type === 'added').length,
        deletions: lines.filter((line) => line.type === 'removed').length,
        beforeContent,
        afterContent,
        lines,
      };
    });

    return {
      diff: {
        id: this.createDiffId(),
        proposalId: input.proposal.id,
        planId: input.proposal.planId,
        sessionId: input.proposal.sessionId,
        projectRoot: input.proposal.projectRoot,
        files,
        summary: {
          filesChanged: files.filter((file) => file.status !== 'unchanged').length,
          additions: files.reduce((total, file) => total + file.additions, 0),
          deletions: files.reduce((total, file) => total + file.deletions, 0),
        },
        safeToPreview: true,
        createdAt: new Date().toISOString(),
      },
    };
  }

  private buildLineDiff(input: {
    beforeContent: string | null;
    afterContent: string | null;
  }): PatchDiffLine[] {
    const beforeLines = input.beforeContent?.split('\n') ?? [];
    const afterLines = input.afterContent?.split('\n') ?? [];

    if (input.beforeContent === input.afterContent) {
      return afterLines.map((line, index) => ({
        lineNumber: index + 1,
        type: 'context',
        content: line,
      }));
    }

    const lines: PatchDiffLine[] = [];

    for (let index = 0; index < beforeLines.length; index += 1) {
      const line = beforeLines[index];

      if (line === undefined) {
        continue;
      }

      lines.push({
        lineNumber: index + 1,
        type: 'removed',
        content: line,
      });
    }

    for (let index = 0; index < afterLines.length; index += 1) {
      const line = afterLines[index];

      if (line === undefined) {
        continue;
      }

      lines.push({
        lineNumber: index + 1,
        type: 'added',
        content: line,
      });
    }

    return lines;
  }

  private toStatus(input: {
    operation: 'modify' | 'create' | 'delete';
    beforeContent: string | null;
    afterContent: string | null;
  }): PatchDiffFileStatus {
    if (input.operation === 'create') {
      return 'added';
    }

    if (input.operation === 'delete') {
      return 'deleted';
    }

    if (input.beforeContent === input.afterContent) {
      return 'unchanged';
    }

    return 'modified';
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private createDiffId(): string {
    return `patch-diff-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
