import { ListTodo } from 'lucide-react';
import type { SessionTask, TaskProgressReport } from '../../types/runtime';
import { Badge } from '../Badge';

interface TaskQueuePanelProps {
  tasks: SessionTask[];
  progress: TaskProgressReport | null;
  loading: boolean;
  onRefresh: () => void;
  onCreateDefaultTasks: () => void;
  onTransition: (taskId: string, status: SessionTask['status']) => void;
}

export function TaskQueuePanel({
  tasks,
  progress,
  loading,
  onRefresh,
  onCreateDefaultTasks,
  onTransition,
}: TaskQueuePanelProps) {
  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <ListTodo size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Task Queue</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Multi-step work inside the current session.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
            onClick={onRefresh}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            onClick={onCreateDefaultTasks}
          >
            Create default tasks
          </button>
        </div>
      </div>

      {progress ? (
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between text-xs font-medium text-zinc-400">
            <strong>{Math.round(progress.completionRatio * 100)}%</strong>
            <span>
              {progress.completed}/{progress.total} completed
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${progress.completionRatio * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <article
              className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
              key={task.id}
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm font-semibold text-zinc-200">{task.title}</strong>
                <div className="flex gap-2">
                  <Badge tone="blue">{task.kind}</Badge>
                  <Badge tone={toneForTask(task.status)}>{task.status}</Badge>
                </div>
              </div>

              <p className="text-sm text-zinc-400">{task.description}</p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-emerald-600 hover:text-white transition-colors disabled:opacity-50"
                  disabled={task.status !== 'pending'}
                  onClick={() => onTransition(task.id, 'in_progress')}
                >
                  Start
                </button>
                <button
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-50"
                  disabled={task.status !== 'in_progress'}
                  onClick={() => onTransition(task.id, 'completed')}
                >
                  Complete
                </button>
                <button
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                  disabled={task.status === 'completed' || task.status === 'cancelled'}
                  onClick={() => onTransition(task.id, 'cancelled')}
                >
                  Cancel
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-zinc-500 italic">No tasks yet.</p>
        )}
      </div>
    </section>
  );
}

function toneForTask(status: SessionTask['status']): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'completed') return 'green';
  if (status === 'blocked' || status === 'cancelled') return 'red';
  if (status === 'in_progress') return 'blue';
  if (status === 'waiting_user') return 'yellow';
  return 'slate';
}
