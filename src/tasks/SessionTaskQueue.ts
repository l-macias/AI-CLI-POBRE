import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import type { SessionTask, SessionTaskCreateInput, SessionTaskQueueState } from './SessionTask.js';
import { canTransitionTaskStatus, type TaskStatus } from './TaskStatus.js';
import { TaskDependencyResolver } from './TaskDependencyResolver.js';
import { TaskProgressReporter, type TaskProgressReport } from './TaskProgressReporter.js';

export interface SessionTaskQueueOptions {
  rootDir?: string | undefined;
  dependencyResolver?: TaskDependencyResolver | undefined;
  progressReporter?: TaskProgressReporter | undefined;
}

export class SessionTaskQueue {
  private readonly rootDir: string;
  private readonly dependencyResolver: TaskDependencyResolver;
  private readonly progressReporter: TaskProgressReporter;

  public constructor(options: SessionTaskQueueOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime/tasks');
    this.dependencyResolver = options.dependencyResolver ?? new TaskDependencyResolver();
    this.progressReporter = options.progressReporter ?? new TaskProgressReporter();
  }

  public async create(sessionId: string): Promise<SessionTaskQueueState> {
    const createdAt = new Date().toISOString();

    const state: SessionTaskQueueState = {
      version: 1,
      sessionId,
      tasks: [],
      createdAt,
      updatedAt: createdAt,
    };

    await this.save(state);

    return state;
  }

  public async addTask(
    sessionId: string,
    input: SessionTaskCreateInput,
  ): Promise<SessionTaskQueueState> {
    const state = await this.loadOrCreate(sessionId);
    const now = new Date().toISOString();

    const task: SessionTask = {
      id: this.createTaskId(input.title),
      sessionId,
      title: input.title,
      description: input.description,
      kind: input.kind ?? 'custom',
      status: 'pending',
      dependencies: input.dependencies ?? [],
      createdAt: now,
      updatedAt: now,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    const updated: SessionTaskQueueState = {
      ...state,
      tasks: [...state.tasks, task],
      updatedAt: now,
    };

    this.dependencyResolver.assertNoCircularDependencies(updated.tasks);

    await this.save(updated);

    return updated;
  }

  public async addTasks(
    sessionId: string,
    inputs: SessionTaskCreateInput[],
  ): Promise<SessionTaskQueueState> {
    let state = await this.loadOrCreate(sessionId);

    for (const input of inputs) {
      state = await this.addTask(sessionId, input);
    }

    return state;
  }

  public async transitionTask(input: {
    sessionId: string;
    taskId: string;
    status: TaskStatus;
    reason?: string | undefined;
  }): Promise<SessionTaskQueueState> {
    const state = await this.load(input.sessionId);
    const task = state.tasks.find((candidate) => candidate.id === input.taskId);

    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }

    if (!canTransitionTaskStatus({ from: task.status, to: input.status })) {
      throw new Error(`Invalid task transition: ${task.status} -> ${input.status}`);
    }

    if (input.status === 'in_progress') {
      const resolution = this.dependencyResolver.resolve(task, state.tasks);

      if (!resolution.ready) {
        throw new Error(
          `Task dependencies are not ready: missing=${resolution.missingDependencies.join(
            ',',
          )}; incomplete=${resolution.incompleteDependencies.join(',')}`,
        );
      }
    }

    const now = new Date().toISOString();

    const updatedTasks = state.tasks.map((candidate): SessionTask => {
      if (candidate.id !== input.taskId) {
        return candidate;
      }

      return {
        ...candidate,
        status: input.status,
        updatedAt: now,
        ...(input.status === 'in_progress' && !candidate.startedAt ? { startedAt: now } : {}),
        ...(input.status === 'completed' ||
        input.status === 'blocked' ||
        input.status === 'cancelled'
          ? { completedAt: now }
          : {}),
        ...(input.status === 'blocked' && input.reason ? { blockedReason: input.reason } : {}),
      };
    });

    const updated: SessionTaskQueueState = {
      ...state,
      tasks: updatedTasks,
      updatedAt: now,
    };

    await this.save(updated);

    return updated;
  }

  public async nextReadyTask(sessionId: string): Promise<SessionTask | null> {
    const state = await this.load(sessionId);

    return this.dependencyResolver.findReadyTasks(state.tasks)[0] ?? null;
  }

  public async progress(sessionId: string): Promise<TaskProgressReport> {
    return this.progressReporter.report(await this.load(sessionId));
  }

  public async loadOrCreate(sessionId: string): Promise<SessionTaskQueueState> {
    try {
      return await this.load(sessionId);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return this.create(sessionId);
      }

      throw error;
    }
  }

  public async load(sessionId: string): Promise<SessionTaskQueueState> {
    const filePath = this.resolvePath(sessionId);
    const raw = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!this.isState(parsed)) {
      throw new Error(`Invalid task queue state: ${filePath}`);
    }

    return parsed;
  }

  public resolvePath(sessionId: string): string {
    return path.join(this.rootDir, sessionId, 'tasks.json');
  }

  private async save(state: SessionTaskQueueState): Promise<void> {
    const filePath = this.resolvePath(state.sessionId);

    await mkdir(dirname(filePath), {
      recursive: true,
    });

    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  private createTaskId(title: string): string {
    const slug = title
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');

    return `task-${slug || 'runtime'}-${timestamp}`;
  }

  private isState(value: unknown): value is SessionTaskQueueState {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      typeof value['sessionId'] === 'string' &&
      Array.isArray(value['tasks']) &&
      value['tasks'].every((task) => this.isTask(task)) &&
      typeof value['createdAt'] === 'string' &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isTask(value: unknown): value is SessionTask {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['id'] === 'string' &&
      typeof value['sessionId'] === 'string' &&
      typeof value['title'] === 'string' &&
      typeof value['description'] === 'string' &&
      typeof value['kind'] === 'string' &&
      typeof value['status'] === 'string' &&
      Array.isArray(value['dependencies']) &&
      value['dependencies'].every((dependency) => typeof dependency === 'string') &&
      typeof value['createdAt'] === 'string' &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
