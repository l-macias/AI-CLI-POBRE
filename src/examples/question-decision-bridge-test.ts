import { rm } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeQuestionDecisionMapper } from '../interactive/RuntimeQuestionDecisionMapper.js';
import { RuntimeQuestionEngine } from '../interactive/RuntimeQuestionEngine.js';
import { QuestionAnswerStore } from '../interactive/QuestionAnswerStore.js';
import { SessionDecisionStore } from '../interactive/SessionDecisionStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/question-decision-bridge-test');
const sessionId = 'session-81-i-test';

await rm(testRoot, {
  recursive: true,
  force: true,
});

const questionEngine = new RuntimeQuestionEngine();
const answerStore = new QuestionAnswerStore({
  rootDir: path.join(testRoot, 'questions'),
});
const decisionStore = new SessionDecisionStore({
  rootDir: path.join(testRoot, 'decisions'),
});
const mapper = new RuntimeQuestionDecisionMapper();

const generated = questionEngine.generate({
  objective: 'Mejorar login frontend y backend con auth y Prisma',
  projectRoot: 'C:/Users/LUCAS/Desktop/micafecito',
  projectName: 'micafecito',
  stack: ['react', 'express', 'typescript', 'pern', 'prisma'],
  workspaceMode: 'local_snapshot',
});

const scopeQuestion = generated.questions.find((question) => question.category === 'scope');

if (!scopeQuestion) {
  throw new Error('scope question should exist');
}

const answers = await answerStore.addAnswer({
  sessionId,
  questionId: scopeQuestion.id,
  answer: 'frontend',
});

const answer = answers.answers.find((candidate) => candidate.questionId === scopeQuestion.id);

if (!answer) {
  throw new Error('answer should exist');
}

const mapping = mapper.map({
  sessionId,
  question: scopeQuestion,
  answer,
});

const result = await decisionStore.add(mapping.decision);

assert(result.state.decisions.length === 1, 'should create one decision');
const firstDecision = result.state.decisions[0];

if (!firstDecision) {
  throw new Error('first decision should exist');
}

assert(firstDecision.statement.includes('No tocar backend'), 'decision should block backend');
assert(result.appliedContext.blockedScopes.includes('backend'), 'backend should be blocked');
assert(result.conflicts.length === 0, 'first decision should not conflict');

const databaseQuestion = generated.questions.find(
  (question) => question.category === 'architecture',
);

if (!databaseQuestion) {
  throw new Error('database question should exist');
}

const databaseAnswers = await answerStore.addAnswer({
  sessionId,
  questionId: databaseQuestion.id,
  answer: 'database_readonly',
});

const databaseAnswer = databaseAnswers.answers.find(
  (candidate) => candidate.questionId === databaseQuestion.id,
);

if (!databaseAnswer) {
  throw new Error('database answer should exist');
}

const databaseMapping = mapper.map({
  sessionId,
  question: databaseQuestion,
  answer: databaseAnswer,
});

const databaseResult = await decisionStore.add(databaseMapping.decision);

assert(
  databaseResult.appliedContext.blockedScopes.includes('database'),
  'database should be blocked',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'question-decision-bridge-test',
      answers: databaseAnswers.answers.length,
      decisions: databaseResult.state.decisions.map((decision) => ({
        category: decision.category,
        strength: decision.strength,
        statement: decision.statement,
      })),
      appliedContext: databaseResult.appliedContext,
    },
    null,
    2,
  ),
);
