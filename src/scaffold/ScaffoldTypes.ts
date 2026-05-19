import type { CliRepairProvider } from '../cli/CliTypes.js';

export type ScaffoldIntentKind = 'module';
export type ScaffoldModuleKind = 'backend' | 'frontend' | 'fullstack' | 'library' | 'generic';

export interface ScaffoldIntentInput {
  kind: ScaffoldIntentKind;
  name: string;
  moduleKind: ScaffoldModuleKind;
  targetPath: string;
  provider: CliRepairProvider;
  providerModel?: string | undefined;
  allowRealProvider: boolean;
  allowPremium: boolean;
  premiumApproved: boolean;
  includeProjectMemory: boolean;
  overwriteExisting: boolean;
  dryRun: boolean;
}

export interface ScaffoldIntent {
  id: string;
  kind: ScaffoldIntentKind;
  name: string;
  normalizedName: string;
  moduleKind: ScaffoldModuleKind;
  targetPath: string;
  normalizedTargetPath: string;
  provider: CliRepairProvider;
  providerModel?: string | undefined;
  allowRealProvider: boolean;
  allowPremium: boolean;
  premiumApproved: boolean;
  includeProjectMemory: boolean;
  overwriteExisting: boolean;
  dryRun: boolean;
  createdAt: string;
}

export interface ScaffoldIntentIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ScaffoldProjectConvention {
  projectRoot: string;
  detectedStack: string[];
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'unknown';
  hasTypeScript: boolean;
  hasSrcDirectory: boolean;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  preferredSourceRoot: string;
  moduleRootHint?: string | undefined;
  testRootHint?: string | undefined;
}

export interface ScaffoldRequest {
  id: string;
  projectRoot: string;
  objective: string;
  intent: ScaffoldIntent;
  convention: ScaffoldProjectConvention;
  constraints: ScaffoldRequestConstraint[];
  expectedOutput: ScaffoldExpectedOutput;
  createdAt: string;
}

export interface ScaffoldRequestConstraint {
  code: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ScaffoldExpectedOutput {
  format: 'json_scaffold_proposal';
  requireFileTree: boolean;
  requireExplanation: boolean;
  requireRiskAssessment: boolean;
  allowedOperations: readonly ['create_file', 'replace_file'];
}

export type ScaffoldIntentParseResult =
  | {
      ok: true;
      intent: ScaffoldIntent;
      issues: ScaffoldIntentIssue[];
    }
  | {
      ok: false;
      issues: ScaffoldIntentIssue[];
    };

export const scaffoldModuleKinds: readonly ScaffoldModuleKind[] = [
  'backend',
  'frontend',
  'fullstack',
  'library',
  'generic',
];

export const scaffoldIntentKinds: readonly ScaffoldIntentKind[] = ['module'];

export type ScaffoldFileOperationKind = 'create_file' | 'replace_file';

export type ScaffoldRiskLevel = 'low' | 'medium' | 'high';

export interface ScaffoldFileProposal {
  kind: ScaffoldFileOperationKind;
  targetFile: string;
  content: string;
  reason: string;
}

export interface ScaffoldProposal {
  id: string;
  summary: string;
  moduleName: string;
  moduleKind: ScaffoldModuleKind;
  targetRoot: string;
  riskLevel: ScaffoldRiskLevel;
  files: ScaffoldFileProposal[];
  explanation: string;
}

export interface ScaffoldProposalValidationIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ScaffoldProposalValidationResult {
  valid: boolean;
  issues: ScaffoldProposalValidationIssue[];
}

export type ScaffoldProposalParseResult =
  | {
      ok: true;
      proposal: ScaffoldProposal;
      validation: ScaffoldProposalValidationResult;
      rawJson: string;
    }
  | {
      ok: false;
      validation: ScaffoldProposalValidationResult;
      rawJson?: string | undefined;
    };

export interface ModuleGeneratorProviderInput {
  request: ScaffoldRequest;
}

export interface ModuleGeneratorProviderResult {
  rawOutput: string;
  provider: string;
  model: string;
  createdAt: string;
}

import type { PatchProposal, RepairDiffPreviewResult } from '../types/RepairTypes.js';

export type ScaffoldRunStatus =
  | 'intent_invalid'
  | 'request_built'
  | 'proposal_received'
  | 'proposal_invalid'
  | 'safety_failed'
  | 'patch_ready'
  | 'failed';

export interface ScaffoldRunStep {
  id: string;
  status: 'executed' | 'blocked' | 'failed';
  description: string;
  timestamp: string;
}

export interface ScaffoldRunResult {
  id: string;
  status: ScaffoldRunStatus;
  projectRoot: string;
  intent?: ScaffoldIntent | undefined;
  request?: ScaffoldRequest | undefined;
  providerResult?: ModuleGeneratorProviderResult | undefined;
  proposal?: ScaffoldProposal | undefined;
  proposalValidation: ScaffoldProposalValidationResult;
  safety: ScaffoldSafetyValidationSummary;
  patchProposal?: PatchProposal | undefined;
  steps: ScaffoldRunStep[];
  failures: string[];
  createdAt: string;
  completedAt: string;
  diffPreviews: RepairDiffPreviewResult[];
}

export interface ScaffoldSafetyValidationSummary {
  safe: boolean;
  issues: ScaffoldProposalValidationIssue[];
}
