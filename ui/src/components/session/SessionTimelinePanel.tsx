import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';

interface SessionTimelinePanelProps {
  session: InteractiveSessionState | null;
}

export function SessionTimelinePanel({ session }: SessionTimelinePanelProps) {
  const timeline = session?.timeline.slice().reverse() ?? [];

  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm h-full max-h-[800px] overflow-hidden">
      <div className="flex justify-between items-start gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Session timeline</h2>
        <Badge tone="blue" className="shrink-0">
          {session?.timeline.length ?? 0}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {timeline.length > 0 ? (
          <div className="relative flex flex-col gap-5 py-2 pl-2">
            {/* Línea decorativa del timeline */}
            <div className="absolute left-[13px] top-4 bottom-4 w-px bg-zinc-800/60"></div>

            {timeline.map((event, index) => (
              <article
                className="relative pl-6 flex flex-col gap-1"
                key={`${event.id}-${event.kind}-${event.createdAt}-${String(index)}`}
              >
                {/* Punto indicador */}
                <div className="absolute left-1 top-1.5 w-2 h-2 rounded-full bg-zinc-600 ring-4 ring-zinc-900/40"></div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-semibold text-zinc-200 capitalize">
                    {event.kind}
                  </strong>
                  <time className="text-[10px] text-zinc-500 font-mono">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </time>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-800/40 mt-1">
                  {event.message}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-sm text-zinc-400">No timeline events yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
