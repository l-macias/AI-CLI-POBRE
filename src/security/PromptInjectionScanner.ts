import { SecretLeakDetector } from './SecretLeakDetector.js';
import type {
  SecurityFinding,
  SecurityFindingCategory,
  SecuritySeverity,
} from './SecurityReviewTypes.js';

export interface PromptInjectionScannerOptions {
  secretLeakDetector?: SecretLeakDetector | undefined;
  maxEvidenceLength?: number | undefined;
}

export interface PromptInjectionScanInput {
  content: string;
  source?: string | undefined;
  filePath?: string | undefined;
}

export interface PromptInjectionScanResult {
  safe: boolean;
  findings: SecurityFinding[];
  redactedContent: string;
}

interface ThreatPatternDefinition {
  code: string;
  category: SecurityFindingCategory;
  severity: SecuritySeverity;
  pattern: RegExp;
  message: string;
  recommendation: string;
}

interface MatchPosition {
  line: number;
  column: number;
}

const threatPatterns: readonly ThreatPatternDefinition[] = [
  {
    code: 'PROMPT_INJECTION_IGNORE_INSTRUCTIONS',
    category: 'prompt_injection',
    severity: 'error',
    pattern:
      /\b(ignore|disregard|forget|override)\b[\s\S]{0,80}\b(previous|prior|above|system|developer|runtime)\b[\s\S]{0,80}\b(instructions?|rules?|constraints?|policy|policies)\b/gi,
    message:
      'Provider output appears to instruct the runtime/model to ignore higher-priority instructions.',
    recommendation:
      'Treat provider output as untrusted content. Do not let it alter runtime policy, approval gates, or validation rules.',
  },
  {
    code: 'PROMPT_INJECTION_RUNTIME_BYPASS',
    category: 'prompt_injection',
    severity: 'critical',
    pattern:
      /\b(bypass|skip|disable|turn off|ignore)\b[\s\S]{0,80}\b(runtime|validation|validator|schema|guardrail|safety|security|policy|approval)\b/gi,
    message:
      'Provider output attempts to bypass runtime validation, safety, schema, or approval controls.',
    recommendation:
      'Block or quarantine this output before parsing/applying proposals. Runtime authority must remain non-negotiable.',
  },
  {
    code: 'PROMPT_INJECTION_APPROVAL_BYPASS',
    category: 'approval_bypass',
    severity: 'critical',
    pattern:
      /\b(auto[-\s]?approve|approve automatically|approval not required|without approval|no approval needed|mark as approved|fake approval|spoof approval|bypass approval|skip approval|disable approval|ignore approval|approval bypass)\b/gi,
    message: 'Provider output attempts to bypass or spoof approval.',
    recommendation:
      'Never derive approval from provider output. Approval must come only from explicit user/runtime approval state.',
  },
  {
    code: 'PROMPT_INJECTION_DIRECT_WRITE',
    category: 'tool_misuse',
    severity: 'critical',
    pattern:
      /\b(write|modify|overwrite|delete|remove|patch|edit)\b[\s\S]{0,80}\b(directly|immediately|without preview|without diff|without validation|without asking)\b/gi,
    message: 'Provider output attempts to trigger direct file modification without runtime gates.',
    recommendation:
      'Require schema validation, diff preview, safety validation, approval gate, and final filesystem policy before writes.',
  },
  {
    code: 'PROMPT_INJECTION_SECRET_EXFILTRATION',
    category: 'runtime_report_leak',
    severity: 'critical',
    pattern:
      /\b(read|print|show|dump|exfiltrate|send|upload|include|leak)\b[\s\S]{0,100}\b(\.env|api[_-]?key|token|secret|password|private[_-]?key|credential|authorization)\b/gi,
    message: 'Provider output requests access to or disclosure of secrets.',
    recommendation:
      'Block secret disclosure requests. Secrets must not appear in prompts, memory, reports, logs, diffs, or provider outputs.',
  },
  {
    code: 'PROMPT_INJECTION_SHELL_EXFILTRATION',
    category: 'tool_misuse',
    severity: 'critical',
    pattern:
      /\b(curl|wget|Invoke-WebRequest|iwr|powershell|nc|netcat|scp|ftp)\b[\s\S]{0,120}\b(\.env|token|secret|api[_-]?key|password|private[_-]?key|credential|authorization|http:\/\/|https:\/\/)\b/gi,
    message: 'Provider output suggests command/network-based exfiltration.',
    recommendation:
      'Do not execute provider-suggested network or shell exfiltration commands. Runtime-owned shell policy must decide.',
  },
  {
    code: 'PROMPT_INJECTION_MEMORY_TAMPERING',
    category: 'memory_poisoning',
    severity: 'error',
    pattern:
      /\b(modify|overwrite|delete|poison|tamper|inject|hide in)\b[\s\S]{0,100}\b(project-memory\.json|memory|known files|decision log|architecture facts)\b/gi,
    message: 'Provider output attempts to tamper with project memory.',
    recommendation:
      'Treat memory as sanitized contextual data only. Do not let provider output rewrite memory outside approved memory APIs.',
  },
  {
    code: 'PROMPT_INJECTION_AGENT_STATE_TAMPERING',
    category: 'agent_loop_abuse',
    severity: 'critical',
    pattern:
      /\b(modify|overwrite|delete|tamper|spoof|inject|mark)\b[\s\S]{0,100}\b(agent-loop-state\.json|state\.json|approval state|metadata|lastExecution|execution_apply_patch)\b/gi,
    message: 'Provider output attempts to tamper with agent loop state or approval metadata.',
    recommendation:
      'Agent state must be runtime-owned and schema-controlled. Do not allow provider output to mutate state directly.',
  },
  {
    code: 'PROMPT_INJECTION_HIDE_CHANGES',
    category: 'prompt_injection',
    severity: 'error',
    pattern:
      /\b(hide|conceal|omit|do not mention|don't mention|silently|quietly)\b[\s\S]{0,100}\b(change|patch|diff|modification|deletion|secret|error|failure)\b/gi,
    message: 'Provider output suggests hiding changes, failures, or risky behavior from the user.',
    recommendation:
      'All runtime actions must remain auditable. Reports and diff previews must not be suppressed by provider output.',
  },
  {
    code: 'PROMPT_INJECTION_ENCODED_PAYLOAD',
    category: 'prompt_injection',
    severity: 'warning',
    pattern:
      /\b(base64|hex|rot13|encoded payload|obfuscated|eval\(|atob\(|fromCharCode|Buffer\.from)\b/gi,
    message: 'Provider output contains possible obfuscation or encoded payload instructions.',
    recommendation:
      'Review encoded or obfuscated payloads before parsing or execution. Do not execute hidden payloads.',
  },
];

export class PromptInjectionScanner {
  private readonly secretLeakDetector: SecretLeakDetector;
  private readonly maxEvidenceLength: number;

  public constructor(options: PromptInjectionScannerOptions = {}) {
    this.secretLeakDetector = options.secretLeakDetector ?? new SecretLeakDetector();
    this.maxEvidenceLength = options.maxEvidenceLength ?? 180;
  }

  public scanProviderOutput(input: PromptInjectionScanInput): PromptInjectionScanResult {
    const findings: SecurityFinding[] = [];

    for (const definition of threatPatterns) {
      findings.push(...this.scanPattern(input, definition));
    }

    const secretScan = this.secretLeakDetector.scanText({
      content: input.content,
      filePath: input.filePath,
      source: input.source ?? 'provider-output',
    });

    findings.push(...secretScan.findings);

    return {
      safe: !findings.some((finding) => {
        return finding.severity === 'error' || finding.severity === 'critical';
      }),
      findings,
      redactedContent: secretScan.redactedContent,
    };
  }

  public hasBlockingThreat(input: PromptInjectionScanInput): boolean {
    return !this.scanProviderOutput(input).safe;
  }

  private scanPattern(
    input: PromptInjectionScanInput,
    definition: ThreatPatternDefinition,
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const pattern = new RegExp(definition.pattern.source, definition.pattern.flags);

    for (const match of input.content.matchAll(pattern)) {
      findings.push(
        this.createFinding({
          input,
          definition,
          evidence: match[0],
          index: match.index ?? 0,
        }),
      );
    }

    return findings;
  }

  private createFinding(input: {
    input: PromptInjectionScanInput;
    definition: ThreatPatternDefinition;
    evidence: string;
    index: number;
  }): SecurityFinding {
    const position = this.getLineAndColumn(input.input.content, input.index);

    return {
      id: `${input.definition.code}:${input.input.source ?? 'provider-output'}:${String(position.line)}:${String(position.column)}`,
      code: input.definition.code,
      category: input.definition.category,
      severity: input.definition.severity,
      message: input.definition.message,
      location: {
        filePath: input.input.filePath,
        source: input.input.source,
        line: position.line,
        column: position.column,
      },
      evidence: this.redactEvidence(input.evidence),
      recommendation: input.definition.recommendation,
    };
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
    const redacted = this.secretLeakDetector.redactText(value).replace(/\s+/g, ' ').trim();

    if (redacted.length <= this.maxEvidenceLength) {
      return redacted;
    }

    return `${redacted.slice(0, this.maxEvidenceLength)}…`;
  }
}
