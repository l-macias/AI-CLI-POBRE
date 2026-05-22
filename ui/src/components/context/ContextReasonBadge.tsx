import { Badge } from '../Badge';

interface ContextReasonBadgeProps {
  reason: string;
}

export function ContextReasonBadge({ reason }: ContextReasonBadgeProps) {
  const tone = reason.toLowerCase().includes('protected')
    ? 'red'
    : reason.toLowerCase().includes('related')
      ? 'blue'
      : reason.toLowerCase().includes('entry')
        ? 'green'
        : 'slate';

  return <Badge tone={tone}>{reason}</Badge>;
}
