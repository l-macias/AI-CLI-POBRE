import { normalize } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type {
  SecretLeakDetectorOptions,
  SecretLeakScanInput,
  SecretLeakScanResult,
  SecurityFinding,
  SecurityFindingLocation,
  SecuritySeverity,
} from './SecurityReviewTypes.js';

interface SecretPatternDefinition {
  code: string;
  label: string;
  pattern: RegExp;
  severity: SecuritySeverity;
  recommendation: string;
}

interface MatchPosition {
  line: number;
  column: number;
}

const defaultSensitivePathFragments = [
  '.env',
  '.env.local',
  '.env.production',
  '.npmrc',
  '.pypirc',
  '.netrc',
  'id_rsa',
  'id_ed25519',
  'private-key',
  'private_key',
  'secrets',
  'credentials',
];

const defaultSecretKeyFragments = [
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'client_secret',
  'credential',
  'password',
  'private_key',
  'secret',
  'access_token',
  'refresh_token',
  'id_token',
  'token',
];

const secretPatterns: readonly SecretPatternDefinition[] = [
  {
    code: 'SECRET_OPENROUTER_API_KEY',
    label: 'OpenRouter API key',
    pattern: /\bsk-or-v1-[A-Za-z0-9_-]{12,}\b/g,
    severity: 'critical',
    recommendation:
      'Remove the provider API key from the content and load it only from runtime-approved environment configuration.',
  },
  {
    code: 'SECRET_GENERIC_SK_KEY',
    label: 'generic sk-* API key',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    severity: 'critical',
    recommendation: 'Remove the API key from the content and rotate it if it was exposed.',
  },
  {
    code: 'SECRET_BEARER_TOKEN',
    label: 'Bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/g,
    severity: 'critical',
    recommendation:
      'Remove the bearer token from logs, reports, memory, prompts, and provider outputs.',
  },
  {
    code: 'SECRET_PRIVATE_KEY_BLOCK',
    label: 'private key block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    severity: 'critical',
    recommendation:
      'Never store private keys in runtime reports, project memory, provider prompts, or generated patches.',
  },
  {
    code: 'SECRET_ENV_ASSIGNMENT',
    label: 'sensitive environment assignment',
    pattern:
      /\b(?:OPENROUTER_API_KEY|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|ID_TOKEN|TOKEN|PASSWORD|SECRET|CLIENT_SECRET|PRIVATE_KEY)\s*=\s*[^\s"'`]+/gi,
    severity: 'critical',
    recommendation:
      'Remove sensitive environment assignments and keep secrets in unlogged environment variables only.',
  },
  {
    code: 'SECRET_JSON_FIELD',
    label: 'sensitive JSON-like field',
    pattern:
      /["']?(?:apiKey|api_key|accessToken|access_token|refreshToken|refresh_token|clientSecret|client_secret|password|secret|privateKey|private_key|authorization|token)["']?\s*[:=]\s*["'][^"']{8,}["']/g,
    severity: 'error',
    recommendation:
      'Redact sensitive object fields before writing reports, memory entries, errors, or logs.',
  },
  {
    code: 'SECRET_CREDENTIAL_URL',
    label: 'credential-bearing URL',
    pattern: /\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@[^/\s]+/g,
    severity: 'error',
    recommendation:
      'Remove credentials embedded in URLs and use runtime-managed secret injection instead.',
  },
];

export class SecretLeakDetector {
  private readonly redactor: SensitiveDataRedactor;
  private readonly redactedValue: string;
  private readonly maxEvidenceLength: number;
  private readonly sensitivePathFragments: readonly string[];
  private readonly secretKeyFragments: readonly string[];

  public constructor(options: SecretLeakDetectorOptions = {}) {
    this.redactedValue = options.redactedValue ?? '[REDACTED]';
    this.maxEvidenceLength = options.maxEvidenceLength ?? 160;
    this.sensitivePathFragments = [
      ...defaultSensitivePathFragments,
      ...(options.additionalSensitivePathFragments ?? []),
    ].map((fragment) => fragment.toLowerCase());
    this.secretKeyFragments = [
      ...defaultSecretKeyFragments,
      ...(options.additionalSecretKeyFragments ?? []),
    ].map((fragment) => fragment.toLowerCase());

    this.redactor = new SensitiveDataRedactor({
      redactedValue: this.redactedValue,
      additionalSensitiveKeys: [...this.secretKeyFragments],
    });
  }

  public scanText(input: SecretLeakScanInput): SecretLeakScanResult {
    const findings: SecurityFinding[] = [];

    if (input.filePath && this.isSensitivePath(input.filePath)) {
      findings.push(
        this.createFinding({
          index: 0,
          input,
          code: 'SENSITIVE_PATH_SCANNED',
          severity: 'critical',
          message: `Sensitive path should not be included in security-scanned runtime content: ${input.filePath}`,
          evidence: this.redactEvidence(input.filePath),
          recommendation:
            'Exclude sensitive paths such as .env, private keys, credentials, and secret files from runtime memory, reports, prompts, provider payloads, and patches.',
        }),
      );
    }

    for (const patternDefinition of secretPatterns) {
      findings.push(...this.scanPattern(input, patternDefinition));
    }

    findings.push(...this.scanSensitiveKeyMentions(input));

    const redactedContent = this.redactText(input.content);

    return {
      safe: findings.every(
        (finding) => finding.severity !== 'error' && finding.severity !== 'critical',
      ),
      findings,
      redactedContent,
    };
  }

  public redactText(content: string): string {
    const redacted = this.redactor.redact(content);

    if (typeof redacted === 'string') {
      return this.applyPatternRedactions(redacted);
    }

    return this.redactedValue;
  }

  public isSensitivePath(path: string): boolean {
    const normalized = normalize(path).replaceAll('\\', '/').toLowerCase();

    return this.sensitivePathFragments.some((fragment) => {
      return normalized.includes(fragment);
    });
  }

  private scanPattern(
    input: SecretLeakScanInput,
    definition: SecretPatternDefinition,
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const pattern = new RegExp(definition.pattern.source, definition.pattern.flags);

    for (const match of input.content.matchAll(pattern)) {
      const matchText = match[0];
      const index = match.index ?? 0;

      findings.push(
        this.createFinding({
          index,
          input,
          code: definition.code,
          severity: definition.severity,
          message: `Potential ${definition.label} detected.`,
          evidence: this.redactEvidence(matchText),
          recommendation: definition.recommendation,
        }),
      );
    }

    return findings;
  }

  private scanSensitiveKeyMentions(input: SecretLeakScanInput): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const linePattern = /^.*$/gm;

    for (const match of input.content.matchAll(linePattern)) {
      const line = match[0];
      const index = match.index ?? 0;
      const normalizedLine = line.toLowerCase();

      const hasSensitiveKey = this.secretKeyFragments.some((fragment) => {
        return normalizedLine.includes(fragment);
      });

      if (!hasSensitiveKey) {
        continue;
      }

      const hasAssignmentLikeValue = /[:=]\s*["']?[^"'\s]{8,}/.test(line);

      if (!hasAssignmentLikeValue) {
        continue;
      }

      findings.push(
        this.createFinding({
          index,
          input,
          code: 'SECRET_SENSITIVE_KEY_VALUE',
          severity: 'error',
          message: 'Potential sensitive key/value pair detected.',
          evidence: this.redactEvidence(line),
          recommendation:
            'Redact sensitive key/value pairs before writing runtime reports, memory entries, logs, provider prompts, or provider outputs.',
        }),
      );
    }

    return findings;
  }

  private applyPatternRedactions(content: string): string {
    return secretPatterns.reduce((current, definition) => {
      return current.replace(definition.pattern, this.redactedValue);
    }, content);
  }

  private createFinding(input: {
    index: number;
    input: SecretLeakScanInput;
    code: string;
    severity: SecuritySeverity;
    message: string;
    evidence: string;
    recommendation: string;
  }): SecurityFinding {
    const position = this.getLineAndColumn(input.input.content, input.index);
    const location = this.createLocation(input.input, position);

    return {
      id: this.createFindingId(input.code, location),
      code: input.code,
      category: 'secret_leak',
      severity: input.severity,
      message: input.message,
      location,
      evidence: input.evidence,
      recommendation: input.recommendation,
    };
  }

  private createLocation(
    input: SecretLeakScanInput,
    position: MatchPosition,
  ): SecurityFindingLocation {
    const location: SecurityFindingLocation = {
      line: position.line,
      column: position.column,
    };

    if (input.filePath) {
      location.filePath = input.filePath;
    }

    if (input.source) {
      location.source = input.source;
    }

    return location;
  }

  private createFindingId(code: string, location: SecurityFindingLocation): string {
    const source = location.filePath ?? location.source ?? 'unknown';
    const line = location.line ?? 0;
    const column = location.column ?? 0;

    return `${code}:${source}:${line}:${column}`;
  }

  private getLineAndColumn(content: string, index: number): MatchPosition {
    const beforeMatch = content.slice(0, index);
    const lines = beforeMatch.split('\n');
    const lastLine = lines.at(-1) ?? '';

    return {
      line: lines.length,
      column: lastLine.length + 1,
    };
  }

  private redactEvidence(value: string): string {
    const redacted = this.redactText(value);
    const singleLine = redacted.replace(/\s+/g, ' ').trim();

    if (singleLine.length <= this.maxEvidenceLength) {
      return singleLine;
    }

    return `${singleLine.slice(0, this.maxEvidenceLength)}…`;
  }
}
