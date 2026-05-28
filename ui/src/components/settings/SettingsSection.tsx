interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-zinc-800/60 pb-4">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">{title}</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}
