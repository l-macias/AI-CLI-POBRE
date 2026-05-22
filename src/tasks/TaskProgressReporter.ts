import type { SessionTask, SessionTaskQueueState } from './SessionTask.js';

export interface TaskProgressReport {
  sessionId: string;
  total: number;
  pending: number;
  inProgress: number;
  waitingUser: number;
  blocked: number;
  completed: number;
  cancelled: number;
  completionRatio: number;
  nextTask?: SessionTask | undefined;
}

export class TaskProgressReporter {
  public report(state: SessionTaskQueueState): TaskProgressReport {
    const total = state.tasks.length;
    const completed = this.countByStatus(state.tasks, 'completed');

    return {
      sessionId: state.sessionId,
      total,
      pending: this.countByStatus(state.tasks, 'pending'),
      inProgress: this.countByStatus(state.tasks, 'in_progress'),
      waitingUser: this.countByStatus(state.tasks, 'waiting_user'),
      blocked: this.countByStatus(state.tasks, 'blocked'),
      completed,
      cancelled: this.countByStatus(state.tasks, 'cancelled'),
      completionRatio: total === 0 ? 0 : completed / total,
      nextTask: state.tasks.find((task) => task.status === 'pending'),
    };
  }

  private countByStatus(tasks: readonly SessionTask[], status: SessionTask['status']): number {
    return tasks.filter((task) => task.status === status).length;
  }
}
