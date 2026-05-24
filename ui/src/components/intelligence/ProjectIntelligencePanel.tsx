import { Network, WandSparkles } from 'lucide-react';
import type {
  ApiRouteMapResult,
  FrontendBackendLinkResult,
  ProjectStackIntelligence,
} from '../../types/runtime';
import { Badge } from '../Badge';

interface ProjectIntelligencePanelProps {
  stack: ProjectStackIntelligence | null;
  routes: ApiRouteMapResult | null;
  links: FrontendBackendLinkResult | null;
  loading: boolean;
  workflowLoading?: boolean;
  onAnalyze: () => void;
  onPrepareWorkflow?: () => void;
}

export function ProjectIntelligencePanel({
  stack,
  routes,
  links,
  loading,
  workflowLoading = false,
  onAnalyze,
  onPrepareWorkflow,
}: ProjectIntelligencePanelProps) {
  return (
    <section id="project-intelligence-panel" className="panel integration-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <Network size={18} />
          <div>
            <h2>Project Intelligence</h2>
            <p className="muted">Stack, backend routes and frontend/backend links.</p>
          </div>
        </div>

        <div className="integration-actions">
          {onPrepareWorkflow ? (
            <button onClick={onPrepareWorkflow}>
              <WandSparkles size={16} />
              {workflowLoading ? 'Preparing...' : 'Prepare Workflow'}
            </button>
          ) : null}

          <button className="secondary-button" onClick={onAnalyze}>
            {loading ? 'Analyzing...' : 'Analyze only'}
          </button>
        </div>
      </div>

      {stack ? (
        <article className="integration-card">
          <strong>Detected stack</strong>
          <div className="stack-row">
            {stack.stack.map((item) => (
              <Badge key={item} tone={item === 'pern' || item === 'mern' ? 'green' : 'blue'}>
                {item}
              </Badge>
            ))}
          </div>
        </article>
      ) : null}

      {routes ? (
        <article className="integration-card">
          <strong>API routes</strong>
          <div className="integration-list compact">
            {routes.routes.map((route) => (
              <div className="route-row" key={route.id}>
                <Badge tone="yellow">{route.method}</Badge>
                <code>{route.path}</code>
                <span>{route.controller?.name ?? 'no controller'}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {links ? (
        <article className="integration-card">
          <strong>Frontend/backend links</strong>
          <div className="integration-list compact">
            {links.links.map((link) => (
              <div className="route-row" key={link.id}>
                <Badge
                  tone={
                    link.matchType === 'exact'
                      ? 'green'
                      : link.matchType === 'method_mismatch'
                        ? 'yellow'
                        : 'red'
                  }
                >
                  {link.matchType}
                </Badge>
                <code>
                  {link.usage.method} {link.usage.endpoint}
                </code>
                <span>{link.usage.sourceFile}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
