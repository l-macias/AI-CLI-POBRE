import { Send } from 'lucide-react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';

interface ChatPanelProps {
  session: InteractiveSessionState | null;
  command: string;
  onCommandChange: (value: string) => void;
  onSendCommand: () => void;
}

export function ChatPanel({ session, command, onCommandChange, onSendCommand }: ChatPanelProps) {
  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm h-full max-h-[800px] overflow-hidden">
      <div className="flex justify-between items-start gap-4 p-5 border-b border-zinc-800/60 bg-zinc-900/80">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Session notes</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            Send instructions to the session. For the main MVP flow, use the recommended action card
            above first.
          </p>
        </div>
        <Badge tone={session ? 'green' : 'slate'} className="shrink-0">
          {session ? 'connected' : 'idle'}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-zinc-950/30 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {session?.messages.length ? (
          session.messages.map((message) => (
            <article
              className={`flex flex-col gap-1.5 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              key={message.id}
            >
              <div
                className={`flex items-center gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Badge tone={message.role === 'user' ? 'blue' : 'slate'}>{message.role}</Badge>
                <time className="text-[10px] text-zinc-500 font-mono">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </time>
              </div>
              <div
                className={`p-3 rounded-lg text-sm leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 rounded-tl-none'
                }`}
              >
                {message.content}
              </div>
            </article>
          ))
        ) : (
          <article className="flex flex-col items-center justify-center h-full text-center p-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <strong className="text-sm font-medium text-zinc-300">No session messages yet.</strong>
            <p className="text-xs text-zinc-500 mt-2 max-w-xs leading-relaxed">
              Use this area for extra instructions. The safest path is to follow the guided
              workflow: prepare project → create plan → create patch → preview diff → sandbox →
              dry-run/apply.
            </p>
          </article>
        )}
      </div>

      <div className="flex items-end gap-3 p-4 border-t border-zinc-800/60 bg-zinc-900/80">
        <textarea
          rows={3}
          value={command}
          placeholder="Ej: No tocar base de datos, .env, prisma ni migraciones en esta sesión."
          onChange={(event) => onCommandChange(event.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors resize-none scrollbar-thin scrollbar-thumb-zinc-700"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (session && command.trim().length > 0) onSendCommand();
            }
          }}
        />
        <button
          disabled={!session || command.trim().length === 0}
          onClick={onSendCommand}
          className="flex h-[74px] items-center justify-center rounded-lg bg-indigo-600 px-4 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title="Send command (Enter)"
        >
          <Send size={18} className="shrink-0" />
        </button>
      </div>
    </section>
  );
}
