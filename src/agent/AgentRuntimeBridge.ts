import { PatchApplyRunner } from '../patch-apply/PatchApplyRunner.js';
import { CliRuntimeBridge } from '../cli/CliRuntimeBridge.js';
import type {
  CliGitCommand,
  CliInspectCommand,
  CliRepairCommand,
  CliValidateCommand,
} from '../cli/CliTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';
import type { PatchProposal } from '../types/RepairTypes.js';
import type { AgentLoopState } from './AgentTypes.js';
import { AgentProviderAuditReporter } from './AgentProviderAuditReporter.js';
import { AgentProviderConfigReader } from './AgentProviderConfigReader.js';
import { AgentProviderPolicy } from './AgentProviderPolicy.js';

export interface AgentCliRuntimeBridge {
  inspect(command: CliInspectCommand): Promise<unknown>;
  validate(command: CliValidateCommand): Promise<unknown>;
  git(command: CliGitCommand): Promise<unknown>;
  repair(command: CliRepairCommand): Promise<unknown>;
}

export interface AgentRuntimeBridgeOptions {
  cliBridge?: AgentCliRuntimeBridge | undefined;
  patchApplyRunner?: PatchApplyRunner | undefined;
  providerConfigReader?: AgentProviderConfigReader | undefined;
  providerPolicy?: AgentProviderPolicy | undefined;
  providerAuditReporter?: AgentProviderAuditReporter | undefined;
}

export class AgentRuntimeBridge {
  private readonly cliBridge: AgentCliRuntimeBridge;
  private readonly patchApplyRunner: PatchApplyRunner;
  private readonly providerConfigReader: AgentProviderConfigReader;
  private readonly providerPolicy: AgentProviderPolicy;
  private readonly providerAuditReporter: AgentProviderAuditReporter;

  public constructor(options: AgentRuntimeBridgeOptions = {}) {
    this.cliBridge = options.cliBridge ?? new CliRuntimeBridge();
    this.patchApplyRunner = options.patchApplyRunner ?? new PatchApplyRunner();
    this.providerConfigReader = options.providerConfigReader ?? new AgentProviderConfigReader();
    this.providerPolicy = options.providerPolicy ?? new AgentProviderPolicy();
    this.providerAuditReporter = options.providerAuditReporter ?? new AgentProviderAuditReporter();
  }

  public async inspectProject(state: AgentLoopState): Promise<unknown> {
    const command: CliInspectCommand = {
      name: 'inspect',
      format: 'json',
      projectRoot: state.projectRoot,
      projectName: state.projectName,
      objective: state.objective,
      targetFiles: state.targetFiles,
    };

    return this.cliBridge.inspect(command);
  }

  public async validateProject(state: AgentLoopState): Promise<unknown> {
    const command: CliValidateCommand = {
      name: 'validate',
      format: 'json',
      projectRoot: state.projectRoot,
      projectName: state.projectName,
      objective: state.objective,
      targetFiles: state.targetFiles,
    };

    return this.cliBridge.validate(command);
  }

  public async checkGit(state: AgentLoopState): Promise<unknown> {
    const command: CliGitCommand = {
      name: 'git',
      format: 'json',
      projectRoot: state.projectRoot,
      action: 'doctor',
      staged: false,
      maxBytes: 200_000,
      allowDirty: false,
      allowMissingRepository: true,
    };

    return this.cliBridge.git(command);
  }

  public async requestRepairProposal(state: AgentLoopState): Promise<unknown> {
    const providerConfig = this.providerConfigReader.fromMetadata(state.metadata);
    const providerDecision = this.providerPolicy.evaluate(providerConfig);
    const providerAudit = this.providerAuditReporter.toMetadata({
      source: 'agent-runtime-bridge:request-repair-proposal',
      config: providerConfig,
      decision: providerDecision,
    });

    const command: CliRepairCommand = {
      name: 'repair',
      format: 'json',
      projectRoot: state.projectRoot,
      projectName: state.projectName,
      objective: state.objective,
      targetFiles: state.targetFiles,
      provider: providerDecision.allowed
        ? providerConfig.provider
        : providerDecision.fallbackProvider,
      fakeProviderMode: providerConfig.fakeProviderMode,
      providerModel: providerDecision.allowed ? providerDecision.providerModel : undefined,
      estimatedCompletionTokens: providerDecision.estimatedCompletionTokens,
      allowPremium: providerDecision.allowed ? providerConfig.allowPremium : false,
      premiumApproved: providerDecision.allowed ? providerConfig.premiumApproved : false,
      allowRealProvider: providerDecision.allowed ? providerConfig.allowRealProvider : false,
      includeProjectMemory: providerConfig.includeProjectMemory,
    };

    const repairOutput = await this.cliBridge.repair(command);

    return this.mergeRepairOutputWithProviderAudit({
      repairOutput,
      providerAudit,
    });
  }

  public async applyPatch(input: {
    state: AgentLoopState;
    proposal: PatchProposal;
  }): Promise<unknown> {
    return this.patchApplyRunner.run({
      projectRoot: input.state.projectRoot,
      proposal: input.proposal,
      applyConfirmed: true,
      allowDirtyWorkingTree: false,
      allowMissingRepository: false,
      confirmDelete: false,
      backupEnabled: true,
    });
  }

  public async revalidateProject(state: AgentLoopState): Promise<unknown> {
    return this.validateProject(state);
  }

  private mergeRepairOutputWithProviderAudit(input: {
    repairOutput: unknown;
    providerAudit: JsonObject;
  }): unknown {
    if (
      typeof input.repairOutput !== 'object' ||
      input.repairOutput === null ||
      Array.isArray(input.repairOutput)
    ) {
      return {
        output: input.repairOutput,
        agentProviderAudit: input.providerAudit,
      };
    }

    return {
      ...input.repairOutput,
      agentProviderAudit: input.providerAudit,
    };
  }
}
