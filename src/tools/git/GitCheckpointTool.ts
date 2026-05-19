import { z } from 'zod';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { DirtyTreeGuard } from '../../git/DirtyTreeGuard.js';
import { GitBranchGuard } from '../../git/GitBranchGuard.js';
import { GitClient } from '../../git/GitClient.js';
import { GitStatusParser } from '../../git/GitStatusParser.js';

const gitCheckpointToolInputSchema = z
  .object({
    message: z.string().min(1).max(200),
    confirmCheckpoint: z.literal(true),
    allowProtectedBranch: z.boolean().default(false),
  })
  .strict();

export class GitCheckpointTool implements RuntimeTool<typeof gitCheckpointToolInputSchema> {
  public readonly name = 'git_checkpoint';
  public readonly description = 'Create a controlled local git checkpoint commit.';
  public readonly permissions = ['execute', 'read', 'write'] as const;
  public readonly inputSchema = gitCheckpointToolInputSchema;

  private readonly client: GitClient;
  private readonly parser: GitStatusParser;
  private readonly branchGuard: GitBranchGuard;
  private readonly dirtyTreeGuard: DirtyTreeGuard;

  public constructor(
    options: {
      client?: GitClient | undefined;
      parser?: GitStatusParser | undefined;
      branchGuard?: GitBranchGuard | undefined;
      dirtyTreeGuard?: DirtyTreeGuard | undefined;
    } = {},
  ) {
    this.client = options.client ?? new GitClient();
    this.parser = options.parser ?? new GitStatusParser();
    this.branchGuard = options.branchGuard ?? new GitBranchGuard();
    this.dirtyTreeGuard = options.dirtyTreeGuard ?? new DirtyTreeGuard();
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
          code: 'GIT_CHECKPOINT_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
      );
    }

    const branch = (await this.client.run(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();
    const statusOutput = await this.client.run(['status', '--porcelain']);
    const files = this.parser.parsePorcelain(statusOutput.stdout);
    const status = {
      repositoryRoot: this.client.getCwd(),
      branch,
      clean: files.length === 0,
      files,
      checkedAt: new Date().toISOString(),
    };

    const branchCheck = parsed.data.allowProtectedBranch
      ? { allowed: true, issues: [], checkedAt: new Date().toISOString() }
      : this.branchGuard.check(branch);

    const dirtyCheck = this.dirtyTreeGuard.requireDirty(status);
    const issues = [...branchCheck.issues, ...dirtyCheck.issues];

    if (!branchCheck.allowed || !dirtyCheck.allowed) {
      return this.result(context, startedAt, 'rejected', undefined, issues);
    }

    await this.client.run(['add', '--all']);
    await this.client.run(['commit', '-m', parsed.data.message]);

    const commitHash = (await this.client.run(['rev-parse', 'HEAD'])).stdout.trim();

    return this.result(
      context,
      startedAt,
      'executed',
      {
        repositoryRoot: this.client.getCwd(),
        commitHash,
        message: parsed.data.message,
        filesIncluded: files.map((file) => file.path),
        createdAt: new Date().toISOString(),
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
