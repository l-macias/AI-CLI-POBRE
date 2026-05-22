import { HelpCircle } from 'lucide-react';
import type { RuntimeQuestion } from '../../types/runtime';
import { Badge } from '../Badge';

interface RuntimeQuestionsPanelProps {
  questions: RuntimeQuestion[];
  loading: boolean;
  onRefresh: () => void;
  onAnswer: (questionId: string, answer: string) => void;
}

export function RuntimeQuestionsPanel({
  questions,
  loading,
  onRefresh,
  onAnswer,
}: RuntimeQuestionsPanelProps) {
  return (
    <section className="panel integration-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <HelpCircle size={18} />
          <div>
            <h2>Runtime Questions</h2>
            <p className="muted">Questions Zero should ask before changing behavior.</p>
          </div>
        </div>

        <button className="secondary-button" onClick={onRefresh}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="integration-list">
        {questions.length > 0 ? (
          questions.map((question) => (
            <article className="integration-card" key={question.id}>
              <div className="integration-card-header">
                <strong>{question.question}</strong>
                <div className="suggestion-badges">
                  <Badge
                    tone={
                      question.priority === 'high'
                        ? 'red'
                        : question.priority === 'medium'
                          ? 'yellow'
                          : 'green'
                    }
                  >
                    {question.priority}
                  </Badge>
                  <Badge tone="blue">{question.category}</Badge>
                </div>
              </div>

              <p>{question.reason}</p>

              <div className="question-options">
                {question.options.map((option) => (
                  <button
                    className="secondary-button"
                    key={option.id}
                    onClick={() => onAnswer(question.id, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className="muted">No questions generated yet.</p>
        )}
      </div>
    </section>
  );
}
