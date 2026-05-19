import type { JsonArray, JsonObject, JsonValue } from '../types/SharedTypes.js';
import type { SensitiveDataRedactorOptions } from '../types/ObservabilityTypes.js';

const defaultSensitiveKeyFragments = [
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'client_secret',
  'credential',
  'password',
  'private_key',
  'secret',
];

const defaultSensitiveExactKeys = [
  'env',
  '.env',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
];

const safeMetricKeys = [
  'prompttokens',
  'completiontokens',
  'totaltokens',
  'contexttokenestimate',
  'maxestimatedcontexttokens',
  'estimatedprompttokens',
  'estimatedcompletiontokens',
];

const sensitiveStringPatterns = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/g,
  /OPENROUTER_API_KEY\s*=\s*[^\s]+/gi,
  /API_KEY\s*=\s*[^\s]+/gi,
  /ACCESS_TOKEN\s*=\s*[^\s]+/gi,
  /REFRESH_TOKEN\s*=\s*[^\s]+/gi,
  /TOKEN\s*=\s*[^\s]+/gi,
  /PASSWORD\s*=\s*[^\s]+/gi,
  /SECRET\s*=\s*[^\s]+/gi,
];

export class SensitiveDataRedactor {
  private readonly maxDepth: number;
  private readonly redactedValue: string;
  private readonly sensitiveKeyFragments: readonly string[];
  private readonly sensitiveExactKeys: readonly string[];

  public constructor(options: SensitiveDataRedactorOptions = {}) {
    this.maxDepth = options.maxDepth ?? 8;
    this.redactedValue = options.redactedValue ?? '[REDACTED]';
    this.sensitiveKeyFragments = [
      ...defaultSensitiveKeyFragments,
      ...(options.additionalSensitiveKeys ?? []),
    ].map((key) => key.toLowerCase());
    this.sensitiveExactKeys = defaultSensitiveExactKeys;
  }

  public redact(value: unknown): JsonValue {
    return this.redactValue(value, 0, undefined);
  }

  public redactObject(value: unknown): JsonObject {
    const redacted = this.redact(value);

    if (this.isJsonObject(redacted)) {
      return redacted;
    }

    return {
      value: redacted,
    };
  }

  private redactValue(value: unknown, depth: number, key: string | undefined): JsonValue {
    if (key && this.isSensitiveKey(key)) {
      return this.redactedValue;
    }

    if (depth > this.maxDepth) {
      return '[MAX_DEPTH_REACHED]';
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'string') {
      return this.redactString(value);
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : String(value);
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: this.redactString(value.message),
      };
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return this.redactArray(value, depth);
    }

    if (typeof value === 'object') {
      return this.redactRecord(value as Record<string, unknown>, depth);
    }

    if (typeof value === 'undefined') {
      return null;
    }

    if (typeof value === 'function') {
      return '[FUNCTION]';
    }

    if (typeof value === 'symbol') {
      return value.toString();
    }

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(value);
  }

  private redactArray(values: readonly unknown[], depth: number): JsonArray {
    return values.map((item) => this.redactValue(item, depth + 1, undefined));
  }

  private redactRecord(record: Record<string, unknown>, depth: number): JsonObject {
    const output: JsonObject = {};

    for (const [key, value] of Object.entries(record)) {
      output[key] = this.redactValue(value, depth + 1, key);
    }

    return output;
  }

  private redactString(value: string): string {
    return sensitiveStringPatterns.reduce((current, pattern) => {
      return current.replace(pattern, this.redactedValue);
    }, value);
  }

  private isSensitiveKey(key: string): boolean {
    const normalized = key.toLowerCase();

    if (safeMetricKeys.includes(normalized)) {
      return false;
    }

    if (this.sensitiveExactKeys.includes(normalized)) {
      return true;
    }

    return this.sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
  }

  private isJsonObject(value: JsonValue): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
