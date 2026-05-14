import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { listDirectoryToolInputSchema } from '../ToolSchemas.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

interface DirectoryEntryOutput {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'other';
}

export class ListDirectoryTool implements RuntimeTool<typeof listDirectoryToolInputSchema> {
  public readonly name = 'list_directory';
  public readonly description = 'List files and directories inside a project directory.';
  public readonly permissions = ['read'] as const;
  public readonly inputSchema = listDirectoryToolInputSchema;

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
          code: 'LIST_DIRECTORY_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const resolvedPath = this.pathUtils.resolveProjectPath(parsed.data.target);
    const targetStats = await stat(resolvedPath.absolutePath);

    if (!targetStats.isDirectory()) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'failed',
        issues: [
          {
            code: 'LIST_DIRECTORY_TARGET_NOT_DIRECTORY',
            message: `Target is not a directory: ${resolvedPath.relativePath}`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const entries = await this.collectEntries({
      absoluteDirectoryPath: resolvedPath.absolutePath,
      relativeDirectoryPath: resolvedPath.relativePath,
      recursive: parsed.data.recursive ?? false,
      maxEntries: parsed.data.maxEntries ?? 200,
    });

    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: resolvedPath.relativePath,
        entries,
        count: entries.length,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }

  private async collectEntries(input: {
    absoluteDirectoryPath: string;
    relativeDirectoryPath: string;
    recursive: boolean;
    maxEntries: number;
  }): Promise<DirectoryEntryOutput[]> {
    const results: DirectoryEntryOutput[] = [];
    await this.collectEntriesInto(input, results);

    return results;
  }

  private async collectEntriesInto(
    input: {
      absoluteDirectoryPath: string;
      relativeDirectoryPath: string;
      recursive: boolean;
      maxEntries: number;
    },
    results: DirectoryEntryOutput[],
  ): Promise<void> {
    if (results.length >= input.maxEntries) {
      return;
    }

    const dirents = await readdir(input.absoluteDirectoryPath, {
      withFileTypes: true,
    });

    for (const dirent of dirents) {
      if (results.length >= input.maxEntries) {
        return;
      }

      const relativeEntryPath = path.posix.join(input.relativeDirectoryPath, dirent.name);
      const absoluteEntryPath = path.join(input.absoluteDirectoryPath, dirent.name);

      const type = dirent.isDirectory() ? 'directory' : dirent.isFile() ? 'file' : 'other';

      results.push({
        name: dirent.name,
        path: relativeEntryPath,
        type,
      });

      if (input.recursive && dirent.isDirectory()) {
        await this.collectEntriesInto(
          {
            absoluteDirectoryPath: absoluteEntryPath,
            relativeDirectoryPath: relativeEntryPath,
            recursive: input.recursive,
            maxEntries: input.maxEntries,
          },
          results,
        );
      }
    }
  }
}
