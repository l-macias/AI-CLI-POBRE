import type { AppliedDecisionContext, SessionDecision } from './SessionDecision.js';

export class DecisionApplier {
  public apply(input: {
    sessionId: string;
    decisions: readonly SessionDecision[];
  }): AppliedDecisionContext {
    const context: AppliedDecisionContext = {
      sessionId: input.sessionId,
      blockedScopes: [],
      allowedScopes: [],
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
      codingRules: [...new Set(context.codingRules)],
      notes: [...new Set(context.notes)],
    };
  }

  private applyDecision(context: AppliedDecisionContext, decision: SessionDecision): void {
    const statement = decision.normalizedStatement;

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
  }

  private applyPermissionDecision(context: AppliedDecisionContext, statement: string): void {
    if (statement.includes('sin aprobacion') || statement.includes('without approval')) {
      context.requiresApproval = true;
    }

    if (this.blocks(statement, 'package.json')) {
      context.blockedScopes.push('package.json');
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
  private blocks(statement: string, target: string): boolean {
    return (
      statement.includes(target) &&
      (statement.includes('no tocar') ||
        statement.includes('bloquear') ||
        statement.includes('prohibido') ||
        statement.includes('readonly') ||
        statement.includes('solo lectura') ||
        statement.includes('block') ||
        statement.includes('do not touch'))
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
