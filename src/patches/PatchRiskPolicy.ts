import type {
  PatchFileChange,
  PatchProposalRisk,
  PatchProposalRiskLevel,
  PatchProposalOperation,
} from './PatchProposal.js';
import { PatchImpactAnalyzer } from './PatchImpactAnalyzer.js';
import { PatchSizeClassifier } from './PatchSizeClassifier.js';

export interface PatchFileRiskInput {
  path: string;
  operation: PatchProposalOperation;
  totalFiles: number;
}

export interface PatchRiskPolicyResult {
  risks: PatchProposalRisk[];
  highestRisk: PatchProposalRiskLevel;
}

export class PatchRiskPolicy {
  private readonly sizeClassifier: PatchSizeClassifier;
  private readonly impactAnalyzer: PatchImpactAnalyzer;

  public constructor(
    sizeClassifier = new PatchSizeClassifier(),
    impactAnalyzer = new PatchImpactAnalyzer(),
  ) {
    this.sizeClassifier = sizeClassifier;
    this.impactAnalyzer = impactAnalyzer;
  }

  public riskForFile(input: PatchFileRiskInput): PatchProposalRiskLevel {
    const size = this.sizeClassifier.classify(input.totalFiles);
    const impact = this.impactAnalyzer.analyzeFile({
      path: input.path,
      operation: input.operation,
    });

    return this.maxRisk(size.riskLevel, impact.riskLevel);
  }

  public analyze(files: PatchFileChange[]): PatchRiskPolicyResult {
    const risks: PatchProposalRisk[] = [];
    const size = this.sizeClassifier.classify(files.length);
    const impacts = files.map((file) => this.impactAnalyzer.analyzeFile(file));

    if (files.some((file) => file.operation === 'delete')) {
      risks.push({
        code: 'DELETE_OPERATION',
        level: 'high',
        message: 'Patch proposal includes a delete operation.',
        mitigation:
          'Delete operations remain blocked by default and require explicit hard approval.',
      });
    }

    if (impacts.some((impact) => impact.impact === 'protected')) {
      risks.push({
        code: 'PROTECTED_PATH',
        level: 'high',
        message: 'Patch proposal targets protected runtime paths.',
        mitigation: 'Runtime policy must reject protected paths before diff or apply.',
      });
    }

    if (impacts.some((impact) => impact.impact === 'database_sensitive')) {
      risks.push({
        code: 'DATABASE_SENSITIVE_PATH',
        level: 'high',
        message: 'Patch proposal targets database, Prisma or migration paths.',
        mitigation: 'Database and migration changes require a dedicated approval flow.',
      });
    }

    if (impacts.some((impact) => impact.impact === 'dependency_sensitive')) {
      risks.push({
        code: 'DEPENDENCY_SENSITIVE_PATH',
        level: 'high',
        message: 'Patch proposal touches dependency or package manager files.',
        mitigation: 'Dependency changes require explicit review and verification.',
      });
    }

    if (impacts.some((impact) => impact.impact === 'security_sensitive')) {
      risks.push({
        code: 'SECURITY_SENSITIVE_PATH',
        level: 'high',
        message: 'Patch proposal touches security-sensitive code.',
        mitigation: 'Security changes require strict review, verification and audit logging.',
      });
    }

    if (impacts.some((impact) => impact.impact === 'runtime_core')) {
      risks.push({
        code: 'RUNTIME_CORE_PATH',
        level: 'high',
        message: 'Patch proposal touches runtime authority or execution core.',
        mitigation: 'Runtime core changes require snapshot, verification and explicit approval.',
      });
    }

    if (impacts.some((impact) => impact.impact === 'provider_sensitive')) {
      risks.push({
        code: 'PROVIDER_SENSITIVE_PATH',
        level: 'medium',
        message: 'Patch proposal touches provider integration code.',
        mitigation:
          'Provider changes require validation against malformed output and fallback behavior.',
      });
    }

    if (impacts.some((impact) => impact.impact === 'architecture_sensitive')) {
      risks.push({
        code: 'ARCHITECTURE_SENSITIVE_PATH',
        level: 'medium',
        message: 'Patch proposal touches architecture-sensitive code.',
        mitigation: 'Require user review and verification before apply.',
      });
    }

    if (size.className === 'small_multi_file') {
      risks.push({
        code: 'SMALL_MULTI_FILE_PATCH',
        level: 'medium',
        message: 'Patch proposal affects 2 to 5 files.',
        mitigation: 'Require file-level approval, snapshot and verification.',
      });
    }

    if (size.className === 'large_multi_file') {
      risks.push({
        code: 'LARGE_MULTI_FILE_PATCH',
        level: 'high',
        message: 'Patch proposal affects more than 5 files.',
        mitigation: 'Split into smaller staged patches unless explicitly approved.',
      });
    }

    if (risks.length === 0) {
      risks.push({
        code: 'LOW_RISK_PATCH_PROPOSAL',
        level: 'low',
        message: 'Patch proposal is limited to low-impact non-sensitive files.',
        mitigation: 'Still require diff preview and user approval before apply.',
      });
    }

    return {
      risks,
      highestRisk: this.highestRisk(risks),
    };
  }

  public highestRisk(risks: PatchProposalRisk[]): PatchProposalRiskLevel {
    if (risks.some((risk) => risk.level === 'high')) {
      return 'high';
    }

    if (risks.some((risk) => risk.level === 'medium')) {
      return 'medium';
    }

    return 'low';
  }

  private maxRisk(
    first: PatchProposalRiskLevel,
    second: PatchProposalRiskLevel,
  ): PatchProposalRiskLevel {
    if (first === 'high' || second === 'high') {
      return 'high';
    }

    if (first === 'medium' || second === 'medium') {
      return 'medium';
    }

    return 'low';
  }
}
