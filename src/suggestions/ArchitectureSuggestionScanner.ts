import type { RuntimeSuggestion, SuggestionScanInput } from './SuggestionTypes.js';

export class ArchitectureSuggestionScanner {
  public scan(input: SuggestionScanInput): RuntimeSuggestion[] {
    const suggestions: RuntimeSuggestion[] = [];
    const actionText = (input.runtimeActions ?? [])
      .map((action) => `${action.title} ${action.description} ${action.status}`)
      .join(' ')
      .toLowerCase();

    if (input.workspaceMode === 'local_snapshot' && input.snapshotAvailable !== true) {
      suggestions.push({
        id: this.createId('suggestion-snapshot-missing'),
        category: 'snapshot',
        priority: 'high',
        title: 'Snapshot recommended',
        description: 'Workspace mode is local_snapshot, but no snapshot is available yet.',
        recommendedCommand: 'Crear snapshot local antes de aplicar cambios.',
        metadata: {
          workspaceMode: input.workspaceMode,
        },
      });
    }

    if (input.gitAvailable === false && input.workspaceMode?.startsWith('git_')) {
      suggestions.push({
        id: this.createId('suggestion-git-missing'),
        category: 'workspace',
        priority: 'high',
        title: 'Git mode requires repository',
        description:
          'The selected workspace mode requires Git, but Git is not available for this project.',
        recommendedCommand: 'Cambiar a local_snapshot o inicializar Git.',
        metadata: {
          workspaceMode: input.workspaceMode,
          gitAvailable: false,
        },
      });
    }

    if (
      actionText.includes('auth') ||
      actionText.includes('secret') ||
      actionText.includes('.env')
    ) {
      suggestions.push({
        id: this.createId('suggestion-security-review'),
        category: 'security',
        priority: 'high',
        title: 'Security-sensitive change detected',
        description: 'The current runtime actions mention auth, secrets or environment files.',
        recommendedCommand: 'Ejecutar revisión de seguridad antes de aprobar cambios.',
        metadata: {
          reason: 'security-sensitive-action-text',
        },
      });
    }

    if (
      actionText.includes('database') ||
      actionText.includes('prisma') ||
      actionText.includes('postgres')
    ) {
      suggestions.push({
        id: this.createId('suggestion-database-boundary'),
        category: 'architecture',
        priority: 'medium',
        title: 'Database boundary detected',
        description:
          'The task appears to touch persistence or database logic. Runtime should ask before modifying schema or migrations.',
        recommendedCommand:
          'Preguntar si se permite modificar base de datos, Prisma o migraciones.',
        metadata: {
          boundary: 'database',
        },
      });
    }

    return suggestions;
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
