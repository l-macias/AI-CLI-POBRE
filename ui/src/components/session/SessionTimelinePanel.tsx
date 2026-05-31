import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';

interface SessionTimelinePanelProps {
  session: InteractiveSessionState | null;
}

export function SessionTimelinePanel({ session }: SessionTimelinePanelProps) {
  const timeline = session?.timeline.slice().reverse() ?? [];
  const visibleTimeline = timeline.slice(0, 12);

  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/50 bg-zinc-950/30 p-5 shadow-sm max-h-130 overflow-hidden">
      <div className="flex justify-between items-start gap-4 border-b border-zinc-800/50 pb-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Session timeline</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Recent evidence only. Full audit is available in the Audit tab.
          </p>
        </div>

        <Badge tone="slate" className="shrink-0">
          {session?.timeline.length ?? 0}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {visibleTimeline.length > 0 ? (
          <div className="relative flex flex-col gap-4 py-1 pl-2">
            <div className="absolute left-3.25 top-3 bottom-3 w-px bg-zinc-800/60" />

            {visibleTimeline.map((event, index) => (
              <article
                className="relative pl-6 flex flex-col gap-1"
                key={`${event.id}-${event.kind}-${event.createdAt}-${String(index)}`}
              >
                <div className="absolute left-1 top-1.5 h-2 w-2 rounded-full bg-zinc-600 ring-4 ring-zinc-950/50" />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-xs font-semibold text-zinc-300 capitalize">
                    {event.kind}
                  </strong>
                  <time className="text-[10px] text-zinc-600 font-mono">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </time>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
                  {event.message}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-40 text-center p-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-sm text-zinc-400">No timeline events yet.</p>
            <p className="mt-1 text-xs text-zinc-600">Runtime evidence will appear as you work.</p>
          </div>
        )}
      </div>
    </section>
  );
}
