import { FileSearch, Link2 } from 'lucide-react';
import type { ApiRouteMapResult, FrontendBackendLinkResult } from '../../types/runtime';
import { Badge } from '../Badge';

interface IntelligentContextPanelProps {
  routes: ApiRouteMapResult | null;
  links: FrontendBackendLinkResult | null;
}

export function IntelligentContextPanel({ routes, links }: IntelligentContextPanelProps) {
  const contextItems = buildContextItems(routes, links);

  return (
    <section className="panel intelligent-context-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <FileSearch size={18} />
          <div>
            <h2>Intelligent Context</h2>
            <p className="muted">
              Files selected from frontend/backend links, routes, controllers and middlewares.
            </p>
          </div>
        </div>

        <Badge tone={contextItems.length > 0 ? 'green' : 'slate'}>
          {contextItems.length} context files
        </Badge>
      </div>

      <div className="intelligent-context-list">
        {contextItems.length > 0 ? (
          contextItems.map((item) => (
            <article className="intelligent-context-card" key={`${item.file}-${item.reason}`}>
              <div className="intelligent-context-card-header">
                <div>
                  <strong>{item.file}</strong>
                  <p>{item.reason}</p>
                </div>

                <Badge tone={toneForKind(item.kind)}>{item.kind}</Badge>
              </div>

              {item.endpoint ? (
                <div className="context-endpoint-row">
                  <Link2 size={14} />
                  <code>{item.endpoint}</code>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="muted">
            Run Prepare Workflow or Analyze Project to generate intelligent context.
          </p>
        )}
      </div>
    </section>
  );
}

interface IntelligentContextItem {
  file: string;
  kind: 'frontend' | 'route' | 'controller' | 'middleware';
  reason: string;
  endpoint?: string | undefined;
}

function buildContextItems(
  routes: ApiRouteMapResult | null,
  links: FrontendBackendLinkResult | null,
): IntelligentContextItem[] {
  const items: IntelligentContextItem[] = [];

  for (const link of links?.links ?? []) {
    items.push({
      file: link.usage.sourceFile,
      kind: 'frontend',
      reason: `Frontend ${link.usage.transport} usage calls ${link.usage.method} ${link.usage.endpoint}.`,
      endpoint: `${link.usage.method} ${link.usage.endpoint}`,
    });

    if (link.route) {
      items.push({
        file: link.route.sourceFile,
        kind: 'route',
        reason: `Backend route matched from frontend usage.`,
        endpoint: `${link.route.method} ${link.route.path}`,
      });
    }
  }

  for (const route of routes?.routes ?? []) {
    items.push({
      file: route.sourceFile,
      kind: 'route',
      reason: `Defines ${route.method} ${route.path}.`,
      endpoint: `${route.method} ${route.path}`,
    });

    if (route.controller?.resolvedFile) {
      items.push({
        file: route.controller.resolvedFile,
        kind: 'controller',
        reason: `Controller ${route.controller.name} handles ${route.method} ${route.path}.`,
        endpoint: `${route.method} ${route.path}`,
      });
    }

    for (const middleware of route.middlewares) {
      if (!middleware.resolvedFile) {
        continue;
      }

      items.push({
        file: middleware.resolvedFile,
        kind: 'middleware',
        reason: `Middleware ${middleware.name} runs before ${route.method} ${route.path}.`,
        endpoint: `${route.method} ${route.path}`,
      });
    }
  }

  return dedupeItems(items);
}

function dedupeItems(items: IntelligentContextItem[]): IntelligentContextItem[] {
  const seen = new Set<string>();
  const result: IntelligentContextItem[] = [];

  for (const item of items) {
    const key = `${item.file}:${item.kind}:${item.endpoint ?? ''}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result.sort((a, b) => {
    const weight = {
      frontend: 0,
      route: 1,
      controller: 2,
      middleware: 3,
    } as const;

    return weight[a.kind] - weight[b.kind] || a.file.localeCompare(b.file);
  });
}

function toneForKind(kind: IntelligentContextItem['kind']): 'blue' | 'green' | 'yellow' | 'red' {
  if (kind === 'frontend') {
    return 'blue';
  }

  if (kind === 'route') {
    return 'yellow';
  }

  if (kind === 'controller') {
    return 'green';
  }

  return 'red';
}
