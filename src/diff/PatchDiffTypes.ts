import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

export type PatchDiffFileStatus = 'added' | 'modified' | 'deleted' | 'unchanged';

export interface PatchDiffLine {
  lineNumber: number;
  type: 'context' | 'added' | 'removed';
  content: string;
}

export interface PatchDiffFile {
  path: string;
  status: PatchDiffFileStatus;
  beforeHash: string | null;
  afterHash: string | null;
  additions: number;
  deletions: number;
  beforeContent: string | null;
  afterContent: string | null;
  lines: PatchDiffLine[];
}

export interface PatchDiffPreview {
  id: string;
  proposalId: string;
  planId: string;
  sessionId: string;
  projectRoot: string;
  files: PatchDiffFile[];
  summary: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
  safeToPreview: boolean;
  createdAt: string;
}

export interface PatchDiffBuildInput {
  proposal: RuntimePatchProposal;
}

export interface PatchDiffBuildResult {
  diff: PatchDiffPreview;
}
