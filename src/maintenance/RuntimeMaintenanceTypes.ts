export interface RuntimeDataInventoryOptions {
  runtimeRoot?: string | undefined;
}

export interface RuntimeDataInventoryCount {
  total: number;
  active: number;
  archived: number;
  suspectedTest: number;
}

export interface RuntimeDataInventoryDirectory {
  name: string;
  path: string;
  exists: boolean;
  fileCount: number;
  directoryCount: number;
  sizeBytes: number;
}

export interface RuntimeDataInventorySession {
  sessionId: string;
  status: 'active' | 'archived';
  suspectedTest: boolean;
  artifactCount: number;
  sizeBytes: number;
  updatedAt?: string;
}

export interface RuntimeDataInventoryReport {
  version: 1;
  runtimeRoot: string;
  generatedAt: string;
  totals: {
    files: number;
    directories: number;
    sizeBytes: number;
    sessions: RuntimeDataInventoryCount;
    artifacts: RuntimeDataInventoryCount;
  };
  directories: RuntimeDataInventoryDirectory[];
  sessions: RuntimeDataInventorySession[];
  recommendations: string[];
}
export interface RuntimeArchiveSessionInput {
  sessionIds: string[];
  dryRun?: boolean | undefined;
}

export interface RuntimeArchiveMovedPath {
  from: string;
  to: string;
  kind: 'file' | 'directory';
}

export interface RuntimeArchiveSessionResult {
  sessionId: string;
  archived: boolean;
  dryRun: boolean;
  moved: RuntimeArchiveMovedPath[];
  skipped: string[];
}

export interface RuntimeArchiveSessionsResult {
  version: 1;
  archivedAt: string;
  dryRun: boolean;
  results: RuntimeArchiveSessionResult[];
}
export interface RuntimeRestoreSessionInput {
  sessionIds: string[];
  dryRun?: boolean | undefined;
}

export interface RuntimeRestoreSessionResult {
  sessionId: string;
  restored: boolean;
  dryRun: boolean;
  moved: RuntimeArchiveMovedPath[];
  skipped: string[];
}

export interface RuntimeRestoreSessionsResult {
  version: 1;
  restoredAt: string;
  dryRun: boolean;
  results: RuntimeRestoreSessionResult[];
}
