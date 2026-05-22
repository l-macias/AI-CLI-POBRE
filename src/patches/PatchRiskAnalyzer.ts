import type {
  PatchFileChange,
  PatchProposalRisk,
  PatchProposalRiskLevel,
} from './PatchProposal.js';

export class PatchRiskAnalyzer {
  public analyze(files: PatchFileChange[]): PatchProposalRisk[] {
    const risks: PatchProposalRisk[] = [];

    if (files.some((file) => file.operation === 'delete')) {
      risks.push({
        code: 'DELETE_OPERATION',
        level: 'high',
        message: 'Patch proposal includes a delete operation.',
        mitigation: 'Require explicit hard approval before delete can ever be applied.',
      });
    }

    if (files.some((file) => this.isSensitivePath(file.path))) {
      risks.push({
        code: 'SENSITIVE_PATH',
        level: 'high',
        message: 'Patch proposal targets a protected or sensitive path.',
        mitigation: 'Runtime policy must reject protected paths before diff or apply.',
      });
    }

    if (files.some((file) => this.isArchitectureSensitive(file.path))) {
      risks.push({
        code: 'ARCHITECTURE_SENSITIVE_PATH',
        level: 'medium',
        message: 'Patch proposal touches architecture-sensitive code.',
        mitigation: 'Require user review and verification before apply.',
      });
    }

    if (files.length > 5) {
      risks.push({
        code: 'MULTI_FILE_PATCH',
        level: 'medium',
        message: 'Patch proposal affects several files.',
        mitigation: 'Review file-by-file and allow selective approval later.',
      });
    }

    if (risks.length === 0) {
      risks.push({
        code: 'LOW_RISK_PATCH_PROPOSAL',
        level: 'low',
        message: 'Patch proposal is limited to non-sensitive candidate files.',
        mitigation: 'Still require diff preview and user approval before apply.',
      });
    }

    return risks;
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

  private isSensitivePath(path: string): boolean {
    const normalized = path.replaceAll('\\', '/').toLowerCase();
    const segments = normalized.split('/');

    return (
      segments.includes('.env') ||
      segments.includes('.git') ||
      segments.includes('node_modules') ||
      segments.includes('dist') ||
      segments.includes('build') ||
      segments.includes('.next') ||
      normalized.endsWith('.env') ||
      normalized.includes('.env.')
    );
  }

  private isArchitectureSensitive(path: string): boolean {
    const normalized = path.replaceAll('\\', '/');

    return (
      normalized === 'package.json' ||
      normalized === 'tsconfig.json' ||
      normalized.startsWith('src/core/') ||
      normalized.startsWith('src/security/') ||
      normalized.startsWith('src/providers/') ||
      normalized.startsWith('src/patch-apply/') ||
      normalized.startsWith('src/tools/')
    );
  }
}
