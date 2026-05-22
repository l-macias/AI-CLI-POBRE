import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../Badge';
import type { ApprovalChecklistItem } from './ApprovalTypes';

interface ApprovalChecklistProps {
  items: ApprovalChecklistItem[];
}

export function ApprovalChecklist({ items }: ApprovalChecklistProps) {
  return (
    <section className="approval-checklist">
      {items.map((item) => (
        <article className="approval-checklist-item" key={item.id}>
          <div className="approval-checklist-icon">
            <ChecklistIcon status={item.status} />
          </div>

          <div>
            <strong>{item.label}</strong>
            <p>{item.description}</p>
          </div>

          <Badge tone={toneForStatus(item.status)}>{item.status}</Badge>
        </article>
      ))}
    </section>
  );
}

function ChecklistIcon({ status }: { status: ApprovalChecklistItem['status'] }) {
  if (status === 'passed') {
    return <CheckCircle2 size={18} />;
  }

  if (status === 'blocked') {
    return <XCircle size={18} />;
  }

  return <AlertTriangle size={18} />;
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
