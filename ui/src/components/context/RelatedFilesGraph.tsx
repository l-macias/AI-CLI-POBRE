import type { ContextFileItem } from './ContextFileCard';

interface RelatedFilesGraphProps {
  files: ContextFileItem[];
}

export function RelatedFilesGraph({ files }: RelatedFilesGraphProps) {
  const selectedFiles = files.filter((file) => file.status === 'selected');
  const relatedFiles = files.filter((file) => file.status === 'related');

  return (
    <section className="related-files-graph">
      <div className="graph-column">
        <strong>Selected</strong>
        {selectedFiles.length > 0 ? (
          selectedFiles.map((file) => (
            <div className="graph-node graph-node-selected" key={file.path}>
              {file.path}
            </div>
          ))
        ) : (
          <p className="muted">No selected files yet.</p>
        )}
      </div>

      <div className="graph-connector" />

      <div className="graph-column">
        <strong>Related</strong>
        {relatedFiles.length > 0 ? (
          relatedFiles.map((file) => (
            <div className="graph-node" key={file.path}>
              {file.path}
            </div>
          ))
        ) : (
          <p className="muted">No related files yet.</p>
        )}
      </div>
    </section>
  );
}
