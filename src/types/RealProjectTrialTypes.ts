import type { JsonObject } from './SharedTypes.js';

export type RealProjectTrialStatus = 'created' | 'inspected' | 'blocked' | 'failed';

export type RealProjectTrialStack = 'next' | 'react' | 'node' | 'typescript' | 'unknown';

export interface RealProjectTrialInput {
  projectName: string;
  targetProjectRoot: string;
  objective: string;
  allowWrites: boolean;
  allowCommandExecution: boolean;
  targetFiles: string[];
}

export interface RealProjectTrialSafetyIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RealProjectTrialPackageInfo {
  name: string | null;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface RealProjectTrialConfigInfo {
  hasPackageJson: boolean;
  hasTsconfig: boolean;
  hasEslintConfig: boolean;
  hasNextConfig: boolean;
  hasPrismaSchema: boolean;
  detectedStack: RealProjectTrialStack[];
}

export interface RealProjectTrialTargetFileInfo {
  relativePath: string;
  exists: boolean;
  bytes?: number | undefined;
  extension?: string | undefined;
}

export interface RealProjectTrialInspection {
  projectRoot: string;
  packageInfo: RealProjectTrialPackageInfo;
  configInfo: RealProjectTrialConfigInfo;
  targetFiles: RealProjectTrialTargetFileInfo[];
  ignoredSensitiveFiles: string[];
  inspectedAt: string;
  metadata?: JsonObject | undefined;
}

export interface RealProjectTrialReport {
  id: string;
  status: RealProjectTrialStatus;
  projectName: string;
  objective: string;
  allowWrites: boolean;
  allowCommandExecution: boolean;
  createdAt: string;
  updatedAt: string;
  inspection?: RealProjectTrialInspection | undefined;
  issues: RealProjectTrialSafetyIssue[];
  nextRecommendedActions: string[];
  validation?: RealProjectTrialValidationSummary | undefined;
}
export type RealProjectTrialValidationStatus =
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'timeout'
  | 'skipped';

export type RealProjectTrialValidationCommandKind = 'npm_script' | 'node_binary' | 'noop';

export interface RealProjectTrialValidationCommand {
  id: string;
  kind: RealProjectTrialValidationCommandKind;
  scriptName: string;
  command: string;
  args: string[];
  reason: string;
  timeoutMs: number;
  maxOutputBytes: number;
}

export interface RealProjectTrialValidationResult {
  commandId: string;
  scriptName: string;
  command: string;
  args: string[];
  status: RealProjectTrialValidationStatus;
  exitCode?: number | undefined;
  stdout: string;
  stderr: string;
  outputBytes: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  issues: RealProjectTrialSafetyIssue[];
}

export interface RealProjectTrialErrorFinding {
  id: string;
  source: string;
  message: string;
  relatedFile?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  severity: 'info' | 'warning' | 'error';
}

export interface RealProjectTrialValidationSummary {
  status: RealProjectTrialValidationStatus;
  commands: RealProjectTrialValidationResult[];
  findings: RealProjectTrialErrorFinding[];
  validatedAt: string;
}
