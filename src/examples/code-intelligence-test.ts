import { CodeIntelligenceReport } from '../code-intelligence/CodeIntelligenceReport.js';
import { Logger } from '../observability/Logger.js';

const logger = new Logger({
  namespace: 'zero-runtime:code-intelligence-test',
});

async function main(): Promise<void> {
  const reportBuilder = new CodeIntelligenceReport();

  const report = await reportBuilder.generate({
    targetFilePath: 'src/retrieval/ImportGraph.ts',
    query: 'ImportGraph RetrievalTypes import relationships',
    maxChunks: 8,
    maxRelatedFiles: 6,
    maxFilesToScan: 8,
  });

  logger.info('Code intelligence report generated', {
    targetFilePath: report.targetFilePath,
    importedFiles: report.relationship?.imports.map((item) => ({
      importedPath: item.importedPath,
      resolvedPath: item.resolvedPath,
      isTypeOnly: item.isTypeOnly,
      specifiers: item.specifiers,
      importKind: item.importKind,
    })),
    importedBy: report.relationship?.importedBy,
    relatedFiles: report.relatedFiles,
    targetExpansion: report.targetExpansion,
    symbolFiles: report.symbols.map((item) => ({
      filePath: item.filePath,
      exports: item.exports.map((symbol) => symbol.name),
      imports: item.imports.map((symbol) => symbol.name),
    })),
    typeReferenceFiles: report.typeReferences.map((item) => ({
      filePath: item.filePath,
      references: item.references.slice(0, 10).map((reference) => reference.name),
    })),
    retrieval: {
      query: report.retrieval.query,
      returnedChunks: report.retrieval.chunks.length,
      topFiles: report.retrieval.chunks.map((item) => item.chunk.filePath),
    },
  });

  if (!report.targetFilePath) {
    throw new Error('Expected code intelligence report to resolve a target file.');
  }

  if (!report.relationship) {
    throw new Error('Expected code intelligence report to include file relationship.');
  }

  if (report.relationship.imports.length === 0) {
    throw new Error('Expected target file to expose imports.');
  }

  const hasImportKind = report.relationship.imports.some((item) => {
    return item.importKind === 'static_import';
  });

  if (!hasImportKind) {
    throw new Error('Expected import graph to classify static imports.');
  }

  if (report.symbols.length === 0) {
    throw new Error('Expected code intelligence report to scan symbols.');
  }

  const hasImportGraphSymbol = report.symbols.some((item) => {
    return item.exports.some((symbol) => symbol.name === 'ImportGraph');
  });

  if (!hasImportGraphSymbol) {
    throw new Error('Expected CodeSymbolScanner to find ImportGraph export.');
  }

  if (!report.targetExpansion) {
    throw new Error('Expected code intelligence report to include controlled target expansion.');
  }

  if (report.targetExpansion.scannedFilePaths.length > 8) {
    throw new Error('Expected target expansion to respect maxFilesToScan.');
  }

  if (report.relatedFiles.length > 6) {
    throw new Error('Expected related files to respect maxRelatedFiles.');
  }

  if (report.retrieval.chunks.length === 0) {
    throw new Error('Expected retrieval chunks in code intelligence report.');
  }

  logger.info('Code intelligence test completed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
