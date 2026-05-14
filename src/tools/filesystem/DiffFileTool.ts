import { readFile, stat } from 'node:fs/promises';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { diffFileToolInputSchema } from '../ToolSchemas.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

interface DiffLine {
  line: number;
  current: string | null;
  proposed: string | null;
  type: 'same' | 'changed' | 'added' | 'removed';
}

export class DiffFileTool implements RuntimeTool<typeof diffFileToolInputSchema> {
  public readonly name = 'diff_file';
  public readonly description =
    'Compare a project file with provided content without modifying it.';
  public readonly permissions = ['read'] as const;
  public readonly inputSchema = diffFileToolInputSchema;

  private readonly pathUtils = new FileSystemPathUtils();

  public async execute(
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startedAt = new Date(context.startedAt);
    const parsed = this.inputSchema.safeParse(input);

    if (!parsed.success) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'failed',
        issues: parsed.error.issues.map((issue) => ({
          code: 'DIFF_FILE_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const maxBytes = parsed.data.maxBytes ?? 64_000;
    const resolvedPath = this.pathUtils.resolveProjectPath(parsed.data.target);
    const fileStats = await stat(resolvedPath.absolutePath);

    if (!fileStats.isFile()) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'failed',
        issues: [
          {
            code: 'DIFF_FILE_TARGET_NOT_FILE',
            message: `Target is not a file: ${resolvedPath.relativePath}`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    if (fileStats.size > maxBytes) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'rejected',
        issues: [
          {
            code: 'DIFF_FILE_TOO_LARGE',
            message: `File size ${String(fileStats.size)} exceeds maxBytes ${String(maxBytes)}.`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const currentContent = await readFile(resolvedPath.absolutePath, 'utf8');
    const diff = this.createSimpleDiff(currentContent, parsed.data.compareContent);
    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: resolvedPath.relativePath,
        changed: diff.some((line) => line.type !== 'same'),
        diff,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }

  private createSimpleDiff(currentContent: string, proposedContent: string): DiffLine[] {
    const currentLines = currentContent.split('\n');
    const proposedLines = proposedContent.split('\n');
    const maxLength = Math.max(currentLines.length, proposedLines.length);
    const diff: DiffLine[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const current = currentLines[index] ?? null;
      const proposed = proposedLines[index] ?? null;

      if (current === proposed) {
        diff.push({
          line: index + 1,
          current,
          proposed,
          type: 'same',
        });
        continue;
      }

      if (current === null) {
        diff.push({
          line: index + 1,
          current,
          proposed,
          type: 'added',
        });
        continue;
      }

      if (proposed === null) {
        diff.push({
          line: index + 1,
          current,
          proposed,
          type: 'removed',
        });
        continue;
      }

      diff.push({
        line: index + 1,
        current,
        proposed,
        type: 'changed',
      });
    }

    return diff;
  }
}
