export type SnapshotFileStatus = 'captured' | 'missing' | 'restored' | 'failed';

export interface SnapshotManifestFile {
  targetFile: string;
  beforePath: string;
  afterPath?: string | undefined;
  existedBefore: boolean;
  status: SnapshotFileStatus;
  createdAt: string;
  restoredAt?: string | undefined;
}

export interface SnapshotManifest {
  version: 1;
  snapshotId: string;
  sessionId: string;
  projectRoot: string;
  snapshotRoot: string;
  beforeDir: string;
  afterDir: string;
  rollbackPatchPath: string;
  files: SnapshotManifestFile[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalSnapshotCreateInput {
  projectRoot: string;
  sessionId: string;
  targetFiles: string[];
}

export interface LocalSnapshotCreateResult {
  manifest: SnapshotManifest;
  manifestPath: string;
}

export interface SnapshotIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}
