import { readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ProjectBootstrapper } from '../bootstrap/ProjectBootstrapper.js';
import { RuntimeDirectoryInspector } from '../bootstrap/RuntimeDirectoryInspector.js';
import { GitChangeBoundary } from '../git/GitChangeBoundary.js';
import { GitDiffReader } from '../git/GitDiffReader.js';
import { GitReporter } from '../git/GitReporter.js';
import { GitStatusReader } from '../git/GitStatusReader.js';
import { GitWorkingTreeGuard } from '../git/GitWorkingTreeGuard.js';
import { PatchApplyRunner } from '../patch-apply/PatchApplyRunner.js';
import { RealProjectTrialRunner } from '../real-project-trial/RealProjectTrialRunner.js';
import { PatchProposalParser } from '../repair/PatchProposalParser.js';
import { RepairAttemptRunner } from '../repair/RepairAttemptRunner.js';
import { StaticRepairProposalProvider } from '../repair/StaticRepairProposalProvider.js';
import type { PatchProposal } from '../types/RepairTypes.js';
import { FakeLlmRepairProposalProvider } from '../repair/FakeLlmRepairProposalProvider.js';
import type { RepairProposalProvider } from '../repair/RepairProposalProvider.js';
import { TargetProjectManager } from '../workspace/TargetProjectManager.js';
import { TargetProjectResolver } from '../workspace/TargetProjectResolver.js';
import { PolicyAwareRepairProposalProvider } from '../repair/PolicyAwareRepairProposalProvider.js';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { AgentStepExecutor } from '../agent/AgentStepExecutor.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';
import { OpenRouterClient } from '../providers/OpenRouterClient.js';
import { OpenRouterConfigLoader } from '../providers/OpenRouterConfigLoader.js';
import { OpenRouterRepairProposalProvider } from '../repair/OpenRouterRepairProposalProvider.js';
import { ProjectMemoryReader } from '../memory/ProjectMemoryReader.js';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';
import { SecurityRegressionSuite } from '../security/SecurityRegressionSuite.js';
import { SecurityReviewReporter } from '../security/SecurityReviewReporter.js';
import { AgentProviderConfigReader } from '../agent/AgentProviderConfigReader.js';
import { ScaffoldReporter } from '../scaffold/ScaffoldReporter.js';
import { ScaffoldRunner } from '../scaffold/ScaffoldRunner.js';
import { ScaffoldPatchProposalWriter } from '../scaffold/ScaffoldPatchProposalWriter.js';
import type {
  TargetProjectResolveResult,
  WorkspaceTargetProject,
} from '../workspace/WorkspaceConfigTypes.js';
import type {
  CliAgentCommand,
  CliDoctorCommand,
  CliGitCommand,
  CliInitCommand,
  CliInspectCommand,
  CliPatchCommand,
  CliProjectCommand,
  CliRepairCommand,
  CliSecurityCommand,
  CliStatusCommand,
  CliValidateCommand,
  CliScaffoldCommand,
} from './CliTypes.js';

export interface CliRuntimeBridgeOptions {
  bootstrapper?: ProjectBootstrapper | undefined;
  runtimeInspector?: RuntimeDirectoryInspector | undefined;
  trialRunner?: RealProjectTrialRunner | undefined;
  targetProjectManager?: TargetProjectManager | undefined;
  targetProjectResolver?: TargetProjectResolver | undefined;
  gitStatusReader?: GitStatusReader | undefined;
  gitDiffReader?: GitDiffReader | undefined;
  gitChangeBoundary?: GitChangeBoundary | undefined;
  gitReporter?: GitReporter | undefined;
  patchApplyRunner?: PatchApplyRunner | undefined;
  patchProposalParser?: PatchProposalParser | undefined;
}

export class CliRuntimeBridge {
  private readonly bootstrapper: ProjectBootstrapper;
  private readonly runtimeInspector: RuntimeDirectoryInspector;
  private readonly trialRunner: RealProjectTrialRunner;
  private readonly targetProjectManager: TargetProjectManager;
  private readonly targetProjectResolver: TargetProjectResolver;
  private readonly gitStatusReader: GitStatusReader;
  private readonly gitDiffReader: GitDiffReader;
  private readonly gitChangeBoundary: GitChangeBoundary;
  private readonly gitReporter: GitReporter;
  private readonly patchApplyRunner: PatchApplyRunner;
  private readonly patchProposalParser: PatchProposalParser;
  private readonly agentProviderConfigReader: AgentProviderConfigReader;

  public constructor(options: CliRuntimeBridgeOptions = {}) {
    this.bootstrapper = options.bootstrapper ?? new ProjectBootstrapper();
    this.runtimeInspector = options.runtimeInspector ?? new RuntimeDirectoryInspector();
    this.trialRunner = options.trialRunner ?? new RealProjectTrialRunner();
    this.targetProjectManager = options.targetProjectManager ?? new TargetProjectManager();
    this.targetProjectResolver =
      options.targetProjectResolver ??
      new TargetProjectResolver({
        manager: this.targetProjectManager,
      });
    this.gitStatusReader = options.gitStatusReader ?? new GitStatusReader();
    this.gitDiffReader = options.gitDiffReader ?? new GitDiffReader();
    this.gitChangeBoundary = options.gitChangeBoundary ?? new GitChangeBoundary();
    this.gitReporter = options.gitReporter ?? new GitReporter();
    this.patchApplyRunner = options.patchApplyRunner ?? new PatchApplyRunner();
    this.patchProposalParser = options.patchProposalParser ?? new PatchProposalParser();
    this.agentProviderConfigReader = new AgentProviderConfigReader();
  }

  public async init(command: CliInitCommand): Promise<unknown> {
    const projectRoot = this.resolveWorkspaceRoot(command.projectRoot);

    return this.bootstrapper.write({
      rootDir: projectRoot,
      confirmCreate: true,
      confirmOverwrite: command.confirmOverwrite,
    });
  }

  public async inspect(command: CliInspectCommand): Promise<unknown> {
    const resolution = await this.resolveTargetProject(command.projectRoot);

    return this.trialRunner.run({
      projectName: this.resolveProjectName(command.projectName, resolution.project),
      targetProjectRoot: resolution.projectRoot,
      objective: command.objective,
      allowWrites: false,
      allowCommandExecution: false,
      targetFiles: command.targetFiles,
    });
  }

  public async validate(command: CliValidateCommand): Promise<unknown> {
    const resolution = await this.resolveTargetProject(command.projectRoot);

    return this.trialRunner.validate({
      projectName: this.resolveProjectName(command.projectName, resolution.project),
      targetProjectRoot: resolution.projectRoot,
      objective: command.objective,
      allowWrites: false,
      allowCommandExecution: true,
      targetFiles: command.targetFiles,
    });
  }

  public async repair(command: CliRepairCommand): Promise<unknown> {
    const resolution = await this.resolveTargetProject(command.projectRoot);
    const projectRoot = resolution.projectRoot;
    const gitBoundary = await this.gitChangeBoundary.capture(projectRoot);
    const gitGuard = new GitWorkingTreeGuard().evaluate(gitBoundary);

    const validationReport = await this.trialRunner.validate({
      projectName: this.resolveProjectName(command.projectName, resolution.project),
      targetProjectRoot: projectRoot,
      objective: command.objective,
      allowWrites: false,
      allowCommandExecution: true,
      targetFiles: command.targetFiles,
    });

    const findings = validationReport.validation?.findings ?? [];
    const targetFiles =
      command.targetFiles.length > 0
        ? command.targetFiles
        : this.resolveTargetFilesFromFindings(findings);

    const runner = new RepairAttemptRunner({
      proposalProvider: this.createRepairProposalProvider(command),
    });

    return runner.run({
      objective: command.objective,
      projectRoot,
      targetFiles,
      findings,
      memoryContextSources: await this.loadRepairMemoryContextSources({
        command,
        projectRoot,
        projectName: this.resolveProjectName(command.projectName, resolution.project),
      }),
      gitBoundary: {
        boundary: gitBoundary,
        guard: gitGuard,
        safeToWriteLater: gitGuard.allowed,
      },
    });
  }

  public async status(command: CliStatusCommand): Promise<unknown> {
    const projectRoot = this.resolveWorkspaceRoot(command.projectRoot);
    const inspection = await this.runtimeInspector.inspect(projectRoot);

    return {
      projectRoot,
      runtimeExists: inspection.runtimeExists,
      runtimeDir: inspection.runtimeDir,
      existingFiles: inspection.existingFiles,
      missingFiles: inspection.missingFiles,
      inspectedAt: inspection.inspectedAt,
    };
  }

  public async doctor(command: CliDoctorCommand): Promise<unknown> {
    const projectRoot = this.resolveWorkspaceRoot(command.projectRoot);
    const runtime = await this.runtimeInspector.inspect(projectRoot);
    const bootstrapPlan = await this.bootstrapper.preview(projectRoot);

    return {
      projectRoot,
      ready: runtime.runtimeExists && runtime.missingFiles.length === 0,
      runtime,
      stack: bootstrapPlan.stack,
      issues: bootstrapPlan.issues,
      checks: {
        runtimeDirectory: runtime.runtimeExists ? 'passed' : 'failed',
        runtimeFiles: runtime.missingFiles.length === 0 ? 'passed' : 'warning',
        packageJson: bootstrapPlan.stack.hasPackageJson ? 'passed' : 'warning',
        tsconfig: bootstrapPlan.stack.hasTsConfig ? 'passed' : 'warning',
      },
    };
  }

  public async project(command: CliProjectCommand): Promise<unknown> {
    const workspaceRoot = this.resolveWorkspaceRoot(command.projectRoot);

    if (command.action === 'add') {
      if (!command.targetName || !command.targetPath) {
        throw new Error('project add requires --name and --path.');
      }

      return {
        action: 'add',
        config: await this.targetProjectManager.add(
          {
            name: command.targetName,
            rootPath: command.targetPath,
            setCurrent: command.setCurrent,
          },
          workspaceRoot,
        ),
      };
    }

    if (command.action === 'list') {
      return {
        action: 'list',
        config: await this.targetProjectManager.list(workspaceRoot),
      };
    }

    if (command.action === 'current') {
      return {
        action: 'current',
        project: await this.targetProjectManager.current(workspaceRoot),
      };
    }

    if (command.action === 'use') {
      if (!command.projectRef) {
        throw new Error('project use requires a project name or id.');
      }

      return {
        action: 'use',
        config: await this.targetProjectManager.use(
          {
            projectRef: command.projectRef,
          },
          workspaceRoot,
        ),
      };
    }

    if (!command.projectRef) {
      throw new Error('project remove requires a project name or id.');
    }

    return {
      action: 'remove',
      config: await this.targetProjectManager.remove(
        {
          projectRef: command.projectRef,
        },
        workspaceRoot,
      ),
    };
  }

  public async git(command: CliGitCommand): Promise<unknown> {
    const resolution = await this.resolveTargetProject(command.projectRoot);
    const projectRoot = resolution.projectRoot;

    if (command.action === 'status') {
      const status = await this.gitStatusReader.read(projectRoot);

      return {
        action: 'status',
        status,
        text: this.gitReporter.statusToText(status),
      };
    }

    if (command.action === 'diff') {
      const diff = await this.gitDiffReader.read({
        projectRoot,
        target: command.target,
        staged: command.staged,
        maxBytes: command.maxBytes,
      });

      return {
        action: 'diff',
        diff,
        text: this.gitReporter.diffToText(diff),
      };
    }

    const boundary = await this.gitChangeBoundary.capture(projectRoot);
    const guard = new GitWorkingTreeGuard({
      allowDirtyWorkingTree: command.allowDirty,
      allowMissingRepository: command.allowMissingRepository,
    }).evaluate(boundary);

    return {
      action: 'doctor',
      boundary,
      guard,
      text: this.gitReporter.boundaryToText({
        boundary,
        guard,
      }),
    };
  }

  public async patch(command: CliPatchCommand): Promise<unknown> {
    const resolution = await this.resolveTargetProject(command.projectRoot);
    const projectRoot = resolution.projectRoot;

    if (!command.proposalPath) {
      throw new Error('patch apply requires --proposal.');
    }

    const rawProposal = await readFile(resolve(command.proposalPath), 'utf8');
    const parsed = this.patchProposalParser.parse(rawProposal);

    if (!parsed.ok) {
      throw new Error(`Invalid patch proposal JSON: ${parsed.error.message}`);
    }

    return this.patchApplyRunner.run({
      projectRoot,
      proposal: parsed.value,
      applyConfirmed: true,
      allowDirtyWorkingTree: command.allowDirty,
      allowMissingRepository: command.allowMissingRepository,
      confirmDelete: command.confirmDelete,
      backupEnabled: command.backupEnabled,
    });
  }
  public async security(command: CliSecurityCommand): Promise<unknown> {
    const projectRoot = this.resolveWorkspaceRoot(command.projectRoot);
    const reportPath = resolve(
      command.outputPath ?? join(projectRoot, '.runtime/security-review-report.json'),
    );

    const suite = new SecurityRegressionSuite({
      reporter: new SecurityReviewReporter({
        outputPath: reportPath,
      }),
    });

    const result = await suite.run({
      projectName: command.projectName,
      projectRoot,
    });

    return {
      action: command.action,
      projectRoot,
      projectName: command.projectName,
      reportPath: result.outputPath,
      summary: result.report.summary,
    };
  }

  public async agent(command: CliAgentCommand): Promise<unknown> {
    const projectRoot = this.resolveWorkspaceRoot(command.projectRoot);
    const statePath = resolve(projectRoot, '.runtime/agent-loop-state.json');
    const reportPath = resolve(projectRoot, '.runtime/agent-loop-report.md');

    const store = new AgentLoopStateStore({
      outputPath: statePath,
    });

    const reporter = new AgentLoopReporter({
      outputPath: reportPath,
    });

    const loop = new InteractiveAgentLoop({
      store,
      reporter,
    });

    const executor = new AgentStepExecutor({
      store,
      reporter,
    });

    if (command.action === 'start') {
      const providerConfig = this.agentProviderConfigReader.fromCliCommand(command);

      const state = await loop.start({
        objective: command.objective,
        projectRoot,
        projectName: command.projectName,
        targetFiles: command.targetFiles,
        metadata: this.agentProviderConfigReader.toMetadata(providerConfig),
      });

      return {
        action: command.action,
        state,
      };
    }

    if (command.action === 'reset') {
      await rm(statePath, {
        force: true,
      });

      await rm(reportPath, {
        force: true,
      });

      return {
        action: command.action,
        text: `Zero Runtime agent

Action: reset
Project root: ${projectRoot}

Agent loop state removed:
- ${statePath}
- ${reportPath}`,
      };
    }

    const state = await this.loadAgentState(store);

    if (
      command.action === 'status' ||
      command.action === 'actions' ||
      command.action === 'approvals'
    ) {
      return {
        action: command.action,
        state,
      };
    }

    if (command.action === 'next') {
      return {
        action: command.action,
        state,
        text: this.formatAgentNextAction(state),
      };
    }

    if (command.action === 'step') {
      if (!command.stepKind) {
        throw new Error('agent step requires a step kind.');
      }

      if (command.stepKind === 'report_result') {
        this.assertAgentCanReportResult(state);
      }

      const updated = await executor.execute(state, `agent-action-${command.stepKind}`);

      return {
        action: command.action,
        state: updated,
      };
    }

    if (command.action === 'approve') {
      if (!command.approvalId) {
        throw new Error('agent approve requires an approval id.');
      }

      this.assertAgentApprovalExists(state, command.approvalId);

      const updated = await executor.approve(
        state,
        command.approvalId,
        command.reason ?? 'Approved from CLI.',
      );

      return {
        action: command.action,
        state: updated,
      };
    }

    if (command.action === 'reject') {
      if (!command.approvalId) {
        throw new Error('agent reject requires an approval id.');
      }

      this.assertAgentApprovalExists(state, command.approvalId);

      const updated = await executor.reject(
        state,
        command.approvalId,
        command.reason ?? 'Rejected from CLI.',
      );

      return {
        action: command.action,
        state: updated,
      };
    }

    return {
      action: command.action,
      state,
      text: await readFile(reportPath, 'utf8'),
    };
  }

  public async scaffold(command: CliScaffoldCommand): Promise<unknown> {
    const projectRoot = this.resolveWorkspaceRoot(command.projectRoot);
    const reportPath = resolve(
      command.outputPath ?? join(projectRoot, '.runtime/scaffold-report.json'),
    );

    const runner = new ScaffoldRunner({
      reporter: new ScaffoldReporter({
        outputPath: reportPath,
      }),
    });

    const result = await runner.run({
      projectRoot,
      objective: command.objective,
      intent: {
        kind: 'module',
        name: command.moduleName,
        moduleKind: command.moduleKind,
        targetPath: command.targetPath,
        provider: command.provider,
        providerModel: command.providerModel,
        allowRealProvider: command.allowRealProvider,
        allowPremium: command.allowPremium,
        premiumApproved: command.premiumApproved,
        includeProjectMemory: command.includeProjectMemory,
        overwriteExisting: command.overwriteExisting,
        dryRun: command.dryRun,
      },
    });
    const proposalOutputPath =
      command.proposalOutputPath && result.patchProposal
        ? await new ScaffoldPatchProposalWriter().write({
            outputPath: resolve(projectRoot, command.proposalOutputPath),
            proposal: result.patchProposal,
          })
        : undefined;
    return {
      action: command.action,
      projectRoot,
      reportPath,
      proposalOutputPath,
      status: result.status,
      failures: result.failures,
      proposalId: result.proposal?.id,
      patchProposalId: result.patchProposal?.id,
      operations:
        result.patchProposal?.operations.map((operation) => {
          return {
            kind: operation.kind,
            targetFile: operation.targetFile,
            reason: operation.reason,
          };
        }) ?? [],
      diffPreviews: result.diffPreviews.map((preview) => {
        return {
          targetFile: preview.targetFile,
          changed: preview.changed,
          changedLines: preview.changedLines,
          markdown: preview.markdown,
        };
      }),
      safety: result.safety,
    };
  }
  private async loadAgentState(
    store: AgentLoopStateStore,
  ): Promise<Awaited<ReturnType<AgentLoopStateStore['load']>>> {
    try {
      return await store.load();
    } catch (error) {
      throw new Error(
        `No agent loop state found. Run "zero agent start --project <path> --target <file> --objective <objective>" first. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private formatAgentNextAction(state: Awaited<ReturnType<AgentLoopStateStore['load']>>): string {
    const nextAction = state.actions.find((action) => {
      if (action.status === 'executed') {
        return false;
      }

      if (action.kind === 'apply_patch' && action.status === 'blocked') {
        return true;
      }

      return action.status === 'pending' || action.status === 'selected';
    });

    if (!nextAction) {
      return `Zero Runtime agent next

Status: ${state.status}
Project: ${state.projectName}
Root: ${state.projectRoot}

No pending actions found.`;
    }

    return `Zero Runtime agent next

Status: ${state.status}
Project: ${state.projectName}
Root: ${state.projectRoot}

Next action:
- ID: ${nextAction.id}
- Kind: ${nextAction.kind}
- Label: ${nextAction.label}
- Status: ${nextAction.status}
- Requires approval: ${nextAction.requiresApproval ? 'yes' : 'no'}

Suggested command:
zero agent step ${nextAction.kind} --project ${state.projectRoot}`;
  }

  private assertAgentApprovalExists(
    state: Awaited<ReturnType<AgentLoopStateStore['load']>>,
    approvalId: string,
  ): void {
    const exists = state.approvals.some((approval) => approval.id === approvalId);

    if (!exists) {
      throw new Error(`Agent approval not found: ${approvalId}`);
    }
  }

  private assertAgentCanReportResult(
    state: Awaited<ReturnType<AgentLoopStateStore['load']>>,
  ): void {
    const metadata = state.metadata ?? {};
    const hasPatchApply = metadata['execution_apply_patch'] !== undefined;
    const hasRevalidation = metadata['execution_revalidate_project'] !== undefined;

    if (!hasPatchApply || !hasRevalidation) {
      throw new Error(
        'agent step report_result requires apply_patch and revalidate_project to be executed first.',
      );
    }
  }

  private async resolveTargetProject(
    explicitProjectRoot: string | undefined,
  ): Promise<TargetProjectResolveResult> {
    return this.targetProjectResolver.resolve({
      explicitProjectRoot,
      workspaceRoot: process.cwd(),
    });
  }

  private resolveWorkspaceRoot(projectRoot: string | undefined): string {
    return resolve(projectRoot ?? process.cwd());
  }

  private resolveProjectName(
    commandProjectName: string,
    project: WorkspaceTargetProject | undefined,
  ): string {
    if (commandProjectName !== 'target-project') {
      return commandProjectName;
    }

    return project?.name ?? commandProjectName;
  }

  private resolveTargetFilesFromFindings(
    findings: readonly {
      relatedFile?: string | undefined;
    }[],
  ): string[] {
    return [
      ...new Set(
        findings
          .map((finding) => finding.relatedFile)
          .filter((file): file is string => typeof file === 'string' && file.trim().length > 0),
      ),
    ];
  }
  private createRepairProposalProvider(command: CliRepairCommand): RepairProposalProvider {
    const fallback = new StaticRepairProposalProvider(this.createStaticRepairProposal());

    if (command.provider === 'static') {
      return new PolicyAwareRepairProposalProvider({
        provider: 'static',
        primary: fallback,
        fallback,
      });
    }

    if (command.provider === 'fake-llm') {
      return new PolicyAwareRepairProposalProvider({
        provider: 'fake-llm',
        primary: new FakeLlmRepairProposalProvider({
          mode: command.fakeProviderMode,
        }),
        fallback,
      });
    }

    const openRouterProvider = this.createOpenRouterRepairProposalProvider(command);

    return new PolicyAwareRepairProposalProvider({
      provider: 'openrouter',
      primary: openRouterProvider,
      fallback,
      requestedModel: openRouterProvider.model,
      estimatedCompletionTokens: command.estimatedCompletionTokens,
      allowPremium: command.allowPremium,
      premiumApproved: command.premiumApproved,
    });
  }
  private createOpenRouterRepairProposalProvider(
    command: CliRepairCommand,
  ): OpenRouterRepairProposalProvider {
    if (command.allowRealProvider !== true) {
      throw new Error(
        'OpenRouter repair provider requires --allow-real-provider to prevent accidental real provider calls.',
      );
    }

    const loader = new OpenRouterConfigLoader();
    const config = loader.load({
      defaultModel: command.providerModel,
      requireApiKey: true,
      requireExplicitOptIn: true,
    });

    if (!config.ok) {
      throw new Error(`OpenRouter repair provider configuration failed: ${config.error.message}`);
    }

    const client = new OpenRouterClient({
      config: config.value,
    });

    return new OpenRouterRepairProposalProvider({
      client,
      model: config.value.defaultModel,
      maxTokens: config.value.maxTokens,
      temperature: 0,
    });
  }
  private createStaticRepairProposal(): PatchProposal {
    return {
      id: 'static-cli-repair-proposal',
      summary: 'Static CLI repair provider placeholder.',
      riskLevel: 'low',
      operations: [],
      explanation:
        'Static repair provider intentionally produces no patch operations. Use --provider fake-llm for parser-backed fake model output.',
    };
  }
  private async loadRepairMemoryContextSources(input: {
    command: CliRepairCommand;
    projectRoot: string;
    projectName: string;
  }) {
    if (input.command.includeProjectMemory !== true) {
      return [];
    }

    const reader = new ProjectMemoryReader({
      store: new ProjectMemoryStore({
        projectRoot: input.projectRoot,
        projectName: input.projectName,
      }),
    });

    const source = await reader.readContextSource();

    return source ? [source] : [];
  }
}
