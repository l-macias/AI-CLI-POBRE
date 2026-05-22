import { rm } from 'node:fs/promises';
import path from 'node:path';
import { QuestionAnswerStore } from '../interactive/QuestionAnswerStore.js';
import { RuntimeQuestionEngine } from '../interactive/RuntimeQuestionEngine.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const engine = new RuntimeQuestionEngine();

const result = engine.generate({
  objective: 'Mejorar login fullstack tocando auth frontend, backend y Prisma',
  projectRoot: 'C:/Users/LUCAS/Desktop/micafecito',
  projectName: 'micafecito',
  stack: ['react', 'express', 'postgresql', 'prisma', 'pern', 'typescript'],
  runtimeActions: [
    {
      title: 'Review auth middleware',
      description: 'Potential database and token changes.',
      status: 'pending',
    },
  ],
});

assert(result.questions.length >= 4, 'should generate relevant questions');

assert(
  result.questions.some((question) => question.category === 'scope'),
  'should ask scope question',
);

assert(
  result.questions.some((question) => question.category === 'architecture'),
  'should ask database boundary question',
);

assert(
  result.questions.some((question) => question.category === 'security'),
  'should ask security question',
);

assert(result.questions[0]?.priority === 'high', 'high priority questions should come first');

const testRoot = path.resolve('.runtime/runtime-question-engine-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

const store = new QuestionAnswerStore({
  rootDir: path.join(testRoot, 'questions'),
});

const firstQuestion = result.questions[0];

if (!firstQuestion) {
  throw new Error('first question should exist');
}

const firstOption = firstQuestion.options[0];

const saved = await store.addAnswer({
  sessionId: 'session-71-test',
  questionId: firstQuestion.id,
  answer: firstOption?.value ?? 'confirmed',
});

assert(saved.answers.length === 1, 'should save one answer');

const loaded = await store.load('session-71-test');

assert(loaded.answers.length === 1, 'should load saved answer');
assert(loaded.answers[0]?.questionId === firstQuestion.id, 'loaded answer should match question');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-question-engine-test',
      questionCount: result.questions.length,
      questions: result.questions.map((question) => ({
        priority: question.priority,
        category: question.category,
        question: question.question,
      })),
      answerStorePath: store.resolvePath('session-71-test'),
    },
    null,
    2,
  ),
);
