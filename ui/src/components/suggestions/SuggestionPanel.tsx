import { Lightbulb, Send } from 'lucide-react';
import type { RuntimeSuggestion } from '../../types/runtime';
import { Badge } from '../Badge';

interface SuggestionPanelProps {
  suggestions: RuntimeSuggestion[];
  loading: boolean;
  onRefresh: () => void;
  onRunSuggestion: (command: string) => void;
}

export function SuggestionPanel({
  suggestions,
  loading,
  onRefresh,
  onRunSuggestion,
}: SuggestionPanelProps) {
  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <Lightbulb size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Runtime Suggestions
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Next safe actions recommended by the runtime.
            </p>
          </div>
        </div>

        <button
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          onClick={onRefresh}
        >
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <article
              className="flex flex-col gap-3 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors"
              key={suggestion.id}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <strong className="text-sm font-semibold text-zinc-200">{suggestion.title}</strong>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={toneForPriority(suggestion.priority)}>{suggestion.priority}</Badge>
                  <Badge tone="blue">{suggestion.category}</Badge>
                </div>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed">{suggestion.description}</p>

              {suggestion.recommendedCommand ? (
                <button
                  className="w-full sm:w-fit flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                  onClick={() => onRunSuggestion(suggestion.recommendedCommand ?? '')}
                >
                  <Send size={14} />
                  Run suggestion
                </button>
              ) : null}
            </article>
          ))
        ) : (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
            <p className="text-sm text-zinc-500 italic">
              No suggestions yet. Start or update a session first.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function toneForPriority(priority: RuntimeSuggestion['priority']): 'green' | 'yellow' | 'red' {
  if (priority === 'high') return 'red';
  if (priority === 'medium') return 'yellow';
  return 'green';
}
