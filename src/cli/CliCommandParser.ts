import type { AgentActionKind } from '../agent/AgentTypes.js';
import type { FakeLlmRepairProposalMode } from '../repair/FakeLlmRepairProposalProvider.js';
import type {
  CliAgentAction,
  CliCommand,
  CliGitAction,
  CliOutputFormat,
  CliParseIssue,
  CliParseResult,
  CliPatchAction,
  CliProjectAction,
  CliRepairCommand,
  CliRepairProvider,
  CliSecurityAction,
  CliSecurityCommand,
  CliScaffoldAction,
  CliScaffoldCommand,
  CliScaffoldModuleKind,
} from './CliTypes.js';

type FlagValue = string | string[] | boolean;

const knownCommands = new Set([
  'help',
  'init',
  'inspect',
  'validate',
  'repair',
  'status',
  'doctor',
  'project',
  'git',
  'patch',
  'agent',
  'security',
  'scaffold',
]);

const knownProjectActions = new Set(['add', 'list', 'use', 'current', 'remove']);
const knownGitActions = new Set(['status', 'diff', 'doctor']);
const knownPatchActions = new Set(['apply']);
const knownSecurityActions = new Set(['review']);
const knownScaffoldActions = new Set(['module']);
const knownScaffoldModuleKinds = new Set([
  'backend',
  'frontend',
  'fullstack',
  'library',
  'generic',
]);
const knownAgentActions = new Set([
  'start',
  'status',
  'step',
  'approve',
  'reject',
  'report',
  'actions',
  'approvals',
  'next',
  'reset',
]);

const knownAgentStepKinds = new Set([
  'inspect_project',
  'validate_project',
  'check_git',
  'build_repair_context',
  'request_repair_proposal',
  'show_diff_preview',
  'request_approval',
  'apply_patch',
  'revalidate_project',
  'report_result',
  'cancel',
]);

const knownRepairProviders = new Set(['fake-llm', 'static', 'openrouter']);

const knownFakeProviderModes = new Set([
  'json_only',
  'markdown_json',
  'text_around_json',
  'invalid_json',
  'invalid_schema',
]);

export class CliCommandParser {
  public parse(argv: string[]): CliParseResult {
    const [rawCommandName, ...rest] = argv;
    const commandName = rawCommandName ?? 'help';

    if (!knownCommands.has(commandName)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_COMMAND',
            message: `Unknown command "${commandName}". Run "zero help".`,
          },
        ],
      };
    }

    const flags = this.parseFlags(rest);
    const format = this.resolveFormat(flags);

    if (format instanceof Error) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_INVALID_FORMAT',
            message: format.message,
          },
        ],
      };
    }

    return this.buildCommand(commandName, rest, flags, format);
  }

  private buildCommand(
    commandName: string,
    args: string[],
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    if (commandName === 'help') {
      return {
        ok: true,
        command: {
          name: 'help',
          format,
        },
      };
    }

    if (commandName === 'init') {
      return {
        ok: true,
        command: this.withProjectRoot(
          {
            name: 'init',
            format,
            confirmOverwrite: this.hasBooleanFlag(flags, 'overwrite'),
          },
          flags,
        ),
      };
    }

    if (commandName === 'status') {
      return {
        ok: true,
        command: this.withProjectRoot(
          {
            name: 'status',
            format,
          },
          flags,
        ),
      };
    }

    if (commandName === 'doctor') {
      return {
        ok: true,
        command: this.withProjectRoot(
          {
            name: 'doctor',
            format,
          },
          flags,
        ),
      };
    }

    if (commandName === 'project') {
      return this.buildProjectManagerCommand(args, flags, format);
    }

    if (commandName === 'git') {
      return this.buildGitCommand(args, flags, format);
    }

    if (commandName === 'patch') {
      return this.buildPatchCommand(args, flags, format);
    }

    if (commandName === 'agent') {
      return this.buildAgentCommand(args, flags, format);
    }

    if (commandName === 'security') {
      return this.buildSecurityCommand(args, flags, format);
    }
    if (commandName === 'scaffold') {
      return this.buildScaffoldCommand(args, flags, format);
    }
    const projectCommand = this.buildProjectCommand(commandName, flags, format);

    if (projectCommand instanceof Error) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_INVALID_PROJECT_COMMAND',
            message: projectCommand.message,
          },
        ],
      };
    }

    return {
      ok: true,
      command: projectCommand,
    };
  }

  private buildProjectManagerCommand(
    args: string[],
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    const action = args.find((arg) => !arg.startsWith('--')) ?? 'list';

    if (!knownProjectActions.has(action)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_PROJECT_ACTION',
            message: `Unknown project action "${action}". Allowed: add, list, use, current, remove.`,
          },
        ],
      };
    }

    const command = this.withProjectRoot(
      {
        name: 'project' as const,
        format,
        action: action as CliProjectAction,
        projectRef: this.resolveProjectRef(args, action),
        targetPath: this.getOptionalStringFlag(flags, 'path'),
        targetName: this.getOptionalStringFlag(flags, 'name'),
        setCurrent: !this.hasBooleanFlag(flags, 'no-current'),
      },
      flags,
    );

    const issues = this.validateProjectManagerCommand(command);

    if (issues.length > 0) {
      return {
        ok: false,
        issues,
      };
    }

    return {
      ok: true,
      command,
    };
  }

  private validateProjectManagerCommand(command: {
    action: CliProjectAction;
    projectRef?: string | undefined;
    targetPath?: string | undefined;
    targetName?: string | undefined;
  }): CliParseIssue[] {
    const issues: CliParseIssue[] = [];

    if (command.action === 'add') {
      if (!command.targetPath) {
        issues.push({
          code: 'CLI_PROJECT_PATH_REQUIRED',
          message: 'project add requires --path.',
        });
      }

      if (!command.targetName) {
        issues.push({
          code: 'CLI_PROJECT_NAME_REQUIRED',
          message: 'project add requires --name.',
        });
      }
    }

    if ((command.action === 'use' || command.action === 'remove') && !command.projectRef) {
      issues.push({
        code: 'CLI_PROJECT_REF_REQUIRED',
        message: `project ${command.action} requires a project name or id.`,
      });
    }

    return issues;
  }

  private buildGitCommand(
    args: string[],
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    const action = args.find((arg) => !arg.startsWith('--')) ?? 'status';

    if (!knownGitActions.has(action)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_GIT_ACTION',
            message: `Unknown git action "${action}". Allowed: status, diff, doctor.`,
          },
        ],
      };
    }

    return {
      ok: true,
      command: this.withProjectRoot(
        {
          name: 'git',
          format,
          action: action as CliGitAction,
          target: this.getOptionalStringFlag(flags, 'target'),
          staged: this.hasBooleanFlag(flags, 'staged'),
          maxBytes: this.getOptionalNumberFlag(flags, 'max-bytes') ?? 200_000,
          allowDirty: this.hasBooleanFlag(flags, 'allow-dirty'),
          allowMissingRepository: this.hasBooleanFlag(flags, 'allow-missing-repo'),
        },
        flags,
      ),
    };
  }

  private buildPatchCommand(
    args: string[],
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    const action = args.find((arg) => !arg.startsWith('--')) ?? 'apply';

    if (!knownPatchActions.has(action)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_PATCH_ACTION',
            message: `Unknown patch action "${action}". Allowed: apply.`,
          },
        ],
      };
    }

    const command = this.withProjectRoot(
      {
        name: 'patch' as const,
        format,
        action: action as CliPatchAction,
        proposalPath: this.getOptionalStringFlag(flags, 'proposal'),
        confirmApply: this.hasBooleanFlag(flags, 'confirm-apply'),
        allowDirty: this.hasBooleanFlag(flags, 'allow-dirty'),
        allowMissingRepository: this.hasBooleanFlag(flags, 'allow-missing-repo'),
        confirmDelete: this.hasBooleanFlag(flags, 'confirm-delete'),
        backupEnabled: !this.hasBooleanFlag(flags, 'no-backup'),
      },
      flags,
    );

    const issues = this.validatePatchCommand(command);

    if (issues.length > 0) {
      return {
        ok: false,
        issues,
      };
    }

    return {
      ok: true,
      command,
    };
  }

  private validatePatchCommand(command: {
    action: CliPatchAction;
    proposalPath?: string | undefined;
    confirmApply: boolean;
  }): CliParseIssue[] {
    const issues: CliParseIssue[] = [];

    if (command.action === 'apply' && !command.proposalPath) {
      issues.push({
        code: 'CLI_PATCH_PROPOSAL_REQUIRED',
        message: 'patch apply requires --proposal.',
      });
    }

    if (command.action === 'apply' && command.confirmApply !== true) {
      issues.push({
        code: 'CLI_PATCH_CONFIRM_APPLY_REQUIRED',
        message: 'patch apply requires --confirm-apply.',
      });
    }

    return issues;
  }

  private buildAgentCommand(
    args: string[],
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    const action = args.find((arg) => !arg.startsWith('--')) ?? 'status';

    if (!knownAgentActions.has(action)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_AGENT_ACTION',
            message: `Unknown agent action "${action}". Allowed: start, status, step, approve, reject, report, actions, approvals, next, reset.`,
          },
        ],
      };
    }

    const command = this.withProjectRoot(
      {
        name: 'agent' as const,
        format,
        action: action as CliAgentAction,
        projectName: this.getOptionalStringFlag(flags, 'name') ?? 'target-project',
        objective:
          this.getOptionalStringFlag(flags, 'objective') ??
          'Run an approval-gated Zero Runtime agent loop.',
        targetFiles: this.getStringListFlag(flags, 'target'),
        stepKind: this.resolveAgentStepKind(args, action),
        approvalId: this.resolveAgentApprovalId(args, action),
        reason: this.getOptionalStringFlag(flags, 'reason'),
        confirmReset: this.hasBooleanFlag(flags, 'confirm-reset'),
        includeProjectMemory: this.hasBooleanFlag(flags, 'include-project-memory'),
        provider: this.resolveRepairProvider(flags),
        fakeProviderMode: this.resolveAgentFakeProviderMode(flags),
        providerModel: this.getOptionalStringFlag(flags, 'model'),
        estimatedCompletionTokens: this.getOptionalNumberFlag(flags, 'estimated-completion-tokens'),
        allowRealProvider: this.hasBooleanFlag(flags, 'allow-real-provider'),
        allowPremium: this.hasBooleanFlag(flags, 'allow-premium'),
        premiumApproved: this.hasBooleanFlag(flags, 'premium-approved'),
      },
      flags,
    );

    const issues = this.validateAgentCommand(command);

    if (issues.length > 0) {
      return {
        ok: false,
        issues,
      };
    }

    return {
      ok: true,
      command,
    };
  }

  private buildSecurityCommand(
    args: string[],
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    const action = args.find((arg) => !arg.startsWith('--')) ?? 'review';

    if (!knownSecurityActions.has(action)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_SECURITY_ACTION',
            message: `Unknown security action "${action}". Allowed: review.`,
          },
        ],
      };
    }

    const command = this.withProjectRoot(
      {
        name: 'security' as const,
        format,
        action: action as CliSecurityAction,
        projectName: this.getOptionalStringFlag(flags, 'name') ?? 'target-project',
        outputPath: this.getOptionalStringFlag(flags, 'output'),
      },
      flags,
    );

    const issues = this.validateSecurityCommand(command);

    if (issues.length > 0) {
      return {
        ok: false,
        issues,
      };
    }

    return {
      ok: true,
      command,
    };
  }
  private buildScaffoldCommand(
    args: string[],
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    const action = args.find((arg) => !arg.startsWith('--')) ?? 'module';

    if (!knownScaffoldActions.has(action)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_SCAFFOLD_ACTION',
            message: `Unknown scaffold action "${action}". Allowed: module.`,
          },
        ],
      };
    }

    const command = this.withProjectRoot(
      {
        name: 'scaffold' as const,
        format,
        action: action as CliScaffoldAction,
        moduleName: this.getOptionalStringFlag(flags, 'name') ?? '',
        moduleKind: this.resolveScaffoldModuleKind(flags),
        targetPath: this.getOptionalStringFlag(flags, 'target') ?? '',
        provider: this.resolveRepairProvider(flags),
        providerModel: this.getOptionalStringFlag(flags, 'model'),
        allowRealProvider: this.hasBooleanFlag(flags, 'allow-real-provider'),
        allowPremium: this.hasBooleanFlag(flags, 'allow-premium'),
        premiumApproved: this.hasBooleanFlag(flags, 'premium-approved'),
        includeProjectMemory: this.hasBooleanFlag(flags, 'include-project-memory'),
        overwriteExisting: this.hasBooleanFlag(flags, 'overwrite'),
        dryRun: !this.hasBooleanFlag(flags, 'no-dry-run'),
        objective: this.getOptionalStringFlag(flags, 'objective'),
        outputPath: this.getOptionalStringFlag(flags, 'output'),
      },
      flags,
    );

    const issues = this.validateScaffoldCommand(command);

    if (issues.length > 0) {
      return {
        ok: false,
        issues,
      };
    }

    return {
      ok: true,
      command,
    };
  }

  private validateScaffoldCommand(command: CliScaffoldCommand): CliParseIssue[] {
    const issues: CliParseIssue[] = [];

    if (command.action !== 'module') {
      issues.push({
        code: 'CLI_SCAFFOLD_ACTION_INVALID',
        message: 'scaffold supports only the module action.',
      });
    }

    if (command.moduleName.trim().length === 0) {
      issues.push({
        code: 'CLI_SCAFFOLD_NAME_REQUIRED',
        message: 'scaffold module requires --name.',
      });
    }

    if (command.targetPath.trim().length === 0) {
      issues.push({
        code: 'CLI_SCAFFOLD_TARGET_REQUIRED',
        message: 'scaffold module requires --target.',
      });
    }

    if (command.provider === 'openrouter' && command.allowRealProvider !== true) {
      issues.push({
        code: 'CLI_SCAFFOLD_REAL_PROVIDER_OPT_IN_REQUIRED',
        message:
          'scaffold module --provider openrouter requires --allow-real-provider to prevent accidental real provider calls.',
      });
    }

    if (
      command.provider === 'openrouter' &&
      (!command.providerModel || command.providerModel.trim().length === 0)
    ) {
      issues.push({
        code: 'CLI_SCAFFOLD_PROVIDER_MODEL_REQUIRED',
        message: 'scaffold module --provider openrouter requires --model.',
      });
    }

    return issues;
  }

  private resolveScaffoldModuleKind(flags: Map<string, FlagValue>): CliScaffoldModuleKind {
    const value = this.getOptionalStringFlag(flags, 'kind') ?? 'generic';

    if (knownScaffoldModuleKinds.has(value)) {
      return value as CliScaffoldModuleKind;
    }

    return 'generic';
  }
  private validateSecurityCommand(command: CliSecurityCommand): CliParseIssue[] {
    const issues: CliParseIssue[] = [];

    if (command.action !== 'review') {
      issues.push({
        code: 'CLI_SECURITY_ACTION_INVALID',
        message: 'security supports only the review action.',
      });
    }

    return issues;
  }

  private validateAgentCommand(command: {
    action: CliAgentAction;
    stepKind?: AgentActionKind | undefined;
    approvalId?: string | undefined;
    confirmReset: boolean;
    provider: CliRepairProvider;
    allowRealProvider: boolean;
  }): CliParseIssue[] {
    const issues: CliParseIssue[] = [];

    if (command.action === 'step' && !command.stepKind) {
      issues.push({
        code: 'CLI_AGENT_STEP_REQUIRED',
        message: 'agent step requires a valid step kind.',
      });
    }

    if ((command.action === 'approve' || command.action === 'reject') && !command.approvalId) {
      issues.push({
        code: 'CLI_AGENT_APPROVAL_ID_REQUIRED',
        message: `agent ${command.action} requires an approval id.`,
      });
    }

    if (command.action === 'reset' && command.confirmReset !== true) {
      issues.push({
        code: 'CLI_AGENT_CONFIRM_RESET_REQUIRED',
        message: 'agent reset requires --confirm-reset.',
      });
    }

    if (
      command.action === 'start' &&
      command.provider === 'openrouter' &&
      command.allowRealProvider !== true
    ) {
      issues.push({
        code: 'CLI_AGENT_REAL_PROVIDER_OPT_IN_REQUIRED',
        message:
          'agent start --provider openrouter requires --allow-real-provider to prevent accidental real provider calls.',
      });
    }

    return issues;
  }

  private resolveAgentStepKind(args: string[], action: string): AgentActionKind | undefined {
    if (action !== 'step') {
      return undefined;
    }

    const actionIndex = args.findIndex((arg) => arg === action);

    if (actionIndex < 0) {
      return undefined;
    }

    const next = args[actionIndex + 1];

    if (!next || next.startsWith('--')) {
      return undefined;
    }

    if (!knownAgentStepKinds.has(next)) {
      return undefined;
    }

    return next as AgentActionKind;
  }

  private resolveAgentApprovalId(args: string[], action: string): string | undefined {
    if (action !== 'approve' && action !== 'reject') {
      return undefined;
    }

    const actionIndex = args.findIndex((arg) => arg === action);

    if (actionIndex < 0) {
      return undefined;
    }

    const next = args[actionIndex + 1];

    if (!next || next.startsWith('--')) {
      return undefined;
    }

    return next;
  }

  private resolveProjectRef(args: string[], action: string): string | undefined {
    const actionIndex = args.findIndex((arg) => arg === action);

    if (actionIndex < 0) {
      return undefined;
    }

    const next = args[actionIndex + 1];

    if (!next || next.startsWith('--')) {
      return undefined;
    }

    return next;
  }

  private buildProjectCommand(
    commandName: string,
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliCommand | Error {
    if (commandName !== 'inspect' && commandName !== 'validate' && commandName !== 'repair') {
      return new Error(`Unsupported project command: ${commandName}`);
    }

    const targetFiles = this.getStringListFlag(flags, 'target');
    const projectName = this.getOptionalStringFlag(flags, 'name') ?? 'target-project';
    const objective =
      this.getOptionalStringFlag(flags, 'objective') ?? this.defaultObjectiveFor(commandName);

    if (commandName === 'inspect') {
      return this.withProjectRoot(
        {
          name: 'inspect',
          format,
          projectName,
          objective,
          targetFiles,
        },
        flags,
      );
    }

    if (commandName === 'validate') {
      return this.withProjectRoot(
        {
          name: 'validate',
          format,
          projectName,
          objective,
          targetFiles,
        },
        flags,
      );
    }

    const repairCommand = this.withProjectRoot(
      {
        name: 'repair' as const,
        format,
        projectName,
        objective,
        targetFiles,
        provider: this.resolveRepairProvider(flags),
        fakeProviderMode: this.resolveFakeProviderMode(flags),
        providerModel: this.getOptionalStringFlag(flags, 'model'),
        estimatedCompletionTokens: this.getOptionalNumberFlag(flags, 'estimated-completion-tokens'),
        allowPremium: this.hasBooleanFlag(flags, 'allow-premium'),
        premiumApproved: this.hasBooleanFlag(flags, 'premium-approved'),
        allowRealProvider: this.hasBooleanFlag(flags, 'allow-real-provider'),
        includeProjectMemory: this.hasBooleanFlag(flags, 'include-project-memory'),
      },
      flags,
    );

    const issues = this.validateRepairCommand(repairCommand);

    if (issues.length > 0) {
      return new Error(issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
    }

    return repairCommand;
  }

  private validateRepairCommand(command: CliRepairCommand): CliParseIssue[] {
    const issues: CliParseIssue[] = [];

    if (command.provider === 'openrouter' && command.allowRealProvider !== true) {
      issues.push({
        code: 'CLI_REPAIR_REAL_PROVIDER_OPT_IN_REQUIRED',
        message:
          'repair --provider openrouter requires --allow-real-provider to prevent accidental real provider calls.',
      });
    }

    return issues;
  }

  private resolveRepairProvider(flags: Map<string, FlagValue>): CliRepairProvider {
    const value = this.getOptionalStringFlag(flags, 'provider') ?? 'fake-llm';

    if (knownRepairProviders.has(value)) {
      return value as CliRepairProvider;
    }

    return 'fake-llm';
  }

  private resolveFakeProviderMode(flags: Map<string, FlagValue>): FakeLlmRepairProposalMode {
    const value = this.getOptionalStringFlag(flags, 'fake-provider-mode') ?? 'json_only';

    if (knownFakeProviderModes.has(value)) {
      return value as FakeLlmRepairProposalMode;
    }

    return 'json_only';
  }

  private resolveAgentFakeProviderMode(flags: Map<string, FlagValue>): FakeLlmRepairProposalMode {
    const value = this.getOptionalStringFlag(flags, 'fake-provider-mode') ?? 'markdown_json';

    if (knownFakeProviderModes.has(value)) {
      return value as FakeLlmRepairProposalMode;
    }

    return 'markdown_json';
  }

  private withProjectRoot<TCommand extends CliCommand>(
    command: TCommand,
    flags: Map<string, FlagValue>,
  ): TCommand {
    const projectRoot = this.getOptionalStringFlag(flags, 'project');

    if (projectRoot === undefined) {
      return command;
    }

    return {
      ...command,
      projectRoot,
    };
  }

  private parseFlags(args: string[]): Map<string, FlagValue> {
    const flags = new Map<string, FlagValue>();

    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];

      if (arg === undefined || !arg.startsWith('--')) {
        continue;
      }

      const key = arg.slice(2);
      const next = args[index + 1];

      if (next === undefined || next.startsWith('--')) {
        flags.set(key, true);
        continue;
      }

      const existing = flags.get(key);

      if (typeof existing === 'string') {
        flags.set(key, [existing, next]);
      } else if (Array.isArray(existing)) {
        flags.set(key, [...existing, next]);
      } else {
        flags.set(key, next);
      }

      index += 1;
    }

    return flags;
  }

  private resolveFormat(flags: Map<string, FlagValue>): CliOutputFormat | Error {
    const value = this.getOptionalStringFlag(flags, 'format');

    if (value === undefined) {
      return 'text';
    }

    if (value === 'text' || value === 'json') {
      return value;
    }

    return new Error(`Invalid format "${value}". Allowed: text, json.`);
  }

  private getOptionalStringFlag(flags: Map<string, FlagValue>, name: string): string | undefined {
    const value = flags.get(name);

    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private getStringListFlag(flags: Map<string, FlagValue>, name: string): string[] {
    const value = flags.get(name);

    if (typeof value === 'string') {
      return this.splitList(value);
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.splitList(item));
    }

    return [];
  }

  private splitList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private hasBooleanFlag(flags: Map<string, FlagValue>, name: string): boolean {
    return flags.get(name) === true;
  }

  private getOptionalNumberFlag(flags: Map<string, FlagValue>, name: string): number | undefined {
    const value = flags.get(name);

    if (typeof value !== 'string') {
      return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return Math.floor(parsed);
  }

  private defaultObjectiveFor(commandName: 'inspect' | 'validate' | 'repair'): string {
    if (commandName === 'inspect') {
      return 'Inspect target project in read-only mode.';
    }

    if (commandName === 'validate') {
      return 'Run controlled validation for target project.';
    }

    return 'Build repair request and diff preview without applying patches.';
  }
}
