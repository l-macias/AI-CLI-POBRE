import type { AppliedDecisionContext, SessionDecision } from './SessionDecision.js';

const generatedOutputPathPatterns = [
  '.open-next',
  '.next',
  'dist',
  'build',
  'out',
  'node_modules',
  'coverage',
  '.cache',
  '.turbo',
  '.vercel',
  'public/build',
] as const;

export class DecisionApplier {
  public apply(input: {
    sessionId: string;
    decisions: readonly SessionDecision[];
  }): AppliedDecisionContext {
    const context: AppliedDecisionContext = {
      sessionId: input.sessionId,
      blockedScopes: [],
      allowedScopes: [],
      blockedPathPatterns: [],
      allowedPathPatterns: [],
      codingRules: [],
      requiresApproval: true,
      securityStrict: false,
      notes: [],
    };

    for (const decision of input.decisions) {
      this.applyDecision(context, decision);
    }

    return {
      ...context,
      blockedScopes: [...new Set(context.blockedScopes)],
      allowedScopes: [...new Set(context.allowedScopes)],
      blockedPathPatterns: [...new Set(context.blockedPathPatterns)],
      allowedPathPatterns: [...new Set(context.allowedPathPatterns)],
      codingRules: [...new Set(context.codingRules)],
      notes: [...new Set(context.notes)],
    };
  }

  private applyDecision(context: AppliedDecisionContext, decision: SessionDecision): void {
    const statement = decision.normalizedStatement;

    this.applyExecutablePathPolicy(context, decision);

    if (decision.category === 'scope') {
      this.applyScopeDecision(context, statement);
    }

    if (decision.category === 'coding_style') {
      context.codingRules.push(decision.statement);
    }

    if (decision.category === 'workspace') {
      this.applyWorkspaceDecision(context, statement);
    }

    if (decision.category === 'permission') {
      this.applyPermissionDecision(context, statement);
    }

    if (decision.category === 'architecture') {
      this.applyArchitectureDecision(context, statement);
    }

    if (decision.category === 'security') {
      context.securityStrict = true;
      context.notes.push(decision.statement);
    }

    if (decision.category === 'workflow') {
      context.notes.push(decision.statement);
    }
  }

  private applyScopeDecision(context: AppliedDecisionContext, statement: string): void {
    if (this.blocks(statement, 'backend')) {
      context.blockedScopes.push('backend');
    }

    if (this.blocks(statement, 'frontend')) {
      context.blockedScopes.push('frontend');
    }

    if (this.allows(statement, 'backend')) {
      context.allowedScopes.push('backend');
    }

    if (this.allows(statement, 'frontend')) {
      context.allowedScopes.push('frontend');
    }
  }

  private applyWorkspaceDecision(context: AppliedDecisionContext, statement: string): void {
    const modes = ['local_snapshot', 'local_patchless', 'git_diff', 'git_branch_pr'];

    for (const mode of modes) {
      if (statement.includes(mode)) {
        context.workspaceMode = mode;
        return;
      }
    }

    if (
      statement.includes('read-only') ||
      statement.includes('readonly') ||
      statement.includes('solo lectura') ||
      statement.includes('no file changes') ||
      statement.includes('analysis only')
    ) {
      context.workspaceMode = 'local_patchless';
    }
  }

  private applyPermissionDecision(context: AppliedDecisionContext, statement: string): void {
    if (statement.includes('sin aprobacion') || statement.includes('without approval')) {
      context.requiresApproval = true;
    }

    if (this.blocks(statement, 'package.json')) {
      context.blockedScopes.push('package.json');
      context.blockedPathPatterns.push('package.json');
    }

    if (this.blocks(statement, 'database') || this.blocks(statement, 'base de datos')) {
      context.blockedScopes.push('database');
    }
  }

  private applyArchitectureDecision(context: AppliedDecisionContext, statement: string): void {
    if (
      this.blocks(statement, 'database') ||
      this.blocks(statement, 'base de datos') ||
      this.blocks(statement, 'prisma') ||
      this.blocks(statement, 'migraciones')
    ) {
      context.blockedScopes.push('database');
      context.blockedScopes.push('prisma');
      context.blockedScopes.push('migrations');
      context.blockedPathPatterns.push('prisma');
      context.blockedPathPatterns.push('migrations');
    }

    if (
      this.allows(statement, 'database') ||
      this.allows(statement, 'base de datos') ||
      this.allows(statement, 'prisma') ||
      this.allows(statement, 'migraciones')
    ) {
      context.allowedScopes.push('database');
    }

    context.notes.push(statement);
  }

  private applyExecutablePathPolicy(
    context: AppliedDecisionContext,
    decision: SessionDecision,
  ): void {
    const statement = decision.normalizedStatement;
    const isBlockingRule =
      decision.strength === 'hard_rule' ||
      decision.strength === 'constraint' ||
      statement.includes('do not') ||
      statement.includes('do not use') ||
      statement.includes('do not touch') ||
      statement.includes('no usar') ||
      statement.includes('no tocar') ||
      statement.includes('bloquear') ||
      statement.includes('prohibido') ||
      statement.includes('exclude') ||
      statement.includes('ignorar');

    const mentionsGeneratedOutput =
      statement.includes('generated') ||
      statement.includes('output') ||
      statement.includes('build output') ||
      statement.includes('cache') ||
      statement.includes('dependency') ||
      statement.includes('dependencies') ||
      generatedOutputPathPatterns.some((pattern) => statement.includes(pattern));

    if (!isBlockingRule || !mentionsGeneratedOutput) {
      return;
    }

    for (const pattern of generatedOutputPathPatterns) {
      if (
        statement.includes(pattern) ||
        statement.includes('generated') ||
        statement.includes('build output') ||
        statement.includes('cache') ||
        statement.includes('dependency') ||
        statement.includes('dependencies')
      ) {
        context.blockedPathPatterns.push(pattern);
      }
    }

    context.notes.push(decision.statement);
  }

  private blocks(statement: string, target: string): boolean {
    return (
      statement.includes(target) &&
      (statement.includes('no tocar') ||
        statement.includes('bloquear') ||
        statement.includes('prohibido') ||
        statement.includes('readonly') ||
        statement.includes('solo lectura') ||
        statement.includes('block') ||
        statement.includes('do not touch') ||
        statement.includes('do not use') ||
        statement.includes('exclude'))
    );
  }

  private allows(statement: string, target: string): boolean {
    return (
      statement.includes(target) &&
      (statement.includes('permitir') ||
        statement.includes('puedo') ||
        statement.includes('allowed') ||
        statement.includes('allow') ||
        statement.includes('modificar'))
    );
  }
}
