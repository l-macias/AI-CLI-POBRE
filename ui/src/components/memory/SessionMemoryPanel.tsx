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
    <section className="panel session-memory-panel">
      <div className="panel-header">
        <div>
          <h2>
            <Brain size={20} />
            Session Memory
          </h2>
          <p className="muted">Session decisions, applied runtime context and project memory.</p>
        </div>

        <div className="memory-badge-row">
          <Badge tone={memory ? 'green' : 'slate'}>{memory ? 'loaded' : 'idle'}</Badge>
          <button className="secondary-button" disabled={disabled || loading} onClick={onRefresh}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <section className="memory-decision-form">
        <div className="memory-form-grid">
          <label>
            Category
            <select
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

          <label>
            Strength
            <select
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

        <label>
          Decision
          <textarea
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

        <button disabled={disabled || draft.statement.trim().length === 0} onClick={submitDecision}>
          <Plus size={16} />
          Add decision
        </button>
      </section>

      {!memory ? (
        <article className="memory-empty-state">
          <ShieldCheck size={22} />
          <div>
            <strong>No session memory loaded.</strong>
            <p>Start a session or refresh memory to inspect runtime decisions.</p>
          </div>
        </article>
      ) : (
        <div className="memory-grid">
          <section className="memory-column">
            <h3>Applied context</h3>

            <article className="memory-context-card">
              <MemoryList title="Blocked scopes" items={memory.appliedContext.blockedScopes} />
              <MemoryList title="Allowed scopes" items={memory.appliedContext.allowedScopes} />
              <MemoryList title="Coding rules" items={memory.appliedContext.codingRules} />
              <MemoryList title="Notes" items={memory.appliedContext.notes} />

              <div className="memory-badge-row">
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

            <h3>Conflicts</h3>

            {memory.conflicts.length === 0 ? (
              <p className="muted">No decision conflicts.</p>
            ) : (
              memory.conflicts.map((conflict) => (
                <DecisionConflictCard key={conflict.id} conflict={conflict} />
              ))
            )}
          </section>

          <section className="memory-column">
            <h3>Session decisions</h3>

            {memory.sessionDecisions.decisions.length === 0 ? (
              <p className="muted">No session decisions yet.</p>
            ) : (
              memory.sessionDecisions.decisions.map((decision) => (
                <SessionDecisionCard key={decision.id} decision={decision} />
              ))
            )}
          </section>

          <section className="memory-column">
            <h3>Project memory</h3>

            {memory.projectMemory.entries.length === 0 ? (
              <p className="muted">No project memory entries.</p>
            ) : (
              memory.projectMemory.entries
                .slice(-8)
                .map((entry) => <MemoryFactCard key={entry.id} entry={entry} variant="entry" />)
            )}

            <h3>Known files</h3>

            {memory.projectMemory.knownFiles.length === 0 ? (
              <p className="muted">No known files recorded.</p>
            ) : (
              memory.projectMemory.knownFiles
                .slice(-8)
                .map((file) => <MemoryFactCard key={file.path} entry={file} variant="known-file" />)
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function MemoryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="memory-list-block">
      <strong>{title}</strong>

      {items.length === 0 ? (
        <p className="muted">none</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
