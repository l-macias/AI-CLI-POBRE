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
    <section className="panel suggestions-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <Lightbulb size={18} />
          <div>
            <h2>Runtime Suggestions</h2>
            <p className="muted">Next safe actions recommended by the runtime.</p>
          </div>
        </div>

        <button className="secondary-button" onClick={onRefresh}>
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      <div className="suggestions-list">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <article className="suggestion-card" key={suggestion.id}>
              <div>
                <div className="suggestion-card-header">
                  <strong>{suggestion.title}</strong>
                  <div className="suggestion-badges">
                    <Badge tone={toneForPriority(suggestion.priority)}>{suggestion.priority}</Badge>
                    <Badge tone="blue">{suggestion.category}</Badge>
                  </div>
                </div>

                <p>{suggestion.description}</p>

                {suggestion.recommendedCommand ? (
                  <button
                    className="secondary-button"
                    onClick={() => onRunSuggestion(suggestion.recommendedCommand ?? '')}
                  >
                    <Send size={14} />
                    Run suggestion
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="muted">No suggestions yet. Start or update a session first.</p>
        )}
      </div>
    </section>
  );
}

function toneForPriority(priority: RuntimeSuggestion['priority']): 'green' | 'yellow' | 'red' {
  if (priority === 'high') {
    return 'red';
  }

  if (priority === 'medium') {
    return 'yellow';
  }

  return 'green';
}
