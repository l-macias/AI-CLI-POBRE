import type { SessionDecision } from './SessionDecision.js';

export interface DecisionConflict {
  id: string;
  decisionA: SessionDecision;
  decisionB: SessionDecision;
  reason: string;
  severity: 'warning' | 'error';
}

export class DecisionConflictDetector {
  public detect(decisions: readonly SessionDecision[]): DecisionConflict[] {
    const conflicts: DecisionConflict[] = [];

    for (let index = 0; index < decisions.length; index += 1) {
      const current = decisions[index];

      if (!current) {
        continue;
      }

      for (const candidate of decisions.slice(index + 1)) {
        const conflict = this.detectPair(current, candidate);

        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private detectPair(first: SessionDecision, second: SessionDecision): DecisionConflict | null {
    if (first.category !== second.category) {
      return null;
    }

    if (this.isScopeConflict(first, second)) {
      return this.createConflict({
        first,
        second,
        reason: 'Scope decisions conflict with each other.',
        severity: 'error',
      });
    }

    if (this.isWorkspaceConflict(first, second)) {
      return this.createConflict({
        first,
        second,
        reason: 'Workspace mode decisions conflict with each other.',
        severity: 'error',
      });
    }

    if (this.isPermissionConflict(first, second)) {
      return this.createConflict({
        first,
        second,
        reason: 'Permission decisions conflict with each other.',
        severity: 'warning',
      });
    }

    return null;
  }

  private isScopeConflict(first: SessionDecision, second: SessionDecision): boolean {
    const a = first.normalizedStatement;
    const b = second.normalizedStatement;

    return (
      (this.blocks(a, 'backend') && this.allows(b, 'backend')) ||
      (this.allows(a, 'backend') && this.blocks(b, 'backend')) ||
      (this.blocks(a, 'frontend') && this.allows(b, 'frontend')) ||
      (this.allows(a, 'frontend') && this.blocks(b, 'frontend'))
    );
  }

  private isWorkspaceConflict(first: SessionDecision, second: SessionDecision): boolean {
    const modes = ['local_snapshot', 'local_patchless', 'git_diff', 'git_branch_pr'];
    const firstModes = modes.filter((mode) => first.normalizedStatement.includes(mode));
    const secondModes = modes.filter((mode) => second.normalizedStatement.includes(mode));

    return firstModes.length > 0 && secondModes.length > 0 && firstModes[0] !== secondModes[0];
  }

  private isPermissionConflict(first: SessionDecision, second: SessionDecision): boolean {
    const a = first.normalizedStatement;
    const b = second.normalizedStatement;

    return (
      (this.blocks(a, 'package.json') && this.allows(b, 'package.json')) ||
      (this.allows(a, 'package.json') && this.blocks(b, 'package.json')) ||
      (this.blocks(a, 'database') && this.allows(b, 'database')) ||
      (this.allows(a, 'database') && this.blocks(b, 'database'))
    );
  }

  private blocks(statement: string, target: string): boolean {
    return (
      statement.includes(target) &&
      (statement.includes('no tocar') ||
        statement.includes('bloquear') ||
        statement.includes('prohibido') ||
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

  private createConflict(input: {
    first: SessionDecision;
    second: SessionDecision;
    reason: string;
    severity: 'warning' | 'error';
  }): DecisionConflict {
    return {
      id: `decision-conflict-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`,
      decisionA: input.first,
      decisionB: input.second,
      reason: input.reason,
      severity: input.severity,
    };
  }
}
