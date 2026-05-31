import type { RuntimePlanRisk, RuntimePlanRiskLevel, RuntimePlanScope } from './RuntimePlan.js';

export interface PlanRiskAnalyzerInput {
  instruction: string;
  scope: RuntimePlanScope;
  stack: string[];
  readOnly?: boolean | undefined;
}

export class PlanRiskAnalyzer {
  public analyze(input: PlanRiskAnalyzerInput): RuntimePlanRisk[] {
    const normalizedInstruction = input.instruction.toLowerCase();
    const risks: RuntimePlanRisk[] = [];

    if (input.readOnly === true) {
      return this.analyzeReadOnly(input);
    }

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

  private analyzeReadOnly(input: PlanRiskAnalyzerInput): RuntimePlanRisk[] {
    const normalizedInstruction = input.instruction.toLowerCase();
    const risks: RuntimePlanRisk[] = [
      {
        code: 'READ_ONLY_ANALYSIS',
        level: 'low',
        message: 'The objective explicitly requests read-only analysis or recommendations only.',
        mitigation:
          'Do not generate patches, snapshots, apply steps or patch verification commands.',
      },
    ];

    if (
      this.containsAny(normalizedInstruction, [
        'database',
        'db',
        'prisma',
        'migration',
        'schema',
        'auth',
        'login',
        'token',
        'jwt',
        'session',
      ])
    ) {
      risks.push({
        code: 'READ_ONLY_SENSITIVE_AREA_REVIEW',
        level: 'low',
        message:
          'The read-only objective mentions sensitive areas that should be reviewed without writes.',
        mitigation:
          'Keep analysis informational and require a new explicit patch objective for modifications.',
      });
    }

    if (input.scope.candidateFiles.some((file) => this.isSensitivePath(file.path))) {
      risks.push({
        code: 'READ_ONLY_SENSITIVE_FILE_CONTEXT',
        level: 'low',
        message: 'The read-only context may include sensitive file areas for inspection.',
        mitigation: 'Use only read-only inspection and avoid patch proposal or apply flow.',
      });
    }

    return risks;
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
