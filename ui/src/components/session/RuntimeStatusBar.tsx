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

const toneStyles: Record<StatusTone, string> = {
  blue: 'border-blue-500/20 bg-blue-500/5',
  green: 'border-emerald-500/20 bg-emerald-500/5',
  yellow: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-100', // El texto base se ajustará abajo
  red: 'border-red-500/20 bg-red-500/5',
  slate: 'border-zinc-800/60 bg-zinc-900/40',
};

export function RuntimeStatusBar({ session }: RuntimeStatusBarProps) {
  const status = session?.status ?? 'no_session';
  const friendlyStatus = getFriendlyStatus(status);

  return (
    <section
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border shadow-sm transition-colors ${toneStyles[friendlyStatus.tone]}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`mt-0.5 shrink-0 ${
            friendlyStatus.tone === 'red'
              ? 'text-red-400'
              : friendlyStatus.tone === 'green'
                ? 'text-emerald-400'
                : friendlyStatus.tone === 'yellow'
                  ? 'text-yellow-400'
                  : friendlyStatus.tone === 'blue'
                    ? 'text-blue-400'
                    : 'text-zinc-500'
          }`}
        >
          <StatusIcon status={status} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity
              size={12}
              className={friendlyStatus.tone === 'slate' ? 'text-zinc-500' : ''}
            />
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                friendlyStatus.tone === 'red'
                  ? 'text-red-500/80'
                  : friendlyStatus.tone === 'green'
                    ? 'text-emerald-500/80'
                    : friendlyStatus.tone === 'yellow'
                      ? 'text-yellow-500/80'
                      : friendlyStatus.tone === 'blue'
                        ? 'text-blue-500/80'
                        : 'text-zinc-500'
              }`}
            >
              Runtime session
            </span>
            <Badge tone={friendlyStatus.tone}>{friendlyStatus.label}</Badge>
          </div>

          <strong className="block text-sm font-semibold text-zinc-100">
            {friendlyStatus.title}
          </strong>
          <p
            className={`text-xs mt-0.5 ${friendlyStatus.tone === 'slate' ? 'text-zinc-400' : 'text-zinc-300'}`}
          >
            {friendlyStatus.description}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Target size={14} className="text-zinc-500" />
          <span>Goal set: {session ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <FolderGit2 size={14} className="text-zinc-500" />
          <span>Workspace locked: {session ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </section>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'no_session') {
    return <Clock size={20} />;
  }

  if (status === 'active' || status === 'running') {
    return <Activity size={20} className="animate-pulse" />;
  }

  if (status === 'waiting_user_input' || status === 'waiting_approval' || status === 'paused') {
    return <PauseCircle size={20} />;
  }

  if (status === 'completed') {
    return <CheckCircle2 size={20} />;
  }

  return <XCircle size={20} />;
}

// --- LOGICA ORIGINAL MANTENIDA ---
function getFriendlyStatus(status: string): FriendlyStatus {
  if (status === 'active') {
    return {
      label: 'active',
      title: 'Session is active',
      description: 'Zero is listening to your commands and managing the runtime context.',
      tone: 'blue',
    };
  }

  if (status === 'running') {
    return {
      label: 'running',
      title: 'Runtime task in progress',
      description: 'Zero is analyzing, planning or executing a task. Please wait.',
      tone: 'green',
    };
  }

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
      description: 'Start a session to let Zero prepare a safe runtime boundary for your project.',
      tone: 'slate',
    };
  }

  return {
    label: 'unknown',
    title: 'Unknown state',
    description: `Runtime is in an unrecognized state: ${status}`,
    tone: 'slate',
  };
}
