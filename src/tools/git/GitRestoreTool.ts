import { z } from 'zod';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { GitClient } from '../../git/GitClient.js';

const gitRestoreToolInputSchema = z
  .object({
    ref: z.string().min(7).max(80),
    files: z.array(z.string().min(1).max(300)).min(1),
    restoreConfirmed: z.literal(true),
  })
  .strict();

export class GitRestoreTool implements RuntimeTool<typeof gitRestoreToolInputSchema> {
  public readonly name = 'git_restore';
  public readonly description = 'Restore selected files from a controlled git ref.';
  public readonly permissions = ['execute', 'read', 'write'] as const;
  public readonly inputSchema = gitRestoreToolInputSchema;

  private readonly client: GitClient;

  public constructor(options: { client?: GitClient | undefined } = {}) {
    this.client = options.client ?? new GitClient();
  }

  public async execute(
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startedAt = new Date(context.startedAt);
    const parsed = this.inputSchema.safeParse(input);

    if (!parsed.success) {
      return this.result(
        context,
        startedAt,
        'failed',
        undefined,
        parsed.error.issues.map((issue) => ({
          code: 'GIT_RESTORE_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
      );
    }

    await this.client.run(['restore', '--source', parsed.data.ref, '--', ...parsed.data.files]);

    return this.result(
      context,
      startedAt,
      'executed',
      {
        repositoryRoot: this.client.getCwd(),
        restoredToRef: parsed.data.ref,
        restoredFiles: parsed.data.files,
        restoredAt: new Date().toISOString(),
      },
      [],
    );
  }

  private result(
    context: ToolExecutionContext,
    startedAt: Date,
    status: ToolExecutionResult['status'],
    output: unknown,
    issues: ToolExecutionResult['issues'],
  ): ToolExecutionResult {
    const now = new Date();
    const result: ToolExecutionResult = {
      requestId: context.requestId,
      toolName: context.toolName,
      status,
      issues,
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };

    if (output !== undefined) {
      result.output = output;
    }

    return result;
  }
}
