import { ArchitectureSuggestionScanner } from './ArchitectureSuggestionScanner.js';
import { ErrorSuggestionScanner } from './ErrorSuggestionScanner.js';
import { ProjectSuggestionScanner } from './ProjectSuggestionScanner.js';
import type {
  RuntimeSuggestion,
  SuggestionScanInput,
  SuggestionScanResult,
} from './SuggestionTypes.js';

export interface SuggestionEngineOptions {
  projectScanner?: ProjectSuggestionScanner | undefined;
  errorScanner?: ErrorSuggestionScanner | undefined;
  architectureScanner?: ArchitectureSuggestionScanner | undefined;
}

export class SuggestionEngine {
  private readonly projectScanner: ProjectSuggestionScanner;
  private readonly errorScanner: ErrorSuggestionScanner;
  private readonly architectureScanner: ArchitectureSuggestionScanner;

  public constructor(options: SuggestionEngineOptions = {}) {
    this.projectScanner = options.projectScanner ?? new ProjectSuggestionScanner();
    this.errorScanner = options.errorScanner ?? new ErrorSuggestionScanner();
    this.architectureScanner = options.architectureScanner ?? new ArchitectureSuggestionScanner();
  }

  public scan(input: SuggestionScanInput): SuggestionScanResult {
    const suggestions = this.dedupe([
      ...this.projectScanner.scan(input),
      ...this.errorScanner.scan(input),
      ...this.architectureScanner.scan(input),
    ]);

    return {
      projectRoot: input.projectRoot,
      suggestions: this.sortByPriority(suggestions),
      generatedAt: new Date().toISOString(),
    };
  }

  private dedupe(suggestions: RuntimeSuggestion[]): RuntimeSuggestion[] {
    const seen = new Set<string>();
    const unique: RuntimeSuggestion[] = [];

    for (const suggestion of suggestions) {
      const key = `${suggestion.category}:${suggestion.title}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(suggestion);
    }

    return unique;
  }

  private sortByPriority(suggestions: RuntimeSuggestion[]): RuntimeSuggestion[] {
    const weight = {
      high: 0,
      medium: 1,
      low: 2,
    } as const;

    return suggestions.sort((a, b) => weight[a.priority] - weight[b.priority]);
  }
}
