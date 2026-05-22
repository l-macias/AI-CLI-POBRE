import { Activity, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';

interface RuntimeStatusBarProps {
  session: InteractiveSessionState | null;
}

export function RuntimeStatusBar({ session }: RuntimeStatusBarProps) {
  const status = session?.status ?? 'no_session';

  return (
    <section className="session-status-bar">
      <div className="session-status-main">
        <StatusIcon status={status} />
        <div>
          <strong>{session ? session.projectName : 'No active session'}</strong>
          <p>{session ? session.goal.current : 'Start a session to control the runtime.'}</p>
        </div>
      </div>

      <div className="session-status-meta">
        <Badge tone={toneForStatus(status)}>{status}</Badge>
        {session ? <span>{session.id}</span> : null}
      </div>
    </section>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return <CheckCircle2 size={22} />;
  }

  if (status === 'failed') {
    return <XCircle size={22} />;
  }

  if (status === 'paused') {
    return <PauseCircle size={22} />;
  }

  if (status === 'waiting_user_input' || status === 'waiting_approval') {
    return <Clock size={22} />;
  }

  return <Activity size={22} />;
}

function toneForStatus(status: string): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'completed') {
    return 'green';
  }

  if (status === 'failed') {
    return 'red';
  }

  if (status === 'paused' || status === 'waiting_user_input' || status === 'waiting_approval') {
    return 'yellow';
  }

  if (status === 'no_session') {
    return 'slate';
  }

  return 'blue';
}
