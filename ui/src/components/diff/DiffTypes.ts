export type DiffFileStatus = 'created' | 'modified' | 'deleted';

export interface DiffLineViewModel {
  id: string;
  type: 'added' | 'removed' | 'context';
  oldLineNumber?: number | undefined;
  newLineNumber?: number | undefined;
  content: string;
}

export interface DiffFileViewModel {
  id: string;
  path: string;
  status: DiffFileStatus;
  riskLevel: 'low' | 'medium' | 'high';
  additions: number;
  removals: number;
  lines: DiffLineViewModel[];
}

export interface PatchDiffViewModel {
  id: string;
  title: string;
  summary: string;
  files: DiffFileViewModel[];
}
