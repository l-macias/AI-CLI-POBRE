import { PromptInjectionScanner } from './PromptInjectionScanner.js';
import { SecretLeakDetector } from './SecretLeakDetector.js';
import type { SecurityFinding } from './SecurityReviewTypes.js';

export interface MemoryPoisoningScannerOptions {
  promptInjectionScanner?: PromptInjectionScanner | undefined;
  secretLeakDetector?: SecretLeakDetector | undefined;
}

export interface MemoryPoisoningScanInput {
  content: string;
  source?: string | undefined;
}

export interface MemoryPoisoningScanResult {
  safe: boolean;
  findings: SecurityFinding[];
  redactedContent: string;
}

export class MemoryPoisoningScanner {
  private readonly promptInjectionScanner: PromptInjectionScanner;
  private readonly secretLeakDetector: SecretLeakDetector;

  public constructor(options: MemoryPoisoningScannerOptions = {}) {
    this.secretLeakDetector = options.secretLeakDetector ?? new SecretLeakDetector();
    this.promptInjectionScanner =
      options.promptInjectionScanner ??
      new PromptInjectionScanner({
        secretLeakDetector: this.secretLeakDetector,
      });
  }

  public scan(input: MemoryPoisoningScanInput): MemoryPoisoningScanResult {
    const promptScan = this.promptInjectionScanner.scanProviderOutput({
      content: input.content,
      source: input.source ?? 'project-memory',
    });

    const findings = promptScan.findings.map((finding) => {
      if (finding.category === 'secret_leak') {
        return finding;
      }

      return {
        ...finding,
        category: 'memory_poisoning' as const,
      };
    });

    return {
      safe: !findings.some((finding) => {
        return finding.severity === 'error' || finding.severity === 'critical';
      }),
      findings,
      redactedContent: promptScan.redactedContent,
    };
  }

  public sanitizeForContext(input: MemoryPoisoningScanInput): string {
    const scan = this.scan(input);

    if (scan.safe) {
      return scan.redactedContent;
    }

    const blockingCodes = scan.findings
      .filter((finding) => finding.severity === 'error' || finding.severity === 'critical')
      .map((finding) => finding.code);

    return [
      '[PROJECT_MEMORY_BLOCKED]',
      `Source: ${input.source ?? 'project-memory'}`,
      `Reasons: ${blockingCodes.join(', ') || 'unknown'}`,
    ].join('\n');
  }
}
