import { normalize } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type { JsonObject, JsonValue } from '../types/SharedTypes.js';

export interface ProjectMemorySanitizerOptions {
  redactor?: SensitiveDataRedactor | undefined;
  blockedPathFragments?: string[] | undefined;
  blockedContentFragments?: string[] | undefined;
}

export interface ProjectMemorySafetyInput {
  title: string;
  content: string;
  source?: string | undefined;
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
  private readonly blockedPathFragments: readonly string[];
  private readonly blockedContentFragments: readonly string[];

  public constructor(options: ProjectMemorySanitizerOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
    this.blockedPathFragments = options.blockedPathFragments ?? defaultBlockedPathFragments;
    this.blockedContentFragments =
      options.blockedContentFragments ?? defaultBlockedContentFragments;
  }

  public assertSafeMemoryInput(input: ProjectMemorySafetyInput): void {
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
