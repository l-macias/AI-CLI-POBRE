import type { RuntimePlanRisk, RuntimePlanRiskLevel, RuntimePlanScope } from './RuntimePlan.js';

export interface PlanRiskAnalyzerInput {
  instruction: string;
  scope: RuntimePlanScope;
  stack: string[];
}

export class PlanRiskAnalyzer {
  public analyze(input: PlanRiskAnalyzerInput): RuntimePlanRisk[] {
    const normalizedInstruction = input.instruction.toLowerCase();
    const risks: RuntimePlanRisk[] = [];

    if (this.containsAny(normalizedInstruction, ['delete', 'remove', 'borrar', 'eliminar'])) {
      risks.push({
        code: 'DESTRUCTIVE_INTENT',
        level: 'high',
        message: 'The instruction may involve deleting or removing code.',
        mitigation: 'Require explicit approval and snapshot before any destructive change.',
      });
    }

    if (
      this.containsAny(normalizedInstruction, ['database', 'db', 'prisma', 'migration', 'schema'])
    ) {
      risks.push({
        code: 'DATABASE_TOUCHPOINT',
        level: 'high',
        message: 'The instruction may affect database or Prisma-related files.',
        mitigation: 'Block migrations unless explicitly approved and reviewed.',
      });
    }

    if (this.containsAny(normalizedInstruction, ['auth', 'login', 'token', 'jwt', 'session'])) {
      risks.push({
        code: 'AUTH_SECURITY_TOUCHPOINT',
        level: 'medium',
        message: 'The instruction may affect authentication or session logic.',
        mitigation: 'Require focused review of security boundaries before patch generation.',
      });
    }

    if (this.containsAny(normalizedInstruction, ['package.json', 'dependency', 'dependencies'])) {
      risks.push({
        code: 'DEPENDENCY_CHANGE',
        level: 'medium',
        message: 'The instruction may affect dependencies or package scripts.',
        mitigation: 'Require approval before package metadata changes.',
      });
    }

    if (input.scope.candidateFiles.some((file) => this.isSensitivePath(file.path))) {
      risks.push({
        code: 'SENSITIVE_FILE_CANDIDATE',
        level: 'high',
        message: 'The candidate file list includes sensitive or protected paths.',
        mitigation: 'Runtime policy must reject protected paths before plan approval.',
      });
    }

    if (risks.length === 0) {
      risks.push({
        code: 'LOW_RISK_PLANNING_ONLY',
        level: 'low',
        message: 'The instruction can be planned without immediate file modification.',
        mitigation: 'Keep the plan read-only until patch proposal and approval stages.',
      });
    }

    return risks;
  }

  public highestRisk(risks: RuntimePlanRisk[]): RuntimePlanRiskLevel {
    if (risks.some((risk) => risk.level === 'high')) {
      return 'high';
    }

    if (risks.some((risk) => risk.level === 'medium')) {
      return 'medium';
    }

    return 'low';
  }

  private containsAny(value: string, terms: string[]): boolean {
    return terms.some((term) => value.includes(term));
  }

  private isSensitivePath(path: string): boolean {
    const normalizedPath = path.replaceAll('\\', '/').toLowerCase();
    const segments = normalizedPath.split('/');

    return (
      segments.includes('.env') ||
      segments.includes('.git') ||
      segments.includes('node_modules') ||
      segments.includes('dist') ||
      segments.includes('build') ||
      segments.includes('.next') ||
      normalizedPath.endsWith('.env') ||
      normalizedPath.includes('.env.')
    );
  }
}
