export type DetectedStack = 'typescript' | 'javascript' | 'node' | 'react' | 'next' | 'unknown';

export interface StackDetectionResult {
  rootDir: string;
  stacks: DetectedStack[];
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | undefined;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasSrcDirectory: boolean;
  detectedAt: string;
}

export interface RuntimeBootstrapFile {
  relativePath: string;
  content: string;
}

export interface RuntimeDirectoryInspection {
  rootDir: string;
  runtimeDir: string;
  runtimeExists: boolean;
  existingFiles: string[];
  missingFiles: string[];
  inspectedAt: string;
}

export type RuntimeBootstrapPlanStatus = 'ready' | 'blocked';

export interface RuntimeBootstrapPlanIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RuntimeBootstrapPlan {
  rootDir: string;
  status: RuntimeBootstrapPlanStatus;
  files: RuntimeBootstrapFile[];
  inspection: RuntimeDirectoryInspection;
  stack: StackDetectionResult;
  issues: RuntimeBootstrapPlanIssue[];
  createdAt: string;
}

export interface RuntimeBootstrapWriteInput {
  rootDir: string;
  confirmCreate: boolean;
  confirmOverwrite?: boolean | undefined;
}

export interface RuntimeBootstrapWriteResult {
  rootDir: string;
  status: 'written' | 'blocked';
  writtenFiles: string[];
  skippedFiles: string[];
  issues: RuntimeBootstrapPlanIssue[];
  createdAt: string;
}
