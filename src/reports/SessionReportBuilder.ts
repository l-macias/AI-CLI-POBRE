import type { InteractiveSessionState } from '../interactive/InteractiveSessionTypes.js';
import type { SessionDecisionState } from '../interactive/SessionDecision.js';
import type { SessionTaskQueueState } from '../tasks/SessionTask.js';
import type { TaskProgressReport } from '../tasks/TaskProgressReporter.js';
import type { VerifyRunResult } from '../verify/VerifyRunner.js';
import type { QuestionAnswerState } from '../interactive/QuestionAnswerStore.js';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import type { PatchRecoveryLoopResult } from '../patches/PatchRecoveryLoop.js';

export interface SessionReportInput {
  session: InteractiveSessionState;
  decisions?: SessionDecisionState | undefined;
  questionAnswers?: QuestionAnswerState | undefined;
  tasks?: SessionTaskQueueState | undefined;
  taskProgress?: TaskProgressReport | undefined;
  verifyRuns?: VerifyRunResult[] | undefined;
  sandboxResults?: PatchSandboxResult[] | undefined;
  patchRecoveries?: PatchRecoveryLoopResult[] | undefined;
}

export interface SessionReport {
  version: 1;
  sessionId: string;
  projectName: string;
  projectRoot: string;
  status: string;
  goal: string;
  summary: {
    messages: number;
    runtimeActions: number;
    timelineEvents: number;
    decisions: number;
    questionAnswers: number;
    tasks: number;
    completedTasks: number;
    verifyRuns: number;
    failedVerifyRuns: number;
    sandboxResults: number;
    failedSandboxResults: number;
    patchRecoveries: number;
    recoveryAttempts: number;
  };
  messages: {
    role: string;
    content: string;
    createdAt: string;
  }[];
  runtimeActions: {
    title: string;
    description: string;
    status: string;
    createdAt: string;
  }[];
  timeline: {
    kind: string;
    message: string;
    createdAt: string;
  }[];
  decisions: {
    category: string;
    strength: string;
    statement: string;
    source: string;
    createdAt: string;
  }[];
  questionAnswers: {
    questionId: string;
    answer: string;
    answeredAt: string;
  }[];
  tasks: {
    id: string;
    title: string;
    description: string;
    kind: string;
    status: string;
    dependencies: string[];
    createdAt: string;
    updatedAt: string;
  }[];
  taskProgress?: TaskProgressReport | undefined;
  verifyRuns: VerifyRunResult[];
  sandboxResults: PatchSandboxResult[];
  patchRecoveries: PatchRecoveryLoopResult[];
  generatedAt: string;
}

export class SessionReportBuilder {
  public build(input: SessionReportInput): SessionReport {
    const verifyRuns = input.verifyRuns ?? [];
    const sandboxResults = input.sandboxResults ?? [];
    const patchRecoveries = input.patchRecoveries ?? [];
    const tasks = input.tasks?.tasks ?? [];
    const decisions = input.decisions?.decisions ?? [];
    const questionAnswers = input.questionAnswers?.answers ?? [];

    return {
      version: 1,
      sessionId: input.session.id,
      projectName: input.session.projectName,
      projectRoot: input.session.projectRoot,
      status: input.session.status,
      goal: input.session.goal.current,
      summary: {
        messages: input.session.messages.length,
        runtimeActions: input.session.runtimeActions.length,
        timelineEvents: input.session.timeline.length,
        decisions: decisions.length,
        questionAnswers: questionAnswers.length,
        tasks: tasks.length,
        completedTasks: tasks.filter((task) => task.status === 'completed').length,
        verifyRuns: verifyRuns.length,
        failedVerifyRuns: verifyRuns.filter(
          (run) => run.status !== 'executed' || run.exitCode !== 0,
        ).length,
        sandboxResults: sandboxResults.length,
        failedSandboxResults: sandboxResults.filter((result) => result.status !== 'passed').length,
        patchRecoveries: patchRecoveries.length,
        recoveryAttempts: patchRecoveries.reduce(
          (total, recovery) => total + recovery.attempts.length,
          0,
        ),
      },
      messages: input.session.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
      runtimeActions: input.session.runtimeActions.map((action) => ({
        title: action.title,
        description: action.description,
        status: action.status,
        createdAt: action.createdAt,
      })),
      timeline: input.session.timeline.map((event) => ({
        kind: event.kind,
        message: event.message,
        createdAt: event.createdAt,
      })),
      decisions: decisions.map((decision) => ({
        category: decision.category,
        strength: decision.strength,
        statement: decision.statement,
        source: decision.source,
        createdAt: decision.createdAt,
      })),
      questionAnswers: questionAnswers.map((answer) => ({
        questionId: answer.questionId,
        answer: answer.answer,
        answeredAt: answer.answeredAt,
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        kind: task.kind,
        status: task.status,
        dependencies: task.dependencies,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
      ...(input.taskProgress ? { taskProgress: input.taskProgress } : {}),
      verifyRuns,
      sandboxResults,
      patchRecoveries,
      generatedAt: new Date().toISOString(),
    };
  }
}
