import { Clock, FolderOpen } from 'lucide-react';
import { Badge } from '../Badge';
import type { InteractiveSessionState } from '../../types/runtime';

interface SessionResumeCardProps {
  session: InteractiveSessionState;
  selected: boolean;
  onResume: (session: InteractiveSessionState) => void;
}

export function SessionResumeCard({ session, selected, onResume }: SessionResumeCardProps) {
  return (
    <button
      className={`session-resume-card ${selected ? 'selected' : ''}`}
      onClick={() => onResume(session)}
    >
      <div className="session-resume-card-header">
        <div>
          <strong>{session.projectName}</strong>
          <p>{session.goal.current}</p>
        </div>

        <Badge tone={toneForStatus(session.status)}>{session.status}</Badge>
      </div>

      <div className="session-resume-meta">
        <span>
          <FolderOpen size={14} />
          {session.projectRoot}
        </span>

        <span>
          <Clock size={14} />
          {new Date(session.updatedAt).toLocaleString()}
        </span>
      </div>

      <div className="session-resume-counts">
        <Badge tone="blue">{session.messages.length} messages</Badge>
        <Badge tone="blue">{session.runtimeActions.length} actions</Badge>
        <Badge tone="slate">{session.timeline.length} events</Badge>
      </div>
    </button>
  );
}

function toneForStatus(status: InteractiveSessionState['status']) {
  if (status === 'completed') {
    return 'green';
  }

  if (status === 'failed') {
    return 'red';
  }

  if (status === 'paused' || status === 'waiting_user_input' || status === 'waiting_approval') {
    return 'yellow';
  }

  return 'blue';
}
