import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { searchFilesToolInputSchema } from '../ToolSchemas.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.wrangler',
  '.open-next',
]);

interface SearchFileMatch {
  path: string;
  name: string;
}

export class SearchFilesTool implements RuntimeTool<typeof searchFilesToolInputSchema> {
  public readonly name = 'search_files';
  public readonly description = 'Search project files by filename.';
  public readonly permissions = ['read'] as const;
  public readonly inputSchema = searchFilesToolInputSchema;

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
          code: 'SEARCH_FILES_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const target = parsed.data.target ?? 'src';
    const maxResults = parsed.data.maxResults ?? 50;
    const query = parsed.data.query.toLowerCase();
    const resolvedPath = this.pathUtils.resolveProjectPath(target);
    const matches: SearchFileMatch[] = [];

    await this.searchDirectory({
      absoluteDirectoryPath: resolvedPath.absolutePath,
      relativeDirectoryPath: resolvedPath.relativePath,
      query,
      maxResults,
      matches,
    });

    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: resolvedPath.relativePath,
        query: parsed.data.query,
        matches,
        count: matches.length,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }

  private async searchDirectory(input: {
    absoluteDirectoryPath: string;
    relativeDirectoryPath: string;
    query: string;
    maxResults: number;
    matches: SearchFileMatch[];
  }): Promise<void> {
    if (input.matches.length >= input.maxResults) {
      return;
    }

    const dirents = await readdir(input.absoluteDirectoryPath, {
      withFileTypes: true,
    });

    for (const dirent of dirents) {
      if (input.matches.length >= input.maxResults) {
        return;
      }

      if (dirent.isDirectory() && ignoredDirectories.has(dirent.name)) {
        continue;
      }

      const absoluteEntryPath = path.join(input.absoluteDirectoryPath, dirent.name);
      const relativeEntryPath = path.posix.join(input.relativeDirectoryPath, dirent.name);

      if (dirent.isFile() && dirent.name.toLowerCase().includes(input.query)) {
        input.matches.push({
          name: dirent.name,
          path: relativeEntryPath,
        });
      }

      if (dirent.isDirectory()) {
        await this.searchDirectory({
          absoluteDirectoryPath: absoluteEntryPath,
          relativeDirectoryPath: relativeEntryPath,
          query: input.query,
          maxResults: input.maxResults,
          matches: input.matches,
        });
      }
    }
  }
}
