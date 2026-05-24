import { ScrollText } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '../Badge';
import { AppliedPatchCard } from './AppliedPatchCard';
import { AuditEventCard } from './AuditEventCard';
import type {
  AuditRiskLevel,
  AuditTimelineEvent,
  AuditTimelineInput,
  AuditTimelineViewModel,
} from './AuditTypes';
import { BlockedActionCard } from './BlockedActionCard';
import { RuntimeDecisionCard } from './RuntimeDecisionCard';

interface AuditTimelineProps {
  session: AuditTimelineInput['session'];
  runtimeEvents: AuditTimelineInput['runtimeEvents'];
}

export function AuditTimeline({ session, runtimeEvents }: AuditTimelineProps) {
  const audit = useMemo(
    () =>
      buildAuditTimeline({
        session,
        runtimeEvents,
      }),
    [session, runtimeEvents],
  );

  const blockedCount = audit.events.filter((event) => event.status === 'blocked').length;
  const pendingCount = audit.events.filter((event) => event.status === 'pending').length;

  return (
    <section className="panel audit-timeline-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <ScrollText size={18} />
          <div>
            <h2>Visual Audit Timeline</h2>
            <p className="muted">
              What the user requested, what Zero read, proposed, blocked, approved and left pending.
            </p>
          </div>
        </div>

        <div className="audit-summary-badges">
          <Badge tone="blue">{audit.events.length} events</Badge>
          <Badge tone={blockedCount > 0 ? 'red' : 'green'}>{blockedCount} blocked</Badge>
          <Badge tone={pendingCount > 0 ? 'yellow' : 'green'}>{pendingCount} pending</Badge>
        </div>
      </div>

      <div className="audit-timeline-list">
        {audit.events.length > 0 ? (
          audit.events.map((event, index) =>
            renderAuditEvent(event, `${event.id}-${String(index)}`),
          )
        ) : (
          <p className="muted">No audit events yet. Start a session and send commands.</p>
        )}
      </div>
    </section>
  );
}

function renderAuditEvent(event: AuditTimelineEvent, key: string) {
  if (event.kind === 'blocked_action') {
    return <BlockedActionCard event={event} key={key} />;
  }

  if (event.kind === 'patch_applied') {
    return <AppliedPatchCard event={event} key={key} />;
  }

  if (event.kind === 'runtime_decision') {
    return <RuntimeDecisionCard event={event} key={key} />;
  }

  return <AuditEventCard event={event} key={key} />;
}

function buildAuditTimeline(input: AuditTimelineInput): AuditTimelineViewModel {
  const events: AuditTimelineEvent[] = [];

  if (input.session) {
    for (const message of input.session.messages) {
      events.push({
        id: `audit-message-${message.id}`,
        kind: 'user_request',
        title: `${message.role} message`,
        description: message.content,
        createdAt: message.createdAt,
        riskLevel: 'low',
        source: 'session',
        status: 'completed',
      });
    }

    for (const timelineEvent of input.session.timeline) {
      events.push({
        id: `audit-timeline-${timelineEvent.id}`,
        kind: inferKindFromText(`${timelineEvent.kind} ${timelineEvent.message}`),
        title: timelineEvent.kind,
        description: timelineEvent.message,
        createdAt: timelineEvent.createdAt,
        riskLevel: inferRisk(`${timelineEvent.kind} ${timelineEvent.message}`),
        source: 'session',
        status: inferStatus(`${timelineEvent.kind} ${timelineEvent.message}`),
      });
    }

    for (const action of input.session.runtimeActions) {
      const text = `${action.title} ${action.description} ${action.status}`;

      events.push({
        id: `audit-action-${action.id}`,
        kind: inferKindFromText(text),
        title: action.title,
        description: action.description,
        createdAt: action.createdAt,
        riskLevel: inferRisk(text),
        source: 'session',
        status: normalizeActionStatus(action.status, text),
      });
    }
  }

  for (const runtimeEvent of input.runtimeEvents) {
    events.push({
      id: `audit-runtime-event-${runtimeEvent.id}`,
      kind: inferKindFromRuntimeEvent(runtimeEvent.name),
      title: runtimeEvent.name,
      description: runtimeEvent.message,
      createdAt: runtimeEvent.createdAt,
      riskLevel: inferRisk(`${runtimeEvent.name} ${runtimeEvent.message}`),
      source: 'runtime_event',
      status: inferStatus(`${runtimeEvent.name} ${runtimeEvent.message}`),
      metadata: runtimeEvent.payload,
    });
  }

  const deduped = dedupeAuditEvents(events);

  return {
    sessionId: input.session?.id,
    events: deduped.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  };
}

function dedupeAuditEvents(events: AuditTimelineEvent[]): AuditTimelineEvent[] {
  const seen = new Set<string>();
  const result: AuditTimelineEvent[] = [];

  for (const event of events) {
    const key = `${event.kind}:${event.title}:${event.description}:${event.createdAt}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(event);
  }

  return result;
}

function inferKindFromRuntimeEvent(name: string): AuditTimelineEvent['kind'] {
  if (name.includes('project.scanned') || name.includes('context')) {
    return 'context_read';
  }

  if (name.includes('plan')) {
    return 'plan_proposed';
  }

  if (name.includes('patch.proposed') || name.includes('snapshot')) {
    return 'patch_proposed';
  }

  if (name.includes('patch.applied')) {
    return 'patch_applied';
  }

  if (name.includes('approval')) {
    return 'approval';
  }

  if (name.includes('risk')) {
    return 'blocked_action';
  }

  return 'runtime_decision';
}

function inferKindFromText(text: string): AuditTimelineEvent['kind'] {
  const normalized = text.toLowerCase();

  if (
    normalized.includes('blocked') ||
    normalized.includes('block') ||
    normalized.includes('danger')
  ) {
    return 'blocked_action';
  }

  if (normalized.includes('applied') || normalized.includes('patch applied')) {
    return 'patch_applied';
  }

  if (normalized.includes('apply') || normalized.includes('diff') || normalized.includes('patch')) {
    return 'patch_proposed';
  }

  if (normalized.includes('plan')) {
    return 'plan_proposed';
  }

  if (
    normalized.includes('context') ||
    normalized.includes('files') ||
    normalized.includes('project')
  ) {
    return 'context_read';
  }

  if (normalized.includes('approval') || normalized.includes('approve')) {
    return 'approval';
  }

  if (normalized.includes('decision') || normalized.includes('runtime')) {
    return 'runtime_decision';
  }

  return 'pending';
}

function inferRisk(text: string): AuditRiskLevel {
  const normalized = text.toLowerCase();

  if (
    normalized.includes('auth') ||
    normalized.includes('secret') ||
    normalized.includes('.env') ||
    normalized.includes('delete') ||
    normalized.includes('database')
  ) {
    return 'high';
  }

  if (
    normalized.includes('patch') ||
    normalized.includes('apply') ||
    normalized.includes('snapshot') ||
    normalized.includes('blocked')
  ) {
    return 'medium';
  }

  return 'low';
}

function inferStatus(text: string): AuditTimelineEvent['status'] {
  const normalized = text.toLowerCase();

  if (normalized.includes('blocked') || normalized.includes('not_executed')) {
    return 'blocked';
  }

  if (normalized.includes('approved')) {
    return 'approved';
  }

  if (
    normalized.includes('completed') ||
    normalized.includes('created') ||
    normalized.includes('scanned')
  ) {
    return 'completed';
  }

  if (normalized.includes('pending') || normalized.includes('waiting')) {
    return 'pending';
  }

  return 'info';
}

function normalizeActionStatus(status: string, text: string): AuditTimelineEvent['status'] {
  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'blocked' || status === 'failed') {
    return 'blocked';
  }

  if (status === 'pending' || status === 'running') {
    return 'pending';
  }

  return inferStatus(text);
}
