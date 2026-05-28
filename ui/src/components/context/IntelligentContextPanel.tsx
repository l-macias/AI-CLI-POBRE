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
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5">
        <div className="flex items-start gap-3">
          <FileSearch size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Intelligent Context
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Files selected from frontend/backend links, routes, controllers and middlewares.
            </p>
          </div>
        </div>

        <Badge tone={contextItems.length > 0 ? 'green' : 'slate'} className="shrink-0">
          {contextItems.length} context files
        </Badge>
      </div>

      <div className="flex flex-col gap-4 mt-6">
        {contextItems.length > 0 ? (
          contextItems.map((item) => (
            <article
              className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
              key={`${item.file}-${item.reason}`}
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
