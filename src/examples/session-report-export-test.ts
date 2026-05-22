import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { SessionReportBuilder } from '../reports/SessionReportBuilder.js';
import { ReportStorage } from '../reports/ReportStorage.js';
import type { InteractiveSessionState } from '../interactive/InteractiveSessionTypes.js';
import type { SessionDecisionState } from '../interactive/SessionDecision.js';
import type { SessionTaskQueueState } from '../tasks/SessionTask.js';
import type { VerifyRunResult } from '../verify/VerifyRunner.js';
import type { QuestionAnswerState } from '../interactive/QuestionAnswerStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/session-report-export-test');
const sessionId = 'session-79-test';
const now = new Date().toISOString();

await rm(testRoot, {
  recursive: true,
  force: true,
});

const session: InteractiveSessionState = {
  id: sessionId,
  projectRoot: 'C:/Users/LUCAS/Desktop/micafecito',
  projectName: 'micafecito',
  status: 'completed',
  goal: {
    original: 'Improve login',
    current: 'Improve login safely',
    updates: [],
  },
  messages: [
    {
      id: 'message-1',
      role: 'user',
      content: 'Mejorar login',
      createdAt: now,
    },
  ],
  decisions: [],
  runtimeActions: [
    {
      id: 'action-1',
      title: 'Plan proposed',
      description: 'Runtime proposed safe login improvement plan.',
      status: 'completed',
      createdAt: now,
      metadata: {},
    },
  ],
  timeline: [
    {
      id: 'timeline-1',
      kind: 'session_started',
      message: 'Session started.',
      createdAt: now,
      metadata: {},
    },
  ],
  createdAt: now,
  updatedAt: now,
};

const decisions: SessionDecisionState = {
  version: 1,
  sessionId,
  updatedAt: now,
  decisions: [
    {
      id: 'decision-1',
      sessionId,
      category: 'scope',
      strength: 'hard_rule',
      statement: 'No tocar backend en esta sesión',
      normalizedStatement: 'no tocar backend en esta sesion',
      source: 'user',
      createdAt: now,
    },
  ],
};
const questionAnswers: QuestionAnswerState = {
  version: 1,
  sessionId,
  updatedAt: now,
  answers: [
    {
      questionId: 'question-1',
      answer: 'frontend',
      answeredAt: now,
    },
  ],
};
const tasks: SessionTaskQueueState = {
  version: 1,
  sessionId,
  createdAt: now,
  updatedAt: now,
  tasks: [
    {
      id: 'task-1',
      sessionId,
      title: 'Review frontend login',
      description: 'Inspect frontend login form.',
      kind: 'inspect',
      status: 'completed',
      dependencies: [],
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      completedAt: now,
    },
  ],
};

const verifyRuns: VerifyRunResult[] = [
  {
    command: 'npm run build',
    cwd: 'C:/Users/LUCAS/Desktop/micafecito',
    status: 'executed',
    exitCode: 0,
    stdoutSummary: 'build ok',
    stderrSummary: '',
    issues: [],
    startedAt: now,
    completedAt: now,
    durationMs: 1200,
  },
];

const report = new SessionReportBuilder().build({
  session,
  decisions,
  questionAnswers,
  tasks,
  verifyRuns,
});

assert(report.sessionId === sessionId, 'report should use session id');
assert(report.summary.messages === 1, 'report should count messages');
assert(report.summary.decisions === 1, 'report should count decisions');
assert(report.summary.tasks === 1, 'report should count tasks');
assert(report.summary.verifyRuns === 1, 'report should count verify runs');
assert(report.summary.questionAnswers === 1, 'report should count question answers');
assert(report.questionAnswers[0]?.answer === 'frontend', 'report should include question answer');

const storage = new ReportStorage({
  rootDir: path.join(testRoot, 'reports'),
});

const saved = await storage.save(report);
const markdown = await readFile(saved.markdownPath, 'utf8');
const json = await readFile(saved.jsonPath, 'utf8');

assert(markdown.includes('# Zero Runtime Session Report'), 'markdown should include title');
assert(markdown.includes('No tocar backend'), 'markdown should include decision');
assert(json.includes('"sessionId": "session-79-test"'), 'json should include session id');
assert(markdown.includes('Question Answers'), 'markdown should include question answers section');
assert(markdown.includes('frontend'), 'markdown should include question answer value');
console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'session-report-export-test',
      report: {
        sessionId: report.sessionId,
        summary: report.summary,
      },
      files: {
        markdownPath: saved.markdownPath,
        jsonPath: saved.jsonPath,
      },
    },
    null,
    2,
  ),
);
