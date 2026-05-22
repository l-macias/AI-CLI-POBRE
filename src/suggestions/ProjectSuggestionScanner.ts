import type { RuntimeSuggestion, SuggestionScanInput } from './SuggestionTypes.js';

export class ProjectSuggestionScanner {
  public scan(input: SuggestionScanInput): RuntimeSuggestion[] {
    const suggestions: RuntimeSuggestion[] = [];
    const stack = new Set((input.stack ?? []).map((item) => item.toLowerCase()));

    if (stack.has('mern')) {
      suggestions.push({
        id: this.createId('suggestion-project-mern'),
        category: 'project',
        priority: 'medium',
        title: 'MERN project detected',
        description:
          'Detected a MERN-like stack. Backend routes and frontend API clients should be analyzed together.',
        recommendedCommand: 'Analizar rutas backend y clientes HTTP frontend relacionados.',
        metadata: {
          stack: [...stack],
        },
      });
    }

    if (stack.has('pern')) {
      suggestions.push({
        id: this.createId('suggestion-project-pern'),
        category: 'project',
        priority: 'medium',
        title: 'PERN project detected',
        description:
          'Detected a PERN-like stack. Database and API boundaries should be reviewed before patches.',
        recommendedCommand:
          'Revisar backend, Prisma/PostgreSQL y clientes frontend antes de proponer cambios.',
        metadata: {
          stack: [...stack],
        },
      });
    }

    if (stack.has('typescript')) {
      suggestions.push({
        id: this.createId('suggestion-project-typescript'),
        category: 'project',
        priority: 'low',
        title: 'TypeScript project detected',
        description: 'TypeScript validation should be part of the verification flow.',
        recommendedCommand: '/verify',
        metadata: {
          validation: 'typecheck',
        },
      });
    }

    return suggestions;
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
