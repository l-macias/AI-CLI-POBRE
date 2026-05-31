import type { RuntimeEvent } from '../types/runtime';
import { Badge } from './Badge';

interface EventTimelineProps {
  events: RuntimeEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex justify-between items-start gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Live timeline</h2>
        <Badge tone="blue" className="shrink-0">
          {events.length} events
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent max-h-150">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <p className="text-sm text-zinc-500">No runtime events yet.</p>
          </div>
        ) : (
          <div className="relative flex flex-col gap-6 py-2 pl-2">
            {/* Línea vertical del timeline */}
            <div className="absolute left-2.75 top-3 bottom-3 w-px bg-zinc-800/60"></div>

            {events.map((event) => (
              <article className="relative pl-6 flex flex-col gap-1.5" key={event.id}>
                {/* Punto indicador */}
                <div className="absolute left-1 top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-zinc-900/40"></div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-semibold text-zinc-200">{event.name}</strong>
                  <time className="text-[10px] text-zinc-500 font-mono">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </time>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40 mt-1">
                  {event.message}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
