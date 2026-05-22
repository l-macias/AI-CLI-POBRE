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
    <section className="panel session-chat-panel">
      <div className="panel-header">
        <div>
          <h2>Chat</h2>
          <p className="muted">Send slash commands or natural language instructions.</p>
        </div>
        <Badge tone={session ? 'green' : 'slate'}>{session ? 'connected' : 'idle'}</Badge>
      </div>

      <div className="chat-messages">
        {session?.messages.length ? (
          session.messages.map((message) => (
            <article className="chat-message" key={message.id}>
              <Badge tone={message.role === 'user' ? 'blue' : 'slate'}>{message.role}</Badge>
              <div>
                <p>{message.content}</p>
                <time>{new Date(message.createdAt).toLocaleTimeString()}</time>
              </div>
            </article>
          ))
        ) : (
          <p className="muted">No messages yet.</p>
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          rows={3}
          value={command}
          placeholder="/plan or Ahora revisá el backend"
          onChange={(event) => onCommandChange(event.target.value)}
        />
        <button disabled={!session || command.trim().length === 0} onClick={onSendCommand}>
          <Send size={16} />
          Send
        </button>
      </div>
    </section>
  );
}
