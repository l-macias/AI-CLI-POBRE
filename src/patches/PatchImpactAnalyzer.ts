import type {
  PatchFileChange,
  PatchProposalOperation,
  PatchProposalRiskLevel,
} from './PatchProposal.js';

export type PatchPathImpact =
  | 'frontend_ui'
  | 'architecture_sensitive'
  | 'runtime_core'
  | 'security_sensitive'
  | 'provider_sensitive'
  | 'database_sensitive'
  | 'dependency_sensitive'
  | 'protected'
  | 'general';

export interface PatchImpactAnalysis {
  path: string;
  operation: PatchProposalOperation;
  impact: PatchPathImpact;
  riskLevel: PatchProposalRiskLevel;
  blockedByDefault: boolean;
}

export class PatchImpactAnalyzer {
  public analyzeFile(file: Pick<PatchFileChange, 'path' | 'operation'>): PatchImpactAnalysis {
    const normalized = this.normalize(file.path);

    if (file.operation === 'delete') {
      return this.result(file, 'protected', 'high', true);
    }

    if (this.isProtectedPath(normalized)) {
      return this.result(file, 'protected', 'high', true);
    }

    if (this.isDatabasePath(normalized)) {
      return this.result(file, 'database_sensitive', 'high', true);
    }

    if (this.isDependencyPath(normalized)) {
      return this.result(file, 'dependency_sensitive', 'high', false);
    }

    if (this.isSecurityPath(normalized)) {
      return this.result(file, 'security_sensitive', 'high', false);
    }

    if (this.isRuntimeCorePath(normalized)) {
      return this.result(file, 'runtime_core', 'high', false);
    }

    if (this.isProviderPath(normalized)) {
      return this.result(file, 'provider_sensitive', 'medium', false);
    }

    if (this.isArchitectureSensitivePath(normalized)) {
      return this.result(file, 'architecture_sensitive', 'medium', false);
    }

    if (this.isFrontendUiPath(normalized)) {
      return this.result(file, 'frontend_ui', 'low', false);
    }

    return this.result(file, 'general', 'low', false);
  }

  private result(
    file: Pick<PatchFileChange, 'path' | 'operation'>,
    impact: PatchPathImpact,
    riskLevel: PatchProposalRiskLevel,
    blockedByDefault: boolean,
  ): PatchImpactAnalysis {
    return {
      path: file.path,
      operation: file.operation,
      impact,
      riskLevel,
      blockedByDefault,
    };
  }

  private isProtectedPath(path: string): boolean {
    const segments = path.split('/');

    return (
      segments.includes('.env') ||
      segments.includes('.git') ||
      segments.includes('node_modules') ||
      segments.includes('dist') ||
      segments.includes('build') ||
      segments.includes('.next') ||
      path.endsWith('.env') ||
      path.includes('.env.')
    );
  }

  private isDatabasePath(path: string): boolean {
    return (
      path.includes('/database/') ||
      path.includes('/db/') ||
      path.includes('/prisma/') ||
      path.includes('/migrations/') ||
      path.endsWith('schema.prisma')
    );
  }

  private isDependencyPath(path: string): boolean {
    return (
      path === 'package.json' ||
      path === 'package-lock.json' ||
      path === 'pnpm-lock.yaml' ||
      path === 'yarn.lock'
    );
  }

  private isSecurityPath(path: string): boolean {
    return path.startsWith('src/security/');
  }

  private isRuntimeCorePath(path: string): boolean {
    return (
      path.startsWith('src/core/') ||
      path.startsWith('src/patch-apply/') ||
      path.startsWith('src/sandbox/') ||
      path.startsWith('src/verify/') ||
      path.startsWith('src/tools/')
    );
  }

  private isProviderPath(path: string): boolean {
    return path.startsWith('src/providers/');
  }

  private isArchitectureSensitivePath(path: string): boolean {
    return (
      path === 'tsconfig.json' ||
      path.startsWith('src/api/') ||
      path.startsWith('src/workflow/') ||
      path.startsWith('src/approval/') ||
      path.startsWith('src/patches/')
    );
  }

  private isFrontendUiPath(path: string): boolean {
    return (
      path.startsWith('ui/src/') ||
      path.endsWith('.tsx') ||
      path.endsWith('.jsx') ||
      path.endsWith('.css')
    );
  }

  private normalize(path: string): string {
    return path
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '')
      .toLowerCase();
  }
}
