import type { JsonObject } from '../types/SharedTypes.js';
import type { QuestionPriority } from './QuestionPriority.js';

export type RuntimeQuestionCategory =
  | 'scope'
  | 'permission'
  | 'workspace'
  | 'architecture'
  | 'security'
  | 'verification';

export type RuntimeQuestionAnswerKind = 'single_choice' | 'free_text' | 'confirm';

export interface RuntimeQuestionOption {
  id: string;
  label: string;
  value: string;
  description?: string | undefined;
}

export interface RuntimeQuestion {
  id: string;
  category: RuntimeQuestionCategory;
  priority: QuestionPriority;
  question: string;
  reason: string;
  answerKind: RuntimeQuestionAnswerKind;
  options: RuntimeQuestionOption[];
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface RuntimeQuestionInput {
  objective: string;
  projectRoot: string;
  projectName?: string | undefined;
  stack?: string[] | undefined;
  workspaceMode?: string | undefined;
  runtimeActions?: {
    title: string;
    description: string;
    status: string;
  }[];
  knownDecisions?: string[] | undefined;
}

export interface RuntimeQuestionAnswer {
  questionId: string;
  answer: string;
  answeredAt: string;
  metadata?: JsonObject | undefined;
}

export interface RuntimeQuestionEngineResult {
  questions: RuntimeQuestion[];
  generatedAt: string;
}
