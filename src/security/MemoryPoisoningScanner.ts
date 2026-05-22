import type { SecurityFinding, SecuritySeverity } from './SecurityReviewTypes.js';

export interface MemoryPoisoningScannerOptions {
  // Backward-compatible placeholders.
  // The scanner is intentionally self-contained now, but older callers may still inject these.
  secretLeakDetector?: unknown;
  promptInjectionScanner?: unknown;
}

export interface MemoryPoisoningScanInput {
  source: string;
  title?: string | undefined;
  content: string;
}

export interface MemoryPoisoningSanitizeInput {
  source: string;
  content: string;
}

export interface MemoryPoisoningScanResult {
  safe: boolean;
  findings: SecurityFinding[];
  sanitizedContent: string;
}

interface MemoryPoisoningPattern {
  code: string;
  severity: SecuritySeverity;
  pattern: RegExp;
  message: string;
  recommendation: string;
}

const memoryPoisoningPatterns: MemoryPoisoningPattern[] = [
  {
    code: 'MEMORY_POISONING_IGNORE_RUNTIME_AUTHORITY',
    severity: 'critical',
    pattern:
      /\b(ignore|bypass|disable|skip|override)\b.{0,80}\b(runtime|validation|guardrails?|approval|schema|safety|policy)\b/iu,
    message: 'Memory contains an instruction to bypass runtime authority or validation.',
    recommendation:
      'Quarantine or reject this memory. Runtime validation, safety checks, and approval gates must remain authoritative.',
  },
  {
    code: 'MEMORY_POISONING_TRUST_PROVIDER_OUTPUT',
    severity: 'critical',
    pattern:
      /\b(trust|accept|execute|apply)\b.{0,80}\b(provider|llm|model|ai)\b.{0,80}\b(output|response|instructions?|json|patch)\b/iu,
    message: 'Memory attempts to make provider output authoritative.',
    recommendation:
      'Reject or quarantine this memory. Provider output must remain untrusted until runtime validation passes.',
  },
  {
    code: 'MEMORY_POISONING_SECRET_EXFILTRATION',
    severity: 'critical',
    pattern:
      /\b(read|print|show|send|exfiltrate|leak|dump|expose)\b.{0,80}\b(\.env|api[_-]?key|token|secret|credential|private[_-]?key)\b/iu,
    message: 'Memory contains an instruction to expose or exfiltrate secrets.',
    recommendation: 'Reject or quarantine this memory and preserve secret redaction.',
  },
  {
    code: 'MEMORY_POISONING_DANGEROUS_PERMISSION_RULE',
    severity: 'error',
    pattern:
      /\b(always|automatically|without asking|without approval)\b.{0,100}\b(apply|write|delete|execute|run|modify|commit|push)\b/iu,
    message: 'Memory attempts to create a dangerous standing permission rule.',
    recommendation:
      'Reject or quarantine dangerous standing permissions. Write/apply actions must remain approval-gated.',
  },
  {
    code: 'MEMORY_POISONING_TOOL_MISUSE',
    severity: 'error',
    pattern:
      /\b(run|execute|call)\b.{0,80}\b(shell|bash|powershell|cmd|curl|wget|rm -rf|del \/s|format)\b/iu,
    message: 'Memory contains a potentially dangerous tool-use instruction.',
    recommendation:
      'Reject or quarantine tool-use instructions stored as memory. Tools must be requested through controlled runtime actions.',
  },
  {
    code: 'MEMORY_POISONING_RETRIEVAL_AUTHORITY_CLAIM',
    severity: 'warning',
    pattern:
      /\b(memory|retrieved context|context|knowledge)\b.{0,80}\b(overrides|has priority over|is more important than)\b.{0,80}\b(system|runtime|policy|approval)\b/iu,
    message: 'Memory attempts to give retrieved context higher authority than runtime policy.',
    recommendation:
      'Treat memory as non-authoritative context only. Runtime policy must remain the authority.',
  },
];

export class MemoryPoisoningScanner {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public constructor(_options: MemoryPoisoningScannerOptions = {}) {
    // Options are accepted for backward compatibility with older security regression wiring.
  }

  public scan(input: MemoryPoisoningScanInput): MemoryPoisoningScanResult {
    return this.scanMemory(input);
  }

  public scanMemory(input: MemoryPoisoningScanInput): MemoryPoisoningScanResult {
    const content = [input.title ?? '', input.content].join('\n');
    const findings = this.scanContent({
      source: input.source,
      content,
    });

    return {
      safe: !findings.some((finding) => {
        return finding.severity === 'error' || finding.severity === 'critical';
      }),
      findings,
      sanitizedContent: this.redactPoisonedLines(input.content, findings),
    };
  }

  public sanitizeForContext(input: MemoryPoisoningSanitizeInput): string {
    const findings = this.scanContent({
      source: input.source,
      content: input.content,
    });

    const sanitized = this.redactPoisonedLines(input.content, findings);

    if (findings.length === 0) {
      return sanitized;
    }

    return [
      sanitized,
      '',
      '<memory-poisoning-scan>',
      `source: ${input.source}`,
      `findings: ${String(findings.length)}`,
      ...findings.map((finding) => {
        return `- [${finding.severity}] ${finding.code}: ${finding.message}`;
      }),
      '</memory-poisoning-scan>',
    ].join('\n');
  }

  private scanContent(input: { source: string; content: string }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (const item of memoryPoisoningPatterns) {
      const match = item.pattern.exec(input.content);

      if (!match) {
        continue;
      }

      findings.push({
        id: `${item.code}_${String(findings.length + 1)}`,
        code: item.code,
        category: 'memory_poisoning',
        severity: item.severity,
        message: item.message,
        location: {
          source: input.source,
        },
        evidence: this.truncateEvidence(match[0]),
        recommendation: item.recommendation,
        metadata: {
          source: input.source,
        },
      });
    }

    return findings;
  }

  private redactPoisonedLines(content: string, findings: readonly SecurityFinding[]): string {
    if (findings.length === 0) {
      return content;
    }

    const poisonedEvidence = findings
      .map((finding) => finding.evidence?.trim().toLowerCase())
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    return content
      .split('\n')
      .map((line) => {
        const lowered = line.toLowerCase();

        if (poisonedEvidence.some((evidence) => lowered.includes(evidence))) {
          return '[MEMORY_POISONING_REDACTED]';
        }

        if (
          memoryPoisoningPatterns.some((item) => {
            return item.pattern.test(line);
          })
        ) {
          return '[MEMORY_POISONING_REDACTED]';
        }

        return line;
      })
      .join('\n');
  }

  private truncateEvidence(value: string): string {
    const compact = value.replace(/\s+/g, ' ').trim();

    if (compact.length <= 180) {
      return compact;
    }

    return `${compact.slice(0, 177)}...`;
  }
}
