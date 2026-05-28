import {
  Activity,
  CheckCircle2,
  Clock,
  FolderGit2,
  PauseCircle,
  Target,
  XCircle,
} from 'lucide-react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';

interface RuntimeStatusBarProps {
  session: InteractiveSessionState | null;
}

type StatusTone = 'blue' | 'green' | 'yellow' | 'red' | 'slate';

interface FriendlyStatus {
  label: string;
  title: string;
  description: string;
  tone: StatusTone;
}

export function RuntimeStatusBar({ session }: RuntimeStatusBarProps) {
  const status = session?.status ?? 'no_session';
  const friendlyStatus = getFriendlyStatus(status);

  return (
    <section
      className={`session-status-bar session-status-bar-friendly status-${friendlyStatus.tone}`}
    >
      <div className="session-status-main">
        <div className="session-status-icon-shell">
          <StatusIcon status={status} />
        </div>

        <div className="session-status-copy">
          <div className="session-status-kicker">
            <Activity size={15} />
            <span>Runtime session</span>
            <Badge tone={friendlyStatus.tone}>{friendlyStatus.label}</Badge>
          </div>

          <strong>{friendlyStatus.title}</strong>
          <p>{friendlyStatus.description}</p>
        </div>
      </div>

      <div className="session-status-context">
        <div className="session-status-context-card">
          <FolderGit2 size={16} />
          <div>
            <span>Project</span>
            <strong>{session ? session.projectName : 'No project session yet'}</strong>
          </div>
        </div>

        <div className="session-status-context-card">
          <Target size={16} />
          <div>
            <span>Goal</span>
            <strong>
              {session ? session.goal.current : 'Start a session to guide the workflow.'}
            </strong>
          </div>
        </div>

        {session ? (
          <div className="session-status-id">
            <span>Session ID</span>
            <code>{session.id}</code>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return <CheckCircle2 size={24} />;
  }

  if (status === 'failed') {
    return <XCircle size={24} />;
  }

  if (status === 'paused') {
    return <PauseCircle size={24} />;
  }

  if (status === 'waiting_user_input' || status === 'waiting_approval') {
    return <Clock size={24} />;
  }

  return <Activity size={24} />;
}

function getFriendlyStatus(status: string): FriendlyStatus {
  if (status === 'completed') {
    return {
      label: 'completed',
      title: 'Session completed',
      description:
        'The runtime finished this session. You can review artifacts or export evidence.',
      tone: 'green',
    };
  }

  if (status === 'failed') {
    return {
      label: 'failed',
      title: 'Session needs attention',
      description: 'Something failed. Review the guided workflow to see the next safe action.',
      tone: 'red',
    };
  }

  if (status === 'paused') {
    return {
      label: 'paused',
      title: 'Session paused',
      description: 'The workflow is paused. Resume only when you are ready to continue.',
      tone: 'yellow',
    };
  }

  if (status === 'waiting_user_input') {
    return {
      label: 'waiting',
      title: 'Waiting for your input',
      description: 'Zero needs a decision, answer or next command before it can continue.',
      tone: 'yellow',
    };
  }

  if (status === 'waiting_approval') {
    return {
      label: 'needs approval',
      title: 'Approval required',
      description:
        'Review the approval request before Zero continues with the next runtime action.',
      tone: 'yellow',
    };
  }

  if (status === 'no_session') {
    return {
      label: 'not started',
      title: 'No active session yet',
      description: 'Start a session to let Zero prepare a safe guided workflow.',
      tone: 'slate',
    };
  }

  return {
    label: 'active',
    title: 'Session active',
    description: 'Zero is ready to guide the next safe step.',
    tone: 'blue',
  };
}
