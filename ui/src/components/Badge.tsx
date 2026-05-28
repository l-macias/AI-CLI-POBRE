interface BadgeProps {
  children: React.ReactNode;
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'slate' | 'indigo';
  className?: string;
}

const toneStyles = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  slate: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

export function Badge({ children, tone = 'slate', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
