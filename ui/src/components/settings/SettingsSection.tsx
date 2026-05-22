interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="settings-section-body">{children}</div>
    </section>
  );
}
