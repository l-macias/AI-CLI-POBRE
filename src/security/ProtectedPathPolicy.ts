import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import type {
  SecurityFinding,
  SecurityFindingCategory,
  SecuritySeverity,
} from './SecurityReviewTypes.js';

export type ProtectedPathOperation =
  | 'read'
  | 'write'
  | 'create'
  | 'edit'
  | 'delete'
  | 'patch'
  | 'report';

export interface ProtectedPathPolicyOptions {
  protectedPathFragments?: string[] | undefined;
  protectedFileNames?: string[] | undefined;
  allowRuntimeDirectory?: boolean | undefined;
}

export interface ProtectedPathPolicyCheckInput {
  projectRoot: string;
  targetPath: string;
  operation: ProtectedPathOperation;
  source?: string | undefined;
}

export interface ProtectedPathPolicyResult {
  allowed: boolean;
  normalizedTargetPath: string;
  absoluteTargetPath: string | undefined;
  findings: SecurityFinding[];
}

interface PathIssueInput {
  code: string;
  severity: SecuritySeverity;
  message: string;
  recommendation: string;
  evidence?: string | undefined;
}

const defaultProtectedPathFragments = [
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.wrangler',
  '.open-next',
  '.turbo',
  '.vercel',
  'coverage',
];

const defaultProtectedFileNames = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.npmrc',
  '.pypirc',
  '.netrc',
  'id_rsa',
  'id_ed25519',
];

const runtimeProtectedFileNames = [
  'project-memory.json',
  'agent-loop-state.json',
  'state.json',
  'workspace-config.json',
];

export class ProtectedPathPolicy {
  private readonly protectedPathFragments: readonly string[];
  private readonly protectedFileNames: readonly string[];
  private readonly allowRuntimeDirectory: boolean;

  public constructor(options: ProtectedPathPolicyOptions = {}) {
    this.protectedPathFragments = [
      ...defaultProtectedPathFragments,
      ...(options.protectedPathFragments ?? []),
    ].map((fragment) => this.normalizeForComparison(fragment));

    this.protectedFileNames = [
      ...defaultProtectedFileNames,
      ...(options.protectedFileNames ?? []),
    ].map((fileName) => fileName.toLowerCase());

    this.allowRuntimeDirectory = options.allowRuntimeDirectory ?? true;
  }

  public validateTarget(input: ProtectedPathPolicyCheckInput): ProtectedPathPolicyResult {
    const normalizedTargetPath = this.normalizeTargetPath(input.targetPath);
    const findings: SecurityFinding[] = [];

    if (!normalizedTargetPath) {
      findings.push(
        this.createFinding(input, {
          code: 'PROTECTED_PATH_EMPTY_TARGET',
          severity: 'error',
          message: 'Target path must be a non-empty relative path.',
          recommendation: 'Provide a concrete relative project path before any runtime operation.',
        }),
      );

      return {
        allowed: false,
        normalizedTargetPath,
        absoluteTargetPath: undefined,
        findings,
      };
    }

    if (this.containsNullByte(input.targetPath)) {
      findings.push(
        this.createFinding(input, {
          code: 'PROTECTED_PATH_NULL_BYTE',
          severity: 'critical',
          message: `Target path contains a null byte: ${input.targetPath}`,
          recommendation: 'Reject null-byte paths before filesystem resolution.',
          evidence: input.targetPath,
        }),
      );
    }

    if (this.isAbsolutePath(input.targetPath) || this.isAbsolutePath(normalizedTargetPath)) {
      findings.push(
        this.createFinding(input, {
          code: 'PROTECTED_PATH_ABSOLUTE_BLOCKED',
          severity: 'critical',
          message: `Absolute paths are not allowed: ${input.targetPath}`,
          recommendation:
            'Use project-relative paths only. The runtime must resolve targets inside the approved project root.',
          evidence: input.targetPath,
        }),
      );
    }

    if (this.hasTraversalSegment(normalizedTargetPath)) {
      findings.push(
        this.createFinding(input, {
          code: 'PROTECTED_PATH_TRAVERSAL_BLOCKED',
          severity: 'critical',
          message: `Path traversal is not allowed: ${input.targetPath}`,
          recommendation:
            'Reject any target containing ".." segments before applying patches or filesystem writes.',
          evidence: input.targetPath,
        }),
      );
    }

    const absoluteTargetPath = this.resolveInsideProjectRoot({
      projectRoot: input.projectRoot,
      normalizedTargetPath,
    });

    if (!absoluteTargetPath) {
      findings.push(
        this.createFinding(input, {
          code: 'PROTECTED_PATH_ROOT_ESCAPE_BLOCKED',
          severity: 'critical',
          message: `Target escapes project root: ${input.targetPath}`,
          recommendation:
            'Block operations whose resolved absolute path is outside the approved project root.',
          evidence: input.targetPath,
        }),
      );
    }

    if (this.isProtectedTarget(normalizedTargetPath)) {
      findings.push(
        this.createFinding(input, {
          code: 'PROTECTED_PATH_TARGET_BLOCKED',
          severity: 'error',
          message: `Protected path blocked: ${input.targetPath}`,
          recommendation:
            'Do not allow runtime writes, patches, deletes, reports, or provider-generated edits against protected paths.',
          evidence: input.targetPath,
        }),
      );
    }

    return {
      allowed: !findings.some(
        (finding) => finding.severity === 'error' || finding.severity === 'critical',
      ),
      normalizedTargetPath,
      absoluteTargetPath,
      findings,
    };
  }

  public async validateTargetWithFilesystem(
    input: ProtectedPathPolicyCheckInput,
  ): Promise<ProtectedPathPolicyResult> {
    const baseResult = this.validateTarget(input);

    if (!baseResult.allowed || !baseResult.absoluteTargetPath) {
      return baseResult;
    }

    const symlinkFindings = await this.findSymlinkFindings({
      input,
      normalizedTargetPath: baseResult.normalizedTargetPath,
      absoluteTargetPath: baseResult.absoluteTargetPath,
    });

    const findings = [...baseResult.findings, ...symlinkFindings];

    return {
      ...baseResult,
      allowed: !findings.some(
        (finding) => finding.severity === 'error' || finding.severity === 'critical',
      ),
      findings,
    };
  }

  public isProtectedTarget(targetPath: string): boolean {
    const normalized = this.normalizeTargetPath(targetPath);
    const comparable = this.normalizeForComparison(normalized);
    const segments = comparable.split('/').filter((segment) => segment.length > 0);
    const baseName = segments.at(-1) ?? comparable;

    if (this.protectedFileNames.includes(baseName)) {
      return true;
    }

    if (!this.allowRuntimeDirectory && segments.includes('.runtime')) {
      return true;
    }

    if (segments.includes('.runtime') && runtimeProtectedFileNames.includes(baseName)) {
      return true;
    }

    return this.protectedPathFragments.some((fragment) => {
      return (
        comparable === fragment ||
        comparable.startsWith(`${fragment}/`) ||
        segments.includes(fragment)
      );
    });
  }

  public normalizeTargetPath(targetPath: string): string {
    return targetPath
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }

  private async findSymlinkFindings(input: {
    input: ProtectedPathPolicyCheckInput;
    normalizedTargetPath: string;
    absoluteTargetPath: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const projectRootRealPath = await realpath(input.input.projectRoot);
    const targetSegments = input.normalizedTargetPath
      .split('/')
      .filter((segment) => segment.length > 0);

    let currentPath = input.input.projectRoot;

    for (const segment of targetSegments) {
      currentPath = path.join(currentPath, segment);

      const stat = await this.tryLstat(currentPath);

      if (!stat) {
        break;
      }

      if (stat.isSymbolicLink()) {
        findings.push(
          this.createFinding(input.input, {
            code: 'PROTECTED_PATH_SYMLINK_BLOCKED',
            severity: 'critical',
            message: `Symlink traversal is not allowed: ${input.normalizedTargetPath}`,
            recommendation:
              'Block symlinked targets and symlinked parent directories before filesystem writes, patch application, or report generation.',
            evidence: input.normalizedTargetPath,
          }),
        );

        break;
      }
    }

    const targetRealPath = await this.tryRealpath(input.absoluteTargetPath);

    if (targetRealPath && !this.isInsideRoot(projectRootRealPath, targetRealPath)) {
      findings.push(
        this.createFinding(input.input, {
          code: 'PROTECTED_PATH_REALPATH_ESCAPE_BLOCKED',
          severity: 'critical',
          message: `Resolved real path escapes project root: ${input.normalizedTargetPath}`,
          recommendation:
            'Block targets whose filesystem realpath resolves outside the approved project root.',
          evidence: input.normalizedTargetPath,
        }),
      );
    }

    return findings;
  }

  private resolveInsideProjectRoot(input: {
    projectRoot: string;
    normalizedTargetPath: string;
  }): string | undefined {
    const absoluteProjectRoot = path.resolve(input.projectRoot);
    const absoluteTargetPath = path.resolve(absoluteProjectRoot, input.normalizedTargetPath);

    if (!this.isInsideRoot(absoluteProjectRoot, absoluteTargetPath)) {
      return undefined;
    }

    return absoluteTargetPath;
  }

  private isInsideRoot(rootPath: string, targetPath: string): boolean {
    const relativePath = path.relative(rootPath, targetPath);

    return (
      relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
    );
  }

  private hasTraversalSegment(targetPath: string): boolean {
    return targetPath.split('/').some((segment) => segment === '..');
  }

  private isAbsolutePath(targetPath: string): boolean {
    return path.isAbsolute(targetPath) || /^[A-Za-z]:\//.test(targetPath.replaceAll('\\', '/'));
  }

  private containsNullByte(targetPath: string): boolean {
    return targetPath.includes('\0');
  }

  private normalizeForComparison(value: string): string {
    return this.normalizeTargetPath(value).toLowerCase();
  }

  private async tryLstat(
    targetPath: string,
  ): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
    try {
      return await lstat(targetPath);
    } catch {
      return undefined;
    }
  }

  private async tryRealpath(targetPath: string): Promise<string | undefined> {
    try {
      return await realpath(targetPath);
    } catch {
      return undefined;
    }
  }

  private createFinding(
    input: ProtectedPathPolicyCheckInput,
    issue: PathIssueInput,
  ): SecurityFinding {
    const category: SecurityFindingCategory = 'sensitive_path';

    return {
      id: `${issue.code}:${input.source ?? input.operation}:${input.targetPath}`,
      code: issue.code,
      category,
      severity: issue.severity,
      message: issue.message,
      location: {
        filePath: input.targetPath,
        source: input.source,
      },
      evidence: issue.evidence,
      recommendation: issue.recommendation,
      metadata: {
        operation: input.operation,
        projectRoot: input.projectRoot,
      },
    };
  }
}
