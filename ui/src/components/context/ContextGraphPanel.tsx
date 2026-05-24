import { useMemo, useState } from 'react';
import { GitBranch, Network, RefreshCcw, Search } from 'lucide-react';
import type { ContextGraphReport } from '../../types/runtime';
import { Badge } from '../Badge';

interface ContextGraphPanelProps {
  graph: ContextGraphReport | null;
  loading?: boolean;
  disabled?: boolean;
  defaultTargetFilePath?: string;
  onGenerate: (input: { query: string; targetFilePath: string }) => void;
}

export function ContextGraphPanel({
  graph,
  loading = false,
  disabled = false,
  defaultTargetFilePath = '',
  onGenerate,
}: ContextGraphPanelProps) {
  const [query, setQuery] = useState('');
  const [targetFilePath, setTargetFilePath] = useState(defaultTargetFilePath);

  const selectedSymbols = useMemo(() => {
    if (!graph?.targetFilePath) {
      return null;
    }

    return graph.symbols.find((item) => item.filePath === graph.targetFilePath) ?? null;
  }, [graph]);

  const selectedTypeReferences = useMemo(() => {
    if (!graph?.targetFilePath) {
      return null;
    }

    return graph.typeReferences.find((item) => item.filePath === graph.targetFilePath) ?? null;
  }, [graph]);

  function generate() {
    onGenerate({
      query: query.trim(),
      targetFilePath: targetFilePath.trim(),
    });
  }

  return (
    <section className="panel context-graph-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <Network size={18} />
          <div>
            <h2>Context Graph</h2>
            <p className="muted">
              Read-only code relationship graph: imports, importers, symbols and retrieval matches.
            </p>
          </div>
        </div>

        <div className="context-summary-badges">
          <Badge tone={graph ? 'green' : 'slate'}>{graph ? 'ready' : 'idle'}</Badge>
          <Badge tone="blue">{graph?.relatedFiles.length ?? 0} related</Badge>
        </div>
      </div>

      <div className="context-graph-controls">
        <label>
          Target file
          <input
            value={targetFilePath}
            disabled={disabled || loading}
            placeholder="src/pages/SessionPage.tsx"
            onChange={(event) => setTargetFilePath(event.target.value)}
          />
        </label>

        <label>
          Query
          <input
            value={query}
            disabled={disabled || loading}
            placeholder="approval flow, runtime plan, API usage..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <button disabled={disabled || loading} onClick={generate}>
          {loading ? <RefreshCcw size={16} /> : <Search size={16} />}
          {loading ? 'Generating...' : 'Generate graph'}
        </button>
      </div>

      {!graph ? (
        <article className="context-graph-empty">
          <GitBranch size={20} />
          <div>
            <strong>No context graph generated.</strong>
            <p>Run analysis for a target file or query before planning a patch.</p>
          </div>
        </article>
      ) : (
        <div className="context-graph-grid">
          <section className="context-graph-main">
            <article className="context-graph-target-card">
              <strong>Target</strong>
              <code>{graph.targetFilePath ?? 'not resolved'}</code>

              {graph.targetExpansion ? (
                <div className="context-graph-reasons">
                  {graph.targetExpansion.reasons.map((reason) => (
                    <Badge key={reason} tone="slate">
                      {reason}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </article>

            <section className="context-graph-section">
              <h3>Related files</h3>

              {graph.relatedFiles.length === 0 ? (
                <p className="muted">No related files found.</p>
              ) : (
                graph.relatedFiles.map((file) => (
                  <article className="context-graph-related-card" key={file.filePath}>
                    <div>
                      <strong>{file.filePath}</strong>
                      <p>Score: {file.score}</p>
                    </div>

                    <div className="context-graph-reasons">
                      {file.reasons.map((reason) => (
                        <Badge key={reason} tone={toneForReason(reason)}>
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="context-graph-section">
              <h3>Imports</h3>

              {graph.relationship?.imports.length ? (
                graph.relationship.imports.map((item) => (
                  <article
                    className="context-graph-import-card"
                    key={`${item.sourceFilePath}-${item.importedPath}-${item.resolvedPath ?? 'unresolved'}`}
                  >
                    <strong>{item.importedPath}</strong>
                    <p>{item.resolvedPath ?? 'unresolved'}</p>

                    <div className="context-graph-reasons">
                      <Badge tone="blue">{item.importKind}</Badge>
                      {item.isTypeOnly ? <Badge tone="yellow">type only</Badge> : null}
                      {item.specifiers.map((specifier) => (
                        <Badge key={specifier} tone="slate">
                          {specifier}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">No imports detected for target.</p>
              )}
            </section>

            <section className="context-graph-section">
              <h3>Imported by</h3>

              {graph.relationship?.importedBy.length ? (
                graph.relationship.importedBy.map((filePath) => (
                  <article className="context-graph-import-card" key={filePath}>
                    <strong>{filePath}</strong>
                    <p>Imports target file.</p>
                  </article>
                ))
              ) : (
                <p className="muted">No importers detected for target.</p>
              )}
            </section>
          </section>

          <aside className="context-graph-side">
            <section className="context-graph-section">
              <h3>Exports</h3>

              {selectedSymbols?.exports.length ? (
                selectedSymbols.exports.map((symbol) => (
                  <SymbolRow
                    key={`${symbol.filePath}-${symbol.line}-${symbol.name}`}
                    symbol={symbol}
                  />
                ))
              ) : (
                <p className="muted">No exports detected.</p>
              )}
            </section>

            <section className="context-graph-section">
              <h3>Imported symbols</h3>

              {selectedSymbols?.imports.length ? (
                selectedSymbols.imports.map((symbol) => (
                  <SymbolRow
                    key={`${symbol.filePath}-${symbol.line}-${symbol.name}`}
                    symbol={symbol}
                  />
                ))
              ) : (
                <p className="muted">No imported symbols detected.</p>
              )}
            </section>

            <section className="context-graph-section">
              <h3>Type references</h3>

              {selectedTypeReferences?.references.length ? (
                selectedTypeReferences.references.slice(0, 24).map((reference) => (
                  <article
                    className="context-graph-symbol-row"
                    key={`${reference.filePath}-${reference.line}-${reference.name}`}
                  >
                    <strong>{reference.name}</strong>
                    <span>line {reference.line}</span>
                  </article>
                ))
              ) : (
                <p className="muted">No type references detected.</p>
              )}
            </section>

            <section className="context-graph-section">
              <h3>Retrieval chunks</h3>

              <div className="context-graph-reasons">
                <Badge tone="blue">{graph.retrieval.filesScanned} files scanned</Badge>
                <Badge tone="blue">{graph.retrieval.chunksScanned} chunks scanned</Badge>
              </div>

              {graph.retrieval.chunks.slice(0, 5).map((chunk) => (
                <article
                  className="context-graph-chunk-card"
                  key={`${chunk.chunk.filePath}-${chunk.chunk.startLine}-${chunk.chunk.endLine}`}
                >
                  <strong>{chunk.chunk.filePath}</strong>
                  <p>
                    Lines {chunk.chunk.startLine}-{chunk.chunk.endLine} · score {chunk.score}
                  </p>
                </article>
              ))}
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

function SymbolRow({
  symbol,
}: {
  symbol: ContextGraphReport['symbols'][number]['exports'][number];
}) {
  return (
    <article className="context-graph-symbol-row">
      <strong>{symbol.name}</strong>
      <span>
        {symbol.kind} · line {symbol.line}
      </span>
    </article>
  );
}

function toneForReason(reason: string): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (reason === 'direct_import') {
    return 'green';
  }

  if (reason === 'importer') {
    return 'blue';
  }

  if (reason === 'retrieval_match') {
    return 'yellow';
  }

  if (reason.includes('shared')) {
    return 'blue';
  }

  return 'slate';
}
