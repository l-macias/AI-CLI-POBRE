import type { AgentActionKind } from '../agent/AgentTypes.js';
import type { FakeLlmRepairProposalMode } from '../repair/FakeLlmRepairProposalProvider.js';

export type CliCommandName =
  | 'help'
  | 'init'
  | 'inspect'
  | 'validate'
  | 'repair'
  | 'status'
  | 'doctor'
  | 'project'
  | 'git'
  | 'patch'
  | 'agent'
  | 'security'
  | 'scaffold'
  | 'demo'
  | 'quickstart'
  | 'memory';

export type CliProjectAction = 'add' | 'list' | 'use' | 'current' | 'remove';
export type CliMemoryAction = 'list' | 'inspect' | 'clear';
export type CliGitAction = 'status' | 'diff' | 'doctor';

export type CliPatchAction = 'apply';

export type CliAgentAction =
  | 'start'
  | 'status'
  | 'step'
  | 'approve'
  | 'reject'
  | 'report'
  | 'actions'
  | 'approvals'
  | 'next'
  | 'run'
  | 'reset';

export type CliAgentRunUntil = 'approval';

export type CliSecurityAction = 'review';
export type CliScaffoldAction = 'module';
export type CliDemoAction = 'product-flow';
export type CliScaffoldModuleKind = 'backend' | 'frontend' | 'fullstack' | 'library' | 'generic';
export type CliRepairProvider = 'fake-llm' | 'static' | 'openrouter';

export type CliOutputFormat = 'text' | 'json';

export interface CliBaseCommand {
  name: CliCommandName;
  format: CliOutputFormat;
  projectRoot?: string | undefined;
}

export interface CliHelpCommand extends CliBaseCommand {
  name: 'help';
}
export interface CliQuickstartCommand extends CliBaseCommand {
  name: 'quickstart';
}
export interface CliInitCommand extends CliBaseCommand {
  name: 'init';
  confirmOverwrite: boolean;
}

export interface CliInspectCommand extends CliBaseCommand {
  name: 'inspect';
  projectName: string;
  objective: string;
  targetFiles: string[];
}

export interface CliValidateCommand extends CliBaseCommand {
  name: 'validate';
  projectName: string;
  objective: string;
  targetFiles: string[];
}

export interface CliRepairCommand extends CliBaseCommand {
  name: 'repair';
  projectName: string;
  objective: string;
  targetFiles: string[];
  provider: CliRepairProvider;
  fakeProviderMode: FakeLlmRepairProposalMode;
  providerModel?: string | undefined;
  estimatedCompletionTokens?: number | undefined;
  allowPremium: boolean;
  premiumApproved: boolean;
  allowRealProvider: boolean;
  includeProjectMemory: boolean;
  interactive: boolean;
}

export interface CliStatusCommand extends CliBaseCommand {
  name: 'status';
}

export interface CliDoctorCommand extends CliBaseCommand {
  name: 'doctor';
}

export interface CliProjectCommand extends CliBaseCommand {
  name: 'project';
  action: CliProjectAction;
  projectRef?: string | undefined;
  targetPath?: string | undefined;
  targetName?: string | undefined;
  setCurrent?: boolean | undefined;
  interactive: boolean;
}
export interface CliMemoryCommand extends CliBaseCommand {
  name: 'memory';
  action: CliMemoryAction;
  entryId?: string | undefined;
  confirmClear: boolean;
}
export interface CliGitCommand extends CliBaseCommand {
  name: 'git';
  action: CliGitAction;
  target?: string | undefined;
  staged: boolean;
  maxBytes: number;
  allowDirty: boolean;
  allowMissingRepository: boolean;
}

export interface CliPatchCommand extends CliBaseCommand {
  name: 'patch';
  action: CliPatchAction;
  proposalPath?: string | undefined;
  confirmApply: boolean;
  dryRun: boolean;
  allowDirty: boolean;
  allowMissingRepository: boolean;
  confirmDelete: boolean;
  backupEnabled: boolean;
}

export interface CliAgentCommand extends CliBaseCommand {
  name: 'agent';
  action: CliAgentAction;
  projectName: string;
  objective: string;
  targetFiles: string[];
  stepKind?: AgentActionKind | undefined;
  approvalId?: string | undefined;
  reason?: string | undefined;
  runUntil?: CliAgentRunUntil | undefined;
  confirmReset: boolean;
  includeProjectMemory: boolean;
  provider: CliRepairProvider;
  fakeProviderMode: FakeLlmRepairProposalMode;
  providerModel?: string | undefined;
  estimatedCompletionTokens?: number | undefined;
  allowRealProvider: boolean;
  allowPremium: boolean;
  premiumApproved: boolean;
  interactive: boolean;
}

export interface CliSecurityCommand extends CliBaseCommand {
  name: 'security';
  action: CliSecurityAction;
  projectName: string;
  outputPath?: string | undefined;
}

export interface CliScaffoldCommand extends CliBaseCommand {
  name: 'scaffold';
  action: CliScaffoldAction;
  moduleName: string;
  moduleKind: CliScaffoldModuleKind;
  targetPath: string;
  provider: CliRepairProvider;
  providerModel?: string | undefined;
  allowRealProvider: boolean;
  allowPremium: boolean;
  premiumApproved: boolean;
  includeProjectMemory: boolean;
  overwriteExisting: boolean;
  dryRun: boolean;
  objective?: string | undefined;
  outputPath?: string | undefined;
  proposalOutputPath?: string | undefined;
  interactive: boolean;
}
export interface CliDemoCommand extends CliBaseCommand {
  name: 'demo';
  action: CliDemoAction;
}
export type CliCommand =
  | CliHelpCommand
  | CliQuickstartCommand
  | CliInitCommand
  | CliInspectCommand
  | CliValidateCommand
  | CliRepairCommand
  | CliStatusCommand
  | CliDoctorCommand
  | CliProjectCommand
  | CliGitCommand
  | CliPatchCommand
  | CliAgentCommand
  | CliSecurityCommand
  | CliScaffoldCommand
  | CliDemoCommand
  | CliMemoryCommand;
export interface CliParseIssue {
  code: string;
  message: string;
}

export type CliParseResult =
  | {
      ok: true;
      command: CliCommand;
    }
  | {
      ok: false;
      issues: CliParseIssue[];
    };

export interface CliRunResult {
  command: CliCommandName;
  status: 'ok' | 'error';
  output: unknown;
  issues: CliParseIssue[];
  createdAt: string;
}
