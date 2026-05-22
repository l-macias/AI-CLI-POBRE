import type { SessionTask } from './SessionTask.js';

export interface TaskDependencyResolution {
  taskId: string;
  ready: boolean;
  missingDependencies: string[];
  incompleteDependencies: string[];
}

export class TaskDependencyResolver {
  public resolve(task: SessionTask, tasks: readonly SessionTask[]): TaskDependencyResolution {
    const missingDependencies: string[] = [];
    const incompleteDependencies: string[] = [];

    for (const dependencyId of task.dependencies) {
      const dependency = tasks.find((candidate) => candidate.id === dependencyId);

      if (!dependency) {
        missingDependencies.push(dependencyId);
        continue;
      }

      if (dependency.status !== 'completed') {
        incompleteDependencies.push(dependencyId);
      }
    }

    return {
      taskId: task.id,
      ready: missingDependencies.length === 0 && incompleteDependencies.length === 0,
      missingDependencies,
      incompleteDependencies,
    };
  }

  public findReadyTasks(tasks: readonly SessionTask[]): SessionTask[] {
    return tasks.filter((task) => {
      if (task.status !== 'pending') {
        return false;
      }

      return this.resolve(task, tasks).ready;
    });
  }

  public assertNoCircularDependencies(tasks: readonly SessionTask[]): void {
    const graph = new Map<string, string[]>();

    for (const task of tasks) {
      graph.set(task.id, task.dependencies);
    }

    for (const task of tasks) {
      this.visit({
        taskId: task.id,
        graph,
        visiting: new Set<string>(),
        visited: new Set<string>(),
      });
    }
  }

  private visit(input: {
    taskId: string;
    graph: Map<string, string[]>;
    visiting: Set<string>;
    visited: Set<string>;
  }): void {
    if (input.visited.has(input.taskId)) {
      return;
    }

    if (input.visiting.has(input.taskId)) {
      throw new Error(`Circular task dependency detected at task: ${input.taskId}`);
    }

    input.visiting.add(input.taskId);

    for (const dependencyId of input.graph.get(input.taskId) ?? []) {
      if (!input.graph.has(dependencyId)) {
        continue;
      }

      this.visit({
        taskId: dependencyId,
        graph: input.graph,
        visiting: input.visiting,
        visited: input.visited,
      });
    }

    input.visiting.delete(input.taskId);
    input.visited.add(input.taskId);
  }
}
