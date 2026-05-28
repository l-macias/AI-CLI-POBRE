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
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <HelpCircle size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Runtime Questions
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Questions Zero should ask before changing behavior.
            </p>
          </div>
        </div>

        <button
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
          disabled={loading}
          onClick={onRefresh}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {questions.length > 0 ? (
          questions.map((question) => (
            <article
              className="flex flex-col gap-4 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors"
              key={question.id}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <strong className="text-sm font-semibold text-zinc-200">{question.question}</strong>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
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

              <p className="text-sm text-zinc-400 leading-relaxed">{question.reason}</p>

              <div className="flex flex-wrap items-center gap-3 mt-2 pt-4 border-t border-zinc-800/60">
                {question.options.map((option) => (
                  <button
                    className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
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
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <p className="text-sm text-zinc-400">No questions generated yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
