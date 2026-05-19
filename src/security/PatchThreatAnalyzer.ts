import { PromptInjectionScanner } from './PromptInjectionScanner.js';
import { SecretLeakDetector } from './SecretLeakDetector.js';
import type {
  SecurityFinding,
  SecurityFindingCategory,
  SecuritySeverity,
} from './SecurityReviewTypes.js';
import type { PatchOperation, PatchProposal } from '../types/RepairTypes.js';

export interface PatchThreatAnalyzerOptions {
  secretLeakDetector?: SecretLeakDetector | undefined;
  promptInjectionScanner?: PromptInjectionScanner | undefined;
  maxEvidenceLength?: number | undefined;
  largePatchLineThreshold?: number | undefined;
  largePatchByteThreshold?: number | undefined;
}

export interface PatchThreatAnalyzerInput {
  proposal: PatchProposal;
  source?: string | undefined;
}

export interface PatchThreatAnalysisResult {
  safe: boolean;
  findings: SecurityFinding[];
}

interface PatchThreatPatternDefinition {
  code: string;
  category: SecurityFindingCategory;
  severity: SecuritySeverity;
  pattern: RegExp;
  message: string;
  recommendation: string;
}

interface PatchOperationThreatInput {
  proposal: PatchProposal;
  operation: PatchOperation;
  operationIndex: number;
  source: string;
}

interface MatchPosition {
  line: number;
  column: number;
}

const destructiveCommandPatterns: readonly PatchThreatPatternDefinition[] = [
  {
    code: 'PATCH_THREAT_DESTRUCTIVE_RM',
    category: 'patch_threat',
    severity: 'critical',
    pattern: /\brm\s+-(?:r|f|rf|fr)\b|\brimraf\b/gi,
    message: 'Patch content includes destructive remove command patterns.',
    recommendation:
      'Do not accept provider-generated destructive commands without explicit runtime-owned command policy and user approval.',
  },
  {
    code: 'PATCH_THREAT_FORCE_CLEAN',
    category: 'patch_threat',
    severity: 'critical',
    pattern: /\bgit\s+(?:reset\s+--hard|clean\s+-fd|clean\s+-xdf)\b/gi,
    message: 'Patch content includes destructive git cleanup/reset command patterns.',
    recommendation:
      'Block provider-generated destructive git operations. Git recovery must remain runtime-owned and approval-gated.',
  },
  {
    code: 'PATCH_THREAT_SHELL_CHAIN',
    category: 'patch_threat',
    severity: 'error',
    pattern:
      /\b(?:curl|wget|powershell|Invoke-WebRequest|iwr|nc|netcat)\b[\s\S]{0,120}\|\s*(?:sh|bash|powershell|node)\b/gi,
    message: 'Patch content includes network-to-shell execution pattern.',
    recommendation:
      'Reject patches that introduce network-fetched shell execution or equivalent command chains.',
  },
];

const exfiltrationPatterns: readonly PatchThreatPatternDefinition[] = [
  {
    code: 'PATCH_THREAT_ENV_READ',
    category: 'patch_threat',
    severity: 'error',
    pattern:
      /\b(?:readFileSync|readFile|cat|Get-Content|process\.env)\b[\s\S]{0,120}\b(?:\.env|OPENROUTER_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|AUTHORIZATION)\b/gi,
    message: 'Patch content appears to read secrets or environment credentials.',
    recommendation:
      'Reject patches that introduce secret-reading behavior unless explicitly designed and reviewed as a secure secret loader.',
  },
  {
    code: 'PATCH_THREAT_NETWORK_EXFILTRATION',
    category: 'patch_threat',
    severity: 'critical',
    pattern:
      /\b(?:fetch|axios|http\.request|https\.request|curl|wget)\b[\s\S]{0,180}\b(?:process\.env|\.env|token|secret|password|api[_-]?key|authorization|private[_-]?key)\b/gi,
    message: 'Patch content appears to send secrets or credentials over the network.',
    recommendation:
      'Block network exfiltration patterns. Provider-generated code must not transmit secrets or credentials.',
  },
];

const runtimeTamperingPatterns: readonly PatchThreatPatternDefinition[] = [
  {
    code: 'PATCH_THREAT_RUNTIME_STATE_TAMPERING',
    category: 'agent_loop_abuse',
    severity: 'critical',
    pattern:
      /\b(?:writeFile|writeFileSync|rm|unlink|rename|copyFile)\b[\s\S]{0,140}\b(?:agent-loop-state\.json|project-memory\.json|patch-apply-report\.json|state\.json|workspace-config\.json)\b/gi,
    message: 'Patch content appears to tamper with runtime-owned state or reports.',
    recommendation:
      'Runtime-owned state must only be modified through runtime APIs, never through provider-generated patch content.',
  },
  {
    code: 'PATCH_THREAT_APPROVAL_TAMPERING',
    category: 'approval_bypass',
    severity: 'critical',
    pattern:
      /\b(?:approved|approval|approvalId|applyConfirmed|confirmDelete)\b[\s\S]{0,120}\b(?:true|spoof|fake|force|bypass|skip)\b/gi,
    message: 'Patch content appears to tamper with approval state or approval semantics.',
    recommendation:
      'Provider-generated patches must not create or mutate approval state. Approval must be runtime/user-owned.',
  },
];

const packageScriptRiskPatterns: readonly PatchThreatPatternDefinition[] = [
  {
    code: 'PATCH_THREAT_PACKAGE_SCRIPT_INSTALL_HOOK',
    category: 'patch_threat',
    severity: 'error',
    pattern: /"(?:preinstall|install|postinstall|prepare)"\s*:\s*"[^"]+"/gi,
    message: 'Patch modifies package lifecycle scripts that can execute automatically.',
    recommendation:
      'Treat package lifecycle hooks as high risk and require explicit review before accepting them.',
  },
  {
    code: 'PATCH_THREAT_PACKAGE_SCRIPT_DANGEROUS_COMMAND',
    category: 'patch_threat',
    severity: 'critical',
    pattern:
      /"(?:scripts|preinstall|install|postinstall|prepare)"\s*:[\s\S]{0,500}\b(?:curl|wget|powershell|Invoke-WebRequest|rm\s+-rf|git\s+reset\s+--hard|git\s+clean\s+-xdf)\b/gi,
    message: 'Patch introduces dangerous command usage inside package scripts.',
    recommendation:
      'Reject provider-generated scripts that can execute destructive commands, network downloads, or shell chains.',
  },
];

const allContentPatterns = [
  ...destructiveCommandPatterns,
  ...exfiltrationPatterns,
  ...runtimeTamperingPatterns,
];

export class PatchThreatAnalyzer {
  private readonly secretLeakDetector: SecretLeakDetector;
  private readonly promptInjectionScanner: PromptInjectionScanner;
  private readonly maxEvidenceLength: number;
  private readonly largePatchLineThreshold: number;
  private readonly largePatchByteThreshold: number;

  public constructor(options: PatchThreatAnalyzerOptions = {}) {
    this.secretLeakDetector = options.secretLeakDetector ?? new SecretLeakDetector();
    this.promptInjectionScanner =
      options.promptInjectionScanner ??
      new PromptInjectionScanner({
        secretLeakDetector: this.secretLeakDetector,
      });
    this.maxEvidenceLength = options.maxEvidenceLength ?? 180;
    this.largePatchLineThreshold = options.largePatchLineThreshold ?? 500;
    this.largePatchByteThreshold = options.largePatchByteThreshold ?? 80_000;
  }

  public analyze(input: PatchThreatAnalyzerInput): PatchThreatAnalysisResult {
    const source = input.source ?? 'patch-threat-analyzer';
    const findings: SecurityFinding[] = [];

    findings.push(...this.analyzeProposalMetadata(input.proposal, source));

    input.proposal.operations.forEach((operation, operationIndex) => {
      findings.push(
        ...this.analyzeOperation({
          proposal: input.proposal,
          operation,
          operationIndex,
          source,
        }),
      );
    });

    return {
      safe: !findings.some((finding) => {
        return finding.severity === 'error' || finding.severity === 'critical';
      }),
      findings,
    };
  }

  private analyzeProposalMetadata(proposal: PatchProposal, source: string): SecurityFinding[] {
    const content = [proposal.summary, proposal.explanation].join('\n');
    const threatScan = this.promptInjectionScanner.scanProviderOutput({
      source,
      content,
    });

    return threatScan.findings.map((finding) => {
      return {
        ...finding,
        id: `PATCH_METADATA_${finding.id}`,
        category: finding.category === 'secret_leak' ? 'secret_leak' : 'patch_threat',
      };
    });
  }

  private analyzeOperation(input: PatchOperationThreatInput): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    findings.push(...this.analyzeOperationTextFields(input));

    if (input.operation.kind === 'delete_file') {
      findings.push(
        this.createFinding({
          source: input.source,
          proposal: input.proposal,
          operation: input.operation,
          operationIndex: input.operationIndex,
          code: 'PATCH_THREAT_DELETE_OPERATION',
          category: 'patch_threat',
          severity: input.proposal.riskLevel === 'high' ? 'warning' : 'error',
          message: `Patch contains delete operation: ${input.operation.targetFile}`,
          recommendation:
            'Delete operations should require explicit delete confirmation and high-risk review.',
          evidence: input.operation.targetFile,
        }),
      );
    }

    if (typeof input.operation.newContent === 'string') {
      findings.push(...this.analyzeNewContent(input));
    }

    return findings;
  }

  private analyzeOperationTextFields(input: PatchOperationThreatInput): SecurityFinding[] {
    const content = [
      input.operation.targetFile,
      input.operation.reason,
      input.operation.expectedCurrentContent ?? '',
    ].join('\n');

    const threatScan = this.promptInjectionScanner.scanProviderOutput({
      source: input.source,
      filePath: input.operation.targetFile,
      content,
    });

    return threatScan.findings.map((finding) => {
      return {
        ...finding,
        id: `PATCH_OPERATION_${String(input.operationIndex)}_${finding.id}`,
        category: finding.category === 'secret_leak' ? 'secret_leak' : 'patch_threat',
      };
    });
  }

  private analyzeNewContent(input: PatchOperationThreatInput): SecurityFinding[] {
    const newContent = input.operation.newContent ?? '';
    const findings: SecurityFinding[] = [];

    const secretScan = this.secretLeakDetector.scanText({
      content: newContent,
      filePath: input.operation.targetFile,
      source: input.source,
    });

    findings.push(
      ...secretScan.findings.map((finding) => {
        return {
          ...finding,
          id: `PATCH_CONTENT_${String(input.operationIndex)}_${finding.id}`,
        };
      }),
    );

    const promptScan = this.promptInjectionScanner.scanProviderOutput({
      content: newContent,
      filePath: input.operation.targetFile,
      source: input.source,
    });

    findings.push(
      ...promptScan.findings
        .filter((finding) => finding.category !== 'secret_leak')
        .map((finding) => {
          return {
            ...finding,
            id: `PATCH_CONTENT_${String(input.operationIndex)}_${finding.id}`,
            category: finding.category === 'prompt_injection' ? 'patch_threat' : finding.category,
          };
        }),
    );

    for (const definition of allContentPatterns) {
      findings.push(...this.scanContentPattern(input, definition, newContent));
    }

    if (this.isPackageJson(input.operation.targetFile)) {
      for (const definition of packageScriptRiskPatterns) {
        findings.push(...this.scanContentPattern(input, definition, newContent));
      }
    }

    findings.push(...this.analyzePatchSize(input, newContent));
    findings.push(...this.analyzeRiskMismatch(input, newContent));

    return findings;
  }

  private analyzePatchSize(
    input: PatchOperationThreatInput,
    newContent: string,
  ): SecurityFinding[] {
    const lines = newContent.split('\n').length;
    const bytes = Buffer.byteLength(newContent, 'utf8');

    if (lines <= this.largePatchLineThreshold && bytes <= this.largePatchByteThreshold) {
      return [];
    }

    return [
      this.createFinding({
        source: input.source,
        proposal: input.proposal,
        operation: input.operation,
        operationIndex: input.operationIndex,
        code: 'PATCH_THREAT_LARGE_CONTENT_CHANGE',
        category: 'patch_threat',
        severity: input.proposal.riskLevel === 'low' ? 'warning' : 'info',
        message: `Patch operation changes a large amount of content: ${String(lines)} lines, ${String(bytes)} bytes.`,
        recommendation:
          'Large patches should receive higher scrutiny, stronger diff review, and potentially stricter approval policy.',
        evidence: `${String(lines)} lines / ${String(bytes)} bytes`,
      }),
    ];
  }

  private analyzeRiskMismatch(
    input: PatchOperationThreatInput,
    newContent: string,
  ): SecurityFinding[] {
    if (input.proposal.riskLevel !== 'low') {
      return [];
    }

    const lowerContent = newContent.toLowerCase();
    const highRiskSignals = [
      'process.env',
      'child_process',
      'exec(',
      'execsync',
      'spawn(',
      'fetch(',
      'http.request',
      'https.request',
      'rm -rf',
      'postinstall',
      'agent-loop-state.json',
      'project-memory.json',
    ];

    if (!highRiskSignals.some((signal) => lowerContent.includes(signal))) {
      return [];
    }

    return [
      this.createFinding({
        source: input.source,
        proposal: input.proposal,
        operation: input.operation,
        operationIndex: input.operationIndex,
        code: 'PATCH_THREAT_RISK_LEVEL_MISMATCH',
        category: 'patch_threat',
        severity: 'warning',
        message: 'Patch declares low risk but contains high-risk implementation signals.',
        recommendation:
          'Do not rely on provider-declared risk level. Runtime should independently classify patch risk.',
        evidence: input.proposal.riskLevel,
      }),
    ];
  }

  private scanContentPattern(
    input: PatchOperationThreatInput,
    definition: PatchThreatPatternDefinition,
    content: string,
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const pattern = new RegExp(definition.pattern.source, definition.pattern.flags);

    for (const match of content.matchAll(pattern)) {
      findings.push(
        this.createFinding({
          source: input.source,
          proposal: input.proposal,
          operation: input.operation,
          operationIndex: input.operationIndex,
          code: definition.code,
          category: definition.category,
          severity: definition.severity,
          message: definition.message,
          recommendation: definition.recommendation,
          evidence: match[0],
          content,
          index: match.index ?? 0,
        }),
      );
    }

    return findings;
  }

  private createFinding(input: {
    source: string;
    proposal: PatchProposal;
    operation: PatchOperation;
    operationIndex: number;
    code: string;
    category: SecurityFindingCategory;
    severity: SecuritySeverity;
    message: string;
    recommendation: string;
    evidence: string;
    content?: string | undefined;
    index?: number | undefined;
  }): SecurityFinding {
    const position =
      input.content && input.index !== undefined
        ? this.getLineAndColumn(input.content, input.index)
        : {
            line: 1,
            column: 1,
          };

    return {
      id: `${input.code}:${input.proposal.id}:${String(input.operationIndex)}:${input.operation.targetFile}:${String(position.line)}:${String(position.column)}`,
      code: input.code,
      category: input.category,
      severity: input.severity,
      message: input.message,
      location: {
        filePath: input.operation.targetFile,
        source: input.source,
        line: position.line,
        column: position.column,
      },
      evidence: this.redactEvidence(input.evidence),
      recommendation: input.recommendation,
      metadata: {
        proposalId: input.proposal.id,
        proposalRiskLevel: input.proposal.riskLevel,
        operationKind: input.operation.kind,
        operationIndex: input.operationIndex,
      },
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

  private isPackageJson(targetFile: string): boolean {
    return targetFile.replaceAll('\\', '/').toLowerCase().endsWith('package.json');
  }
}
