import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type { CliRepairProvider } from '../cli/CliTypes.js';
import {
  scaffoldIntentKinds,
  scaffoldModuleKinds,
  type ScaffoldIntent,
  type ScaffoldIntentInput,
  type ScaffoldIntentIssue,
  type ScaffoldIntentKind,
  type ScaffoldIntentParseResult,
  type ScaffoldModuleKind,
} from './ScaffoldTypes.js';

export interface ScaffoldIntentParserOptions {
  pathPolicy?: ProtectedPathPolicy | undefined;
  defaultProvider?: CliRepairProvider | undefined;
}

export class ScaffoldIntentParser {
  private readonly pathPolicy: ProtectedPathPolicy;
  private readonly defaultProvider: CliRepairProvider;

  public constructor(options: ScaffoldIntentParserOptions = {}) {
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
    this.defaultProvider = options.defaultProvider ?? 'fake-llm';
  }

  public parse(input: Partial<ScaffoldIntentInput>): ScaffoldIntentParseResult {
    const issues: ScaffoldIntentIssue[] = [];
    const createdAt = new Date().toISOString();

    const kind = this.readIntentKind(input.kind, issues);
    const moduleKind = this.readModuleKind(input.moduleKind, issues);
    const provider = this.readProvider(input.provider);
    const normalizedName = this.normalizeName(input.name ?? '');
    const normalizedTargetPath = this.normalizeTargetPath(input.targetPath ?? '');

    if (!input.name || input.name.trim().length === 0) {
      issues.push({
        code: 'SCAFFOLD_NAME_REQUIRED',
        message: 'Scaffold module name is required.',
        severity: 'error',
      });
    }

    if (input.name && normalizedName.length === 0) {
      issues.push({
        code: 'SCAFFOLD_NAME_INVALID',
        message: `Scaffold module name is invalid: ${input.name}`,
        severity: 'error',
      });
    }

    if (input.name && this.hasDangerousName(input.name)) {
      issues.push({
        code: 'SCAFFOLD_NAME_DANGEROUS',
        message: `Scaffold module name contains unsafe characters or traversal: ${input.name}`,
        severity: 'error',
      });
    }

    if (!input.targetPath || input.targetPath.trim().length === 0) {
      issues.push({
        code: 'SCAFFOLD_TARGET_REQUIRED',
        message: 'Scaffold target path is required.',
        severity: 'error',
      });
    }

    if (input.targetPath && normalizedTargetPath.length === 0) {
      issues.push({
        code: 'SCAFFOLD_TARGET_INVALID',
        message: `Scaffold target path is invalid: ${input.targetPath}`,
        severity: 'error',
      });
    }

    if (input.targetPath && this.hasNullByte(input.targetPath)) {
      issues.push({
        code: 'SCAFFOLD_TARGET_NULL_BYTE',
        message: 'Scaffold target path contains a null byte.',
        severity: 'error',
      });
    }

    if (input.targetPath) {
      const pathResult = this.pathPolicy.validateTarget({
        projectRoot: '/',
        targetPath: input.targetPath,
        operation: 'create',
        source: 'scaffold-intent-parser',
      });

      issues.push(
        ...pathResult.findings.map((finding): ScaffoldIntentIssue => {
          return {
            code: this.mapProtectedPathIssueCode(finding.code),
            message: finding.message,
            severity:
              finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
          };
        }),
      );
    }

    if (provider === 'openrouter' && input.allowRealProvider !== true) {
      issues.push({
        code: 'SCAFFOLD_REAL_PROVIDER_OPT_IN_REQUIRED',
        message:
          'Scaffold with OpenRouter requires allowRealProvider. Real providers must be explicitly enabled.',
        severity: 'error',
      });
    }

    if (
      provider === 'openrouter' &&
      (!input.providerModel || input.providerModel.trim().length === 0)
    ) {
      issues.push({
        code: 'SCAFFOLD_PROVIDER_MODEL_REQUIRED',
        message: 'Scaffold with OpenRouter requires providerModel.',
        severity: 'error',
      });
    }

    if (issues.some((issue) => issue.severity === 'error')) {
      return {
        ok: false,
        issues,
      };
    }

    const intent: ScaffoldIntent = {
      id: `scaffold-intent-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      kind,
      name: input.name?.trim() ?? normalizedName,
      normalizedName,
      moduleKind,
      targetPath: input.targetPath?.trim() ?? normalizedTargetPath,
      normalizedTargetPath,
      provider,
      providerModel: this.readOptionalString(input.providerModel),
      allowRealProvider: input.allowRealProvider === true,
      allowPremium: input.allowPremium === true,
      premiumApproved: input.premiumApproved === true,
      includeProjectMemory: input.includeProjectMemory === true,
      overwriteExisting: input.overwriteExisting === true,
      dryRun: input.dryRun === true,
      createdAt,
    };

    return {
      ok: true,
      intent,
      issues,
    };
  }

  private readIntentKind(
    value: ScaffoldIntentKind | undefined,
    issues: ScaffoldIntentIssue[],
  ): ScaffoldIntentKind {
    if (value && scaffoldIntentKinds.includes(value)) {
      return value;
    }

    if (value !== undefined) {
      issues.push({
        code: 'SCAFFOLD_KIND_INVALID',
        message: `Unsupported scaffold intent kind: ${String(value)}`,
        severity: 'error',
      });
    }

    return 'module';
  }

  private readModuleKind(
    value: ScaffoldModuleKind | undefined,
    issues: ScaffoldIntentIssue[],
  ): ScaffoldModuleKind {
    if (value && scaffoldModuleKinds.includes(value)) {
      return value;
    }

    if (value !== undefined) {
      issues.push({
        code: 'SCAFFOLD_MODULE_KIND_INVALID',
        message: `Unsupported scaffold module kind: ${String(value)}`,
        severity: 'error',
      });
    }

    return 'generic';
  }

  private readProvider(value: CliRepairProvider | undefined): CliRepairProvider {
    if (value === 'fake-llm' || value === 'static' || value === 'openrouter') {
      return value;
    }

    return this.defaultProvider;
  }

  private readOptionalString(value: string | undefined): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeName(value: string): string {
    return (
      value
        .trim()
        .replaceAll('\\', '/')
        .split('/')
        .at(-1)
        ?.toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-') ?? ''
    );
  }

  private normalizeTargetPath(value: string): string {
    return this.pathPolicy.normalizeTargetPath(value).replace(/\/+$/g, '');
  }

  private hasDangerousName(value: string): boolean {
    const normalized = value.trim().replaceAll('\\', '/');

    return (
      normalized.includes('..') ||
      normalized.includes('/') ||
      normalized.includes('\0') ||
      normalized.startsWith('.') ||
      normalized.toLowerCase() === 'node_modules' ||
      normalized.toLowerCase() === '.git'
    );
  }

  private hasNullByte(value: string): boolean {
    return value.includes('\0');
  }

  private mapProtectedPathIssueCode(code: string): string {
    if (code === 'PROTECTED_PATH_EMPTY_TARGET') {
      return 'SCAFFOLD_TARGET_EMPTY';
    }

    if (code === 'PROTECTED_PATH_NULL_BYTE') {
      return 'SCAFFOLD_TARGET_NULL_BYTE';
    }

    if (code === 'PROTECTED_PATH_ABSOLUTE_BLOCKED') {
      return 'SCAFFOLD_TARGET_ABSOLUTE_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_TRAVERSAL_BLOCKED') {
      return 'SCAFFOLD_TARGET_TRAVERSAL_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_ROOT_ESCAPE_BLOCKED') {
      return 'SCAFFOLD_TARGET_ROOT_ESCAPE_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_TARGET_BLOCKED') {
      return 'SCAFFOLD_TARGET_PROTECTED_PATH_BLOCKED';
    }

    return `SCAFFOLD_${code}`;
  }
}
