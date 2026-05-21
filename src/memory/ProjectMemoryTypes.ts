import type { JsonObject } from '../types/SharedTypes.js';

export type ProjectMemoryEntryKind =
  | 'fact'
  | 'decision'
  | 'constraint'
  | 'session_note'
  | 'known_file';

export type ProjectMemoryImportance = 'critical' | 'high' | 'medium' | 'low';

export type ProjectMemoryTrustLevel =
  | 'user-approved'
  | 'runtime-generated'
  | 'provider-suggested'
  | 'quarantined';

export interface ProjectMemoryEntry {
  id: string;
  kind: ProjectMemoryEntryKind;
  title: string;
  content: string;
  importance: ProjectMemoryImportance;
  trustLevel: ProjectMemoryTrustLevel;
  tags: string[];
  source?: string | undefined;
  metadata?: JsonObject | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectKnownFileMemory {
  path: string;
  summary: string;
  importance: ProjectMemoryImportance;
  trustLevel: ProjectMemoryTrustLevel;
  tags: string[];
  lastSeenAt: string;
  metadata?: JsonObject | undefined;
}

export interface ProjectMemoryDocument {
  version: 1;
  projectName: string;
  projectRoot: string;
  entries: ProjectMemoryEntry[];
  knownFiles: ProjectKnownFileMemory[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemoryStoreOptions {
  projectRoot: string;
  projectName?: string | undefined;
  fileName?: string | undefined;
}

export interface ProjectMemoryAppendInput {
  kind: ProjectMemoryEntryKind;
  title: string;
  content: string;
  importance?: ProjectMemoryImportance | undefined;
  trustLevel?: ProjectMemoryTrustLevel | undefined;
  tags?: string[] | undefined;
  source?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface ProjectMemoryKnownFileInput {
  path: string;
  summary: string;
  importance?: ProjectMemoryImportance | undefined;
  trustLevel?: ProjectMemoryTrustLevel | undefined;
  tags?: string[] | undefined;
  metadata?: JsonObject | undefined;
}

export interface ProjectMemoryQueryInput {
  kinds?: ProjectMemoryEntryKind[] | undefined;
  tags?: string[] | undefined;
  trustLevels?: ProjectMemoryTrustLevel[] | undefined;
  minImportance?: ProjectMemoryImportance | undefined;
  limit?: number | undefined;
}

export interface ProjectMemoryQueryResult {
  entries: ProjectMemoryEntry[];
  knownFiles: ProjectKnownFileMemory[];
}
