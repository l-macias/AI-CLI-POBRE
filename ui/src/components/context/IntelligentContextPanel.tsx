import { FileSearch, Link2 } from 'lucide-react';
import type { ApiRouteMapResult, FrontendBackendLinkResult } from '../../types/runtime';
import { Badge } from '../Badge';

interface IntelligentContextPanelProps {
  routes: ApiRouteMapResult | null;
  links: FrontendBackendLinkResult | null;
  readOnly?: boolean;
}

interface IntelligentContextItem {
  file: string;
  kind: 'frontend' | 'route' | 'controller' | 'middleware';
  reason: string;
  endpoint?: string;
}

export function IntelligentContextPanel({
  routes,
  links,
  readOnly = false,
}: IntelligentContextPanelProps) {
  const contextItems = buildContextItems(routes, links);

  return (
    <section
      id="context-intelligence-panel"
      className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm scroll-mt-32"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5">
        <div className="flex items-start gap-3">
          <FileSearch size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Project intelligence context
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              {readOnly
                ? 'Files discovered from API routes and frontend calls for read-only analysis.'
                : 'Files selected from frontend/backend links, routes, controllers and middlewares.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge tone={contextItems.length > 0 ? 'green' : 'slate'}>
            {contextItems.length} context files
          </Badge>
          {readOnly ? <Badge tone="green">analysis only</Badge> : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-6">
        {contextItems.length > 0 ? (
          contextItems.map((item) => (
            <article
              className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
              key={`${item.file}-${item.reason}-${item.endpoint ?? 'no-endpoint'}`}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-mono text-zinc-200 truncate">
                    {item.file}
                  </strong>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.reason}</p>
                </div>

                <Badge tone={toneForKind(item.kind)} className="shrink-0">
                  {item.kind}
                </Badge>
              </div>

              {item.endpoint ? (
                <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                  <Link2 size={14} className="text-zinc-500 shrink-0" />
                  <code className="truncate">{item.endpoint}</code>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <p className="text-sm text-zinc-400">
              Run Prepare Workflow or Analyze Project to generate intelligent context.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function buildContextItems(
  routes: ApiRouteMapResult | null,
  links: FrontendBackendLinkResult | null,
): IntelligentContextItem[] {
  const items: IntelligentContextItem[] = [];

  for (const usage of links?.usages ?? []) {
    items.push({
      file: usage.sourceFile,
      kind: 'frontend',
      reason: `Frontend ${usage.transport} usage calls ${usage.method} ${usage.endpoint}.`,
      endpoint: `${usage.method} ${usage.endpoint}`,
    });
  }

  for (const link of links?.links ?? []) {
    const route = link.route;

    if (!route) {
      items.push({
        file: link.usage.sourceFile,
        kind: 'frontend',
        reason: `Frontend ${link.usage.transport} usage calls ${link.usage.method} ${link.usage.endpoint}, but no backend route was linked.`,
        endpoint: `${link.usage.method} ${link.usage.endpoint}`,
      });

      continue;
    }

    items.push({
      file: link.usage.sourceFile,
      kind: 'frontend',
      reason: `Frontend call is linked to backend route ${route.method} ${route.path}.`,
      endpoint: `${route.method} ${route.path}`,
    });

    if (route.sourceFile) {
      items.push({
        file: route.sourceFile,
        kind: 'route',
        reason: `Backend route handles frontend endpoint ${link.usage.endpoint}.`,
        endpoint: `${route.method} ${route.path}`,
      });
    }
  }

  for (const route of routes?.routes ?? []) {
    items.push({
      file: route.sourceFile,
      kind: 'route',
      reason: `Express route ${route.method} ${route.path} is part of the current context.`,
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
