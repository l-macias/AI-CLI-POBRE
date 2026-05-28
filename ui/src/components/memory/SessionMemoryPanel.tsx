import { useState } from 'react';
import { Brain, Plus, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '../Badge';
import { DecisionConflictCard } from './DecisionConflictCard';
import { MemoryFactCard } from './MemoryFactCard';
import { SessionDecisionCard } from './SessionDecisionCard';
import type {
  SessionDecisionCategory,
  SessionDecisionStrength,
  SessionMemoryDecisionDraft,
  SessionMemoryView,
} from './MemoryTypes';

interface SessionMemoryPanelProps {
  memory: SessionMemoryView | null;
  loading?: boolean;
  disabled?: boolean;
  onRefresh: () => void;
  onAddDecision: (draft: SessionMemoryDecisionDraft) => void;
}

const categories: SessionDecisionCategory[] = [
  'scope',
  'coding_style',
  'workspace',
  'permission',
  'architecture',
  'security',
  'workflow',
];

const strengths: SessionDecisionStrength[] = ['preference', 'constraint', 'hard_rule'];

export function SessionMemoryPanel({
  memory,
  loading = false,
  disabled = false,
  onRefresh,
  onAddDecision,
}: SessionMemoryPanelProps) {
  const [draft, setDraft] = useState<SessionMemoryDecisionDraft>({
    category: 'workflow',
    strength: 'preference',
    statement: '',
  });

  function submitDecision() {
    const statement = draft.statement.trim();

    if (!statement) {
      return;
    }

    onAddDecision({
      ...draft,
      statement,
    });

    setDraft((current) => ({
      ...current,
      statement: '',
    }));
  }

  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-6">
        <div className="flex items-start gap-3">
          <Brain size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Session Memory</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Session decisions, applied runtime context and project memory.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Badge tone={memory ? 'green' : 'slate'}>{memory ? 'loaded' : 'idle'}</Badge>
          <button
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            disabled={disabled || loading}
            onClick={onRefresh}
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-4 p-5 rounded-xl border border-zinc-800/60 bg-zinc-950/50 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-400">Category</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50 appearance-none"
              value={draft.category}
              disabled={disabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value as SessionDecisionCategory,
                }))
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-400">Strength</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50 appearance-none"
              value={draft.strength}
              disabled={disabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  strength: event.target.value as SessionDecisionStrength,
                }))
              }
            >
              {strengths.map((strength) => (
                <option key={strength} value={strength}>
                  {strength}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-400">Decision</span>
          <textarea
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50 resize-y"
            rows={3}
            value={draft.statement}
            disabled={disabled}
            placeholder="Ej: No tocar database, prisma ni migraciones en esta sesión."
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                statement: event.target.value,
              }))
            }
          />
        </label>

        <div className="flex justify-end mt-2">
          <button
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={disabled || draft.statement.trim().length === 0}
            onClick={submitDecision}
          >
            <Plus size={16} />
            Add decision
          </button>
        </div>
      </section>

      {!memory ? (
        <article className="flex flex-col items-center justify-center gap-3 p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
          <ShieldCheck size={28} className="text-zinc-600" />
          <div>
            <strong className="block text-sm font-medium text-zinc-300">
              No session memory loaded.
            </strong>
            <p className="text-xs text-zinc-500 mt-1">
              Start a session or refresh memory to inspect runtime decisions.
            </p>
          </div>
        </article>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
              Applied context
            </h3>

            <article className="flex flex-col gap-5 p-5 rounded-xl border border-zinc-800/60 bg-zinc-950/50">
              <MemoryList title="Blocked scopes" items={memory.appliedContext.blockedScopes} />
              <MemoryList title="Allowed scopes" items={memory.appliedContext.allowedScopes} />
              <MemoryList title="Coding rules" items={memory.appliedContext.codingRules} />
              <MemoryList title="Notes" items={memory.appliedContext.notes} />

              <div className="flex flex-wrap gap-2 mt-2 pt-4 border-t border-zinc-800/60">
                <Badge tone={memory.appliedContext.requiresApproval ? 'yellow' : 'green'}>
                  approval {memory.appliedContext.requiresApproval ? 'required' : 'optional'}
                </Badge>
                <Badge tone={memory.appliedContext.securityStrict ? 'red' : 'slate'}>
                  security {memory.appliedContext.securityStrict ? 'strict' : 'normal'}
                </Badge>
                {memory.appliedContext.workspaceMode ? (
                  <Badge tone="blue">{memory.appliedContext.workspaceMode}</Badge>
                ) : null}
              </div>
            </article>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2 mt-4">
              Conflicts
            </h3>

            {memory.conflicts.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No decision conflicts.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {memory.conflicts.map((conflict) => (
                  <DecisionConflictCard key={conflict.id} conflict={conflict} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
              Session decisions
            </h3>

            {memory.sessionDecisions.decisions.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No session decisions yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {memory.sessionDecisions.decisions.map((decision) => (
                  <SessionDecisionCard key={decision.id} decision={decision} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
              Project memory
            </h3>

            {memory.projectMemory.entries.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No project memory entries.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {memory.projectMemory.entries.slice(-8).map((entry) => (
                  <MemoryFactCard key={entry.id} entry={entry} variant="entry" />
                ))}
              </div>
            )}

            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2 mt-4">
              Known files
            </h3>

            {memory.projectMemory.knownFiles.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No known files recorded.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {memory.projectMemory.knownFiles.slice(-8).map((file) => (
                  <MemoryFactCard key={file.path} entry={file} variant="known-file" />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function MemoryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <strong className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </strong>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-600 italic">none</p>
      ) : (
        <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
          {items.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
