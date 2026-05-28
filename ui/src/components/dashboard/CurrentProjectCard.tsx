import { FolderKanban } from 'lucide-react';
import { Badge } from '../Badge';
import type { ProjectProfile } from '../../types/runtime';

interface CurrentProjectCardProps {
  project: ProjectProfile | null;
  onOpenProjects: () => void;
}

export function CurrentProjectCard({ project, onOpenProjects }: CurrentProjectCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-zinc-100">
          <FolderKanban size={18} className="text-indigo-400" />
          <strong className="font-medium text-base">Current project</strong>
        </div>

        <Badge tone={project ? 'green' : 'yellow'}>{project ? 'ready' : 'required'}</Badge>
      </div>

      {project ? (
        <div className="flex flex-col flex-1">
          <h2 className="text-lg font-semibold text-zinc-100 truncate">{project.name}</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1 truncate" title={project.rootPath}>
            {project.rootPath}
          </p>

          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <Badge tone="blue">{project.packageManager}</Badge>
            <Badge tone="green">{project.workingMode}</Badge>
            {project.stack.map((stack) => (
              <Badge key={stack} tone={stack === 'mern' || stack === 'pern' ? 'green' : 'blue'}>
                {stack}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mt-auto mb-5 border-t border-zinc-800/60 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">package.json</span>
              <span className={project.hasPackageJson ? 'text-zinc-300' : 'text-zinc-600'}>
                {project.hasPackageJson ? 'yes' : 'no'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">tsconfig</span>
              <span className={project.hasTsConfig ? 'text-zinc-300' : 'text-zinc-600'}>
                {project.hasTsConfig ? 'yes' : 'no'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">src</span>
              <span className={project.hasSrcDirectory ? 'text-zinc-300' : 'text-zinc-600'}>
                {project.hasSrcDirectory ? 'yes' : 'no'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">prisma</span>
              <span className={project.hasPrismaSchema ? 'text-zinc-300' : 'text-zinc-600'}>
                {project.hasPrismaSchema ? 'yes' : 'no'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-zinc-950/50 border border-dashed border-zinc-800 flex-1 mb-5">
          <strong className="text-sm font-medium text-zinc-300">No project selected yet.</strong>
          <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
            Start by scanning or selecting a local project. After that, Zero can create a guided
            runtime session and walk you through plan, patch, sandbox and report.
          </p>
        </div>
      )}

      <button
        className="mt-auto w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
        onClick={onOpenProjects}
      >
        {project ? 'Open Projects' : 'Select Project'}
      </button>
    </article>
  );
}
