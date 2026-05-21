import { normalize } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import { MemoryPoisoningScanner } from '../security/MemoryPoisoningScanner.js';
import type { SecurityFinding } from '../security/SecurityReviewTypes.js';
import type { JsonObject, JsonValue } from '../types/SharedTypes.js';
import type { ProjectMemoryTrustLevel } from './ProjectMemoryTypes.js';

export interface ProjectMemorySanitizerOptions {
  redactor?: SensitiveDataRedactor | undefined;
  memoryPoisoningScanner?: MemoryPoisoningScanner | undefined;
  blockedPathFragments?: string[] | undefined;
  blockedContentFragments?: string[] | undefined;
}

export interface ProjectMemorySafetyInput {
  title: string;
  content: string;
  source?: string | undefined;
  trustLevel?: ProjectMemoryTrustLevel | undefined;
}

export interface ProjectMemorySafetyEvaluation {
  safe: boolean;
  title: string;
  content: string;
  trustLevel: ProjectMemoryTrustLevel;
  findings: SecurityFinding[];
  metadata: JsonObject | undefined;
}

const defaultBlockedPathFragments = [
  '.env',
  '.npmrc',
  '.pypirc',
  '.netrc',
  'id_rsa',
  'id_ed25519',
  'private-key',
  'private_key',
  'secrets',
];

const defaultBlockedContentFragments = [
  'raw provider response',
  'raw_provider_response',
  'provider raw response',
];

export class ProjectMemorySanitizer {
  private readonly redactor: SensitiveDataRedactor;
  private readonly memoryPoisoningScanner: MemoryPoisoningScanner;
  private readonly blockedPathFragments: readonly string[];
  private readonly blockedContentFragments: readonly string[];

  public constructor(options: ProjectMemorySanitizerOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
    this.memoryPoisoningScanner = options.memoryPoisoningScanner ?? new MemoryPoisoningScanner();
    this.blockedPathFragments = options.blockedPathFragments ?? defaultBlockedPathFragments;
    this.blockedContentFragments =
      options.blockedContentFragments ?? defaultBlockedContentFragments;
  }

  public assertSafeMemoryInput(input: ProjectMemorySafetyInput): void {
    const evaluation = this.evaluateMemoryInput(input);

    if (!evaluation.safe) {
      throw new Error(this.formatMemoryPoisoningError(evaluation.findings));
    }
  }

  public evaluateMemoryInput(input: ProjectMemorySafetyInput): ProjectMemorySafetyEvaluation {
    if (!input.title.trim()) {
      throw new Error('Project memory title must be non-empty.');
    }

    if (!input.content.trim()) {
      throw new Error('Project memory content must be non-empty.');
    }

    if (input.source) {
      this.assertSafePath(input.source);
    }

    const lowered = `${input.title}\n${input.content}`.toLowerCase();

    if (this.blockedContentFragments.some((fragment) => lowered.includes(fragment))) {
      throw new Error('Project memory must not store raw provider responses.');
    }

    const title = this.sanitizeText(input.title);
    const content = this.sanitizeText(input.content);
    const requestedTrustLevel = input.trustLevel ?? 'runtime-generated';

    const poisoningScan = this.memoryPoisoningScanner.scanMemory({
      source: input.source ?? 'project-memory',
      title,
      content,
    });

    const hasBlockingFinding = poisoningScan.findings.some((finding) => {
      return finding.severity === 'critical' || finding.severity === 'error';
    });

    if (!hasBlockingFinding) {
      return {
        safe: true,
        title,
        content,
        trustLevel: requestedTrustLevel,
        findings: poisoningScan.findings,
        metadata: this.createPoisoningMetadata(poisoningScan.findings),
      };
    }

    if (requestedTrustLevel === 'provider-suggested' || requestedTrustLevel === 'quarantined') {
      return {
        safe: true,
        title,
        content: poisoningScan.sanitizedContent,
        trustLevel: 'quarantined',
        findings: poisoningScan.findings,
        metadata: this.createPoisoningMetadata(poisoningScan.findings),
      };
    }

    return {
      safe: false,
      title,
      content,
      trustLevel: requestedTrustLevel,
      findings: poisoningScan.findings,
      metadata: this.createPoisoningMetadata(poisoningScan.findings),
    };
  }

  public assertSafePath(path: string): void {
    if (this.isBlockedPath(path)) {
      throw new Error(`Project memory refuses to store sensitive path: ${path}`);
    }
  }

  public isBlockedPath(path: string): boolean {
    const normalized = this.normalizePathForComparison(path);

    return this.blockedPathFragments.some((fragment) => {
      return normalized.includes(fragment.toLowerCase());
    });
  }

  public normalizeRelativePath(path: string): string {
    return normalize(path).replaceAll('\\', '/');
  }

  public sanitizeText(value: string): string {
    const redacted = this.redactor.redact(value);

    if (typeof redacted === 'string') {
      return redacted.trim();
    }

    return JSON.stringify(redacted);
  }

  public sanitizeMetadata(value: JsonObject | undefined): JsonObject | undefined {
    if (!value) {
      return undefined;
    }

    return this.redactor.redactObject(value);
  }

  public mergeMetadata(
    left: JsonObject | undefined,
    right: JsonObject | undefined,
  ): JsonObject | undefined {
    const sanitizedLeft = this.sanitizeMetadata(left);
    const sanitizedRight = this.sanitizeMetadata(right);

    if (!sanitizedLeft && !sanitizedRight) {
      return undefined;
    }

    return {
      ...(sanitizedLeft ?? {}),
      ...(sanitizedRight ?? {}),
    };
  }

  public normalizeTags(tags: readonly string[] | undefined): string[] {
    return [
      ...new Set(
        (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0),
      ),
    ];
  }

  public readJsonObject(value: unknown): JsonObject | undefined {
    if (!this.isJsonObject(value)) {
      return undefined;
    }

    return value;
  }

  private createPoisoningMetadata(findings: readonly SecurityFinding[]): JsonObject | undefined {
    if (findings.length === 0) {
      return undefined;
    }

    return {
      memoryPoisoningScan: {
        findingCount: findings.length,
        findings: findings.map((finding): JsonObject => {
          const item: JsonObject = {
            code: finding.code,
            severity: finding.severity,
            category: finding.category,
            message: finding.message,
            recommendation: finding.recommendation,
          };

          if (finding.evidence) {
            item['evidence'] = finding.evidence;
          }

          return item;
        }),
      },
    };
  }

  private formatMemoryPoisoningError(findings: readonly SecurityFinding[]): string {
    const blocking = findings.filter((finding) => {
      return finding.severity === 'critical' || finding.severity === 'error';
    });

    if (blocking.length === 0) {
      return 'Project memory poisoning scan failed.';
    }

    return `Project memory poisoning blocked: ${blocking
      .map((finding) => `${finding.code}: ${finding.message}`)
      .join('; ')}`;
  }

  private normalizePathForComparison(path: string): string {
    return normalize(path).replaceAll('\\', '/').toLowerCase();
  }

  private isJsonObject(value: unknown): value is JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isJsonValue(item));
  }

  private isJsonValue(value: unknown): value is JsonValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isJsonValue(item));
    }

    return this.isJsonObject(value);
  }
}
