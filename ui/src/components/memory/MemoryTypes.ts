import type {
  AppliedDecisionContext,
  DecisionConflict,
  ProjectKnownFileMemory,
  ProjectMemoryDocument,
  ProjectMemoryEntry,
  ProjectMemoryEntryKind,
  ProjectMemoryImportance,
  SessionDecision,
  SessionDecisionCategory,
  SessionDecisionStrength,
  SessionMemoryView,
} from '../../types/runtime';

export type {
  AppliedDecisionContext,
  DecisionConflict,
  ProjectKnownFileMemory,
  ProjectMemoryDocument,
  ProjectMemoryEntry,
  ProjectMemoryEntryKind,
  ProjectMemoryImportance,
  SessionDecision,
  SessionDecisionCategory,
  SessionDecisionStrength,
  SessionMemoryView,
};

export interface SessionMemoryDecisionDraft {
  category: SessionDecisionCategory;
  strength: SessionDecisionStrength;
  statement: string;
}
