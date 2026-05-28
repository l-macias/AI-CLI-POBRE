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
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <Network size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Context Graph</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Read-only code relationship graph: imports, importers, symbols and retrieval matches.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge tone={graph ? 'green' : 'slate'}>{graph ? 'ready' : 'idle'}</Badge>
          <Badge tone="blue">{graph?.relatedFiles.length ?? 0} related</Badge>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-end gap-4 mt-6 p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
        <label className="flex flex-col gap-1.5 w-full lg:w-[40%]">
          <span className="text-xs font-medium text-zinc-400">Target file</span>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            value={targetFilePath}
            disabled={disabled || loading}
            placeholder="src/pages/SessionPage.tsx"
            onChange={(event) => setTargetFilePath(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 w-full lg:w-[40%]">
          <span className="text-xs font-medium text-zinc-400">Query</span>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            value={query}
            disabled={disabled || loading}
            placeholder="approval flow, runtime plan, API usage..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <button
          className="w-full lg:w-[20%] flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={disabled || loading}
          onClick={generate}
        >
          {loading ? <RefreshCcw size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? 'Generating...' : 'Generate graph'}
        </button>
      </div>

      {!graph ? (
        <article className="flex flex-col items-center justify-center gap-4 mt-6 p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
          <GitBranch size={24} className="text-zinc-600" />
          <div>
            <strong className="block text-sm font-medium text-zinc-300">
              No context graph generated.
            </strong>
            <p className="text-xs text-zinc-500 mt-1">
              Run analysis for a target file or query before planning a patch.
            </p>
          </div>
        </article>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <section className="lg:col-span-2 flex flex-col gap-8">
            <article className="flex flex-col gap-2 p-5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 shadow-sm">
              <strong className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Target
              </strong>
              <code className="text-sm font-mono text-zinc-200 break-all">
                {graph.targetFilePath ?? 'not resolved'}
              </code>

              {graph.targetExpansion ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {graph.targetExpansion.reasons.map((reason) => (
                    <Badge key={reason} tone="slate">
                      {reason}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </article>

            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Related files
              </h3>

              {graph.relatedFiles.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">No related files found.</p>
              ) : (
                graph.relatedFiles.map((file) => (
                  <article
                    className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
                    key={file.filePath}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <strong className="text-sm font-mono text-zinc-200 break-all">
                        {file.filePath}
                      </strong>
                      <span className="text-xs font-medium text-zinc-500 whitespace-nowrap bg-zinc-900 px-2 py-1 rounded">
                        Score: {file.score}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
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

            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Imports
              </h3>

              {graph.relationship?.imports.length ? (
                graph.relationship.imports.map((item) => (
                  <article
                    className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
                    key={`${item.sourceFilePath}-${item.importedPath}-${item.resolvedPath ?? 'unresolved'}`}
                  >
                    <strong className="text-sm font-mono text-zinc-200 break-all">
                      {item.importedPath}
                    </strong>
                    <p className="text-xs text-zinc-500 font-mono break-all">
                      {item.resolvedPath ?? 'unresolved'}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
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
                <p className="text-sm text-zinc-500 italic">No imports detected for target.</p>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Imported by
              </h3>

              {graph.relationship?.importedBy.length ? (
                graph.relationship.importedBy.map((filePath) => (
                  <article
                    className="flex flex-col gap-1.5 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
                    key={filePath}
                  >
                    <strong className="text-sm font-mono text-zinc-200 break-all">
                      {filePath}
                    </strong>
                    <p className="text-xs text-zinc-500">Imports target file.</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-zinc-500 italic">No importers detected for target.</p>
              )}
            </section>
          </section>

          <aside className="lg:col-span-1 flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Exports
              </h3>

              {selectedSymbols?.exports.length ? (
                selectedSymbols.exports.map((symbol) => (
                  <SymbolRow
                    key={`${symbol.filePath}-${symbol.line}-${symbol.name}`}
                    symbol={symbol}
                  />
                ))
              ) : (
                <p className="text-sm text-zinc-500 italic">No exports detected.</p>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Imported symbols
              </h3>

              {selectedSymbols?.imports.length ? (
                selectedSymbols.imports.map((symbol) => (
                  <SymbolRow
                    key={`${symbol.filePath}-${symbol.line}-${symbol.name}`}
                    symbol={symbol}
                  />
                ))
              ) : (
                <p className="text-sm text-zinc-500 italic">No imported symbols detected.</p>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Type references
              </h3>

              {selectedTypeReferences?.references.length ? (
                selectedTypeReferences.references.slice(0, 24).map((reference) => (
                  <article
                    className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
                    key={`${reference.filePath}-${reference.line}-${reference.name}`}
                  >
                    <strong className="text-sm font-mono text-zinc-300 truncate">
                      {reference.name}
                    </strong>
                    <span className="text-xs text-zinc-500 whitespace-nowrap shrink-0">
                      line {reference.line}
                    </span>
                  </article>
                ))
              ) : (
                <p className="text-sm text-zinc-500 italic">No type references detected.</p>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Retrieval chunks
              </h3>

              <div className="flex flex-wrap gap-2">
                <Badge tone="blue">{graph.retrieval.filesScanned} files scanned</Badge>
                <Badge tone="blue">{graph.retrieval.chunksScanned} chunks scanned</Badge>
              </div>

              {graph.retrieval.chunks.slice(0, 5).map((chunk) => (
                <article
                  className="flex flex-col gap-1.5 p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
                  key={`${chunk.chunk.filePath}-${chunk.chunk.startLine}-${chunk.chunk.endLine}`}
                >
                  <strong className="text-sm font-mono text-zinc-200 break-all">
                    {chunk.chunk.filePath}
                  </strong>
                  <p className="text-xs text-zinc-500">
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
    <article className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors">
      <strong className="text-sm font-mono text-zinc-300 truncate">{symbol.name}</strong>
      <span className="text-xs text-zinc-500 whitespace-nowrap shrink-0">
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
