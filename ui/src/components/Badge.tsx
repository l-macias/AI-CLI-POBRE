interface BadgeProps {
  children: React.ReactNode;
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'slate';
}

export function Badge({ children, tone = 'slate' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
