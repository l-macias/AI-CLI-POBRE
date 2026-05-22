import type { RuntimeSuggestion, SuggestionScanInput } from './SuggestionTypes.js';

export class ErrorSuggestionScanner {
  public scan(input: SuggestionScanInput): RuntimeSuggestion[] {
    const suggestions: RuntimeSuggestion[] = [];

    for (const error of input.errors ?? []) {
      const normalized = error.toLowerCase();

      if (
        normalized.includes('typescript') ||
        normalized.includes('tsc') ||
        normalized.includes('type')
      ) {
        suggestions.push({
          id: this.createId('suggestion-error-typescript'),
          category: 'error',
          priority: 'high',
          title: 'TypeScript errors detected',
          description:
            'Detected TypeScript-related errors. The runtime should inspect failing files before proposing patches.',
          recommendedCommand: 'Revisar errores TypeScript y archivos relacionados.',
          metadata: {
            error,
          },
        });
      }

      if (normalized.includes('eslint') || normalized.includes('lint')) {
        suggestions.push({
          id: this.createId('suggestion-error-lint'),
          category: 'error',
          priority: 'medium',
          title: 'Lint errors detected',
          description: 'Detected lint errors. These may be safe candidates for focused cleanup.',
          recommendedCommand: 'Revisar errores de lint y proponer corrección mínima.',
          metadata: {
            error,
          },
        });
      }
    }

    return suggestions;
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
