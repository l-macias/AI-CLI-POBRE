import type { DiffLineViewModel } from './DiffTypes';

interface DiffLineProps {
  line: DiffLineViewModel;
}

export function DiffLine({ line }: DiffLineProps) {
  return (
    <div className={`diff-line diff-line-${line.type}`}>
      <span className="diff-line-number">{line.oldLineNumber ?? ''}</span>
      <span className="diff-line-number">{line.newLineNumber ?? ''}</span>
      <span className="diff-line-prefix">{prefixForType(line.type)}</span>
      <code>{line.content}</code>
    </div>
  );
}

function prefixForType(type: DiffLineViewModel['type']): string {
  if (type === 'added') {
    return '+';
  }

  if (type === 'removed') {
    return '-';
  }

  return ' ';
}
