import type { JsonObject } from '../types/SharedTypes.js';

export type SessionDecisionCategory =
  | 'scope'
  | 'coding_style'
  | 'workspace'
  | 'permission'
  | 'architecture'
  | 'security'
  | 'workflow';

export type SessionDecisionStrength = 'preference' | 'constraint' | 'hard_rule';

export interface SessionDecision {
  id: string;
  sessionId: string;
  category: SessionDecisionCategory;
  strength: SessionDecisionStrength;
  statement: string;
  normalizedStatement: string;
  source: 'user' | 'runtime' | 'system';
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface SessionDecisionCreateInput {
  sessionId: string;
  category: SessionDecisionCategory;
  strength: SessionDecisionStrength;
  statement: string;
  source?: 'user' | 'runtime' | 'system' | undefined;
  metadata?: JsonObject | undefined;
}

export interface SessionDecisionState {
  version: 1;
  sessionId: string;
  decisions: SessionDecision[];
  updatedAt: string;
}

export interface AppliedDecisionContext {
  sessionId: string;
  blockedScopes: string[];
  allowedScopes: string[];
  blockedPathPatterns: string[];
  allowedPathPatterns: string[];
  codingRules: string[];
  workspaceMode?: string | undefined;
  requiresApproval: boolean;
  securityStrict: boolean;
  notes: string[];
}
