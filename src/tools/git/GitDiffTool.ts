import { z } from 'zod';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { GitClient } from '../../git/GitClient.js';

const gitDiffToolInputSchema = z
  .object({
    target: z.string().min(1).max(300).optional(),
    staged: z.boolean().default(false),
    maxBytes: z.number().int().positive().max(1_000_000).default(200_000),
  })
  .strict();

export class GitDiffTool implements RuntimeTool<typeof gitDiffToolInputSchema> {
  public readonly name = 'git_diff';
  public readonly description = 'Read controlled git diff information.';
  public readonly permissions = ['execute', 'read'] as const;
  public readonly inputSchema = gitDiffToolInputSchema;

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
      return this.failed(
        context,
        startedAt,
        parsed.error.issues.map((issue) => ({
          code: 'GIT_DIFF_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
      );
    }

    const args = parsed.data.staged ? ['diff', '--cached'] : ['diff'];

    if (parsed.data.target !== undefined) {
      args.push('--', parsed.data.target);
    }

    const result = await this.client.run(args);
    const diff = result.stdout.slice(0, parsed.data.maxBytes);
    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        repositoryRoot: this.client.getCwd(),
        target: parsed.data.target,
        diff,
        changed: diff.length > 0,
        checkedAt: now.toISOString(),
        truncated: result.stdout.length > diff.length,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }

  private failed(
    context: ToolExecutionContext,
    startedAt: Date,
    issues: ToolExecutionResult['issues'],
  ): ToolExecutionResult {
    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'failed',
      issues,
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }
}
