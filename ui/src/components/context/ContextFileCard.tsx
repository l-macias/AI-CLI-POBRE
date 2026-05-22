import { FileCode2, Lock, ShieldAlert } from 'lucide-react';
import { ContextReasonBadge } from './ContextReasonBadge';

export interface ContextFileItem {
  path: string;
  reason: string;
  status: 'selected' | 'related' | 'blocked' | 'protected';
  risk: 'low' | 'medium' | 'high';
}

interface ContextFileCardProps {
  file: ContextFileItem;
}

export function ContextFileCard({ file }: ContextFileCardProps) {
  const blocked = file.status === 'blocked' || file.status === 'protected';

  return (
    <article className={`context-file-card ${blocked ? 'context-file-card-blocked' : ''}`}>
      <div className="context-file-icon">
        {blocked ? <Lock size={18} /> : <FileCode2 size={18} />}
      </div>

      <div className="context-file-content">
        <strong>{file.path}</strong>

        <div className="context-file-meta">
          <ContextReasonBadge reason={file.reason} />
          <ContextReasonBadge reason={file.status} />
          <ContextReasonBadge reason={`risk: ${file.risk}`} />
        </div>
      </div>

      {blocked ? <ShieldAlert className="context-warning-icon" size={18} /> : null}
    </article>
  );
}
