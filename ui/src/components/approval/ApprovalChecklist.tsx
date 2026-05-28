import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../Badge';
import type { ApprovalChecklistItem } from './ApprovalTypes';

interface ApprovalChecklistProps {
  items: ApprovalChecklistItem[];
}

export function ApprovalChecklist({ items }: ApprovalChecklistProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 mt-5">
      {items.map((item) => (
        <article
          className="flex items-start gap-4 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50"
          key={item.id}
        >
          <div className="mt-0.5 flex-shrink-0">
            <ChecklistIcon status={item.status} />
          </div>

          <div className="flex-1">
            <strong className="block text-sm font-medium text-zinc-200">{item.label}</strong>
            <p className="mt-1 text-xs text-zinc-400">{item.description}</p>
          </div>

          <Badge tone={toneForStatus(item.status)}>{item.status}</Badge>
        </article>
      ))}
    </section>
  );
}

function ChecklistIcon({ status }: { status: ApprovalChecklistItem['status'] }) {
  if (status === 'passed') {
    return <CheckCircle2 size={18} className="text-emerald-400" />;
  }

  if (status === 'blocked') {
    return <XCircle size={18} className="text-red-400" />;
  }

  return <AlertTriangle size={18} className="text-yellow-400" />;
}

function toneForStatus(
  status: ApprovalChecklistItem['status'],
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'passed') {
    return 'green';
  }

  if (status === 'blocked') {
    return 'red';
  }

  return 'yellow';
}
