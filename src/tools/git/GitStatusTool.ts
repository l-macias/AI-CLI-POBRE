import { z } from 'zod';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { GitClient } from '../../git/GitClient.js';
import { GitStatusParser } from '../../git/GitStatusParser.js';

const gitStatusToolInputSchema = z
  .object({
    includeBranch: z.boolean().default(true),
  })
  .strict();

export class GitStatusTool implements RuntimeTool<typeof gitStatusToolInputSchema> {
  public readonly name = 'git_status';
  public readonly description = 'Read controlled git status information.';
  public readonly permissions = ['execute', 'read'] as const;
  public readonly inputSchema = gitStatusToolInputSchema;

  private readonly client: GitClient;
  private readonly parser: GitStatusParser;

  public constructor(
    options: {
      client?: GitClient | undefined;
      parser?: GitStatusParser | undefined;
    } = {},
  ) {
    this.client = options.client ?? new GitClient();
    this.parser = options.parser ?? new GitStatusParser();
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
          code: 'GIT_STATUS_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
      );
    }

    const status = await this.client.run(['status', '--porcelain']);
    const branchResult = parsed.data.includeBranch
      ? await this.client.run(['rev-parse', '--abbrev-ref', 'HEAD'])
      : { stdout: 'unknown\n', stderr: '' };

    const files = this.parser.parsePorcelain(status.stdout);
    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        repositoryRoot: this.client.getCwd(),
        branch: branchResult.stdout.trim(),
        clean: files.length === 0,
        files,
        checkedAt: now.toISOString(),
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
