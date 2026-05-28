import type { DiffLineViewModel } from './DiffTypes';

interface DiffLineProps {
  line: DiffLineViewModel;
}

export function DiffLine({ line }: DiffLineProps) {
  let lineClass = 'text-zinc-400 hover:bg-zinc-900/50';
  let prefixClass = 'text-zinc-500';

  if (line.type === 'added') {
    lineClass = 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20';
    prefixClass = 'text-emerald-500';
  } else if (line.type === 'removed') {
    lineClass = 'bg-red-500/10 text-red-300 hover:bg-red-500/20';
    prefixClass = 'text-red-500';
  }

  return (
    <div className={`flex w-full font-mono text-xs leading-relaxed transition-colors ${lineClass}`}>
      <span className="w-10 shrink-0 select-none text-right pr-2 py-0.5 text-zinc-500 border-r border-zinc-800/60 bg-zinc-950">
        {line.oldLineNumber ?? ''}
      </span>
      <span className="w-10 shrink-0 select-none text-right pr-2 py-0.5 text-zinc-500 border-r border-zinc-800/60 bg-zinc-950">
        {line.newLineNumber ?? ''}
      </span>
      <span className={`w-6 shrink-0 select-none text-center py-0.5 font-bold ${prefixClass}`}>
        {prefixForType(line.type)}
      </span>
      <code className="flex-1 py-0.5 whitespace-pre px-2 break-all">{line.content}</code>
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
