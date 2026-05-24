import { FolderKanban } from 'lucide-react';
import { Badge } from '../Badge';
import type { ProjectProfile } from '../../types/runtime';

interface CurrentProjectCardProps {
  project: ProjectProfile | null;
  onOpenProjects: () => void;
}

export function CurrentProjectCard({ project, onOpenProjects }: CurrentProjectCardProps) {
  return (
    <article className="dashboard-card dashboard-card-large">
      <div className="dashboard-card-header">
        <div className="dashboard-title-row">
          <FolderKanban size={18} />
          <strong>Current project</strong>
        </div>

        <Badge tone={project ? 'green' : 'yellow'}>{project ? 'selected' : 'missing'}</Badge>
      </div>

      {project ? (
        <>
          <h2>{project.name}</h2>
          <p className="dashboard-path">{project.rootPath}</p>

          <div className="dashboard-badge-row">
            <Badge tone="blue">{project.packageManager}</Badge>
            <Badge tone="green">{project.workingMode}</Badge>
            {project.stack.map((stack) => (
              <Badge key={stack} tone={stack === 'mern' || stack === 'pern' ? 'green' : 'blue'}>
                {stack}
              </Badge>
            ))}
          </div>

          <div className="dashboard-facts">
            <span>package.json: {project.hasPackageJson ? 'yes' : 'no'}</span>
            <span>tsconfig: {project.hasTsConfig ? 'yes' : 'no'}</span>
            <span>src: {project.hasSrcDirectory ? 'yes' : 'no'}</span>
            <span>prisma: {project.hasPrismaSchema ? 'yes' : 'no'}</span>
          </div>
        </>
      ) : (
        <div className="dashboard-empty-block">
          <strong>No project selected.</strong>
          <p>Select or scan a local project before starting a runtime session.</p>
        </div>
      )}

      <button className="secondary-button" onClick={onOpenProjects}>
        Open Projects
      </button>
    </article>
  );
}
