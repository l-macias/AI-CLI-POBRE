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

export interface AgentRuntimeBridgeOptions {
  cliBridge?: CliRuntimeBridge | undefined;
  patchApplyRunner?: PatchApplyRunner | undefined;
}

export class AgentRuntimeBridge {
  private readonly cliBridge: CliRuntimeBridge;
  private readonly patchApplyRunner: PatchApplyRunner;

  public constructor(options: AgentRuntimeBridgeOptions = {}) {
    this.cliBridge = options.cliBridge ?? new CliRuntimeBridge();
    this.patchApplyRunner = options.patchApplyRunner ?? new PatchApplyRunner();
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
    const command: CliRepairCommand = {
      name: 'repair',
      format: 'json',
      projectRoot: state.projectRoot,
      projectName: state.projectName,
      objective: state.objective,
      targetFiles: state.targetFiles,
      provider: 'fake-llm',
      fakeProviderMode: 'markdown_json',
      allowPremium: false,
      premiumApproved: false,
      allowRealProvider: false,
      includeProjectMemory: this.shouldIncludeProjectMemory(state.metadata),
    };

    return this.cliBridge.repair(command);
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

  private shouldIncludeProjectMemory(metadata: JsonObject | undefined): boolean {
    return metadata?.['includeProjectMemory'] === true;
  }
}
