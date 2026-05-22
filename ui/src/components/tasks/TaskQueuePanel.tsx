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
    <section className="panel integration-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <ListTodo size={18} />
          <div>
            <h2>Task Queue</h2>
            <p className="muted">Multi-step work inside the current session.</p>
          </div>
        </div>

        <div className="integration-actions">
          <button className="secondary-button" onClick={onRefresh}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={onCreateDefaultTasks}>Create default tasks</button>
        </div>
      </div>

      {progress ? (
        <div className="task-progress-bar">
          <div>
            <strong>{Math.round(progress.completionRatio * 100)}%</strong>
            <span>
              {progress.completed}/{progress.total} completed
            </span>
          </div>
          <progress max={1} value={progress.completionRatio} />
        </div>
      ) : null}

      <div className="integration-list">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <article className="integration-card" key={task.id}>
              <div className="integration-card-header">
                <strong>{task.title}</strong>
                <div className="suggestion-badges">
                  <Badge tone="blue">{task.kind}</Badge>
                  <Badge tone={toneForTask(task.status)}>{task.status}</Badge>
                </div>
              </div>

              <p>{task.description}</p>

              <div className="question-options">
                <button
                  className="secondary-button"
                  disabled={task.status !== 'pending'}
                  onClick={() => onTransition(task.id, 'in_progress')}
                >
                  Start
                </button>
                <button
                  className="secondary-button"
                  disabled={task.status !== 'in_progress'}
                  onClick={() => onTransition(task.id, 'completed')}
                >
                  Complete
                </button>
                <button
                  className="danger-button"
                  disabled={task.status === 'completed' || task.status === 'cancelled'}
                  onClick={() => onTransition(task.id, 'cancelled')}
                >
                  Cancel
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="muted">No tasks yet.</p>
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
