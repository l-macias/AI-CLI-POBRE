import { RuntimeInitializer } from '../core/RuntimeInitializer.js';
import { CodeIntelligenceReport } from '../code-intelligence/CodeIntelligenceReport.js';
import { ValidationOrchestrator } from '../validation/ValidationOrchestrator.js';
import { ValidationFailureContextBuilder } from '../validation-feedback/ValidationFailureContextBuilder.js';
import type { CliCodeIntelCommand, CliContextCommand } from './CliTypes.js';

export interface CliRuntimeBridgeOptions {
  runtimeInitializer?: RuntimeInitializer | undefined;
  validationOrchestrator?: ValidationOrchestrator | undefined;
  codeIntelligenceReport?: CodeIntelligenceReport | undefined;
  validationFailureContextBuilder?: ValidationFailureContextBuilder | undefined;
}

export class CliRuntimeBridge {
  private readonly runtimeInitializer: RuntimeInitializer;
  private readonly validationOrchestrator: ValidationOrchestrator;
  private readonly codeIntelligenceReport: CodeIntelligenceReport;
  private readonly validationFailureContextBuilder: ValidationFailureContextBuilder;

  public constructor(options: CliRuntimeBridgeOptions = {}) {
    this.runtimeInitializer = options.runtimeInitializer ?? new RuntimeInitializer();
    this.validationOrchestrator = options.validationOrchestrator ?? new ValidationOrchestrator();
    this.codeIntelligenceReport = options.codeIntelligenceReport ?? new CodeIntelligenceReport();
    this.validationFailureContextBuilder =
      options.validationFailureContextBuilder ?? new ValidationFailureContextBuilder();
  }

  public async loadContext(command: CliContextCommand): Promise<unknown> {
    const context = await this.runtimeInitializer.initialize({
      maxEstimatedContextTokens: command.maxTokens ?? 1500,
    });

    return {
      sourceCount: context.sources.length,
      sources: context.sources.map((source) => source.name),
      tokenEstimate: context.tokenEstimate,
      contextPreview: context.assembledContext.slice(0, 1200),
    };
  }

  public async validate(): Promise<unknown> {
    const run = await this.validationOrchestrator.runAll();
    const markdown = this.validationOrchestrator.createMarkdownReport(run);

    return {
      run,
      markdown,
    };
  }

  public async validationFeedback(): Promise<unknown> {
    const run = await this.validationOrchestrator.runAll();
    const feedback = this.validationFailureContextBuilder.build(run);

    return {
      run,
      feedback,
    };
  }

  public async codeIntel(command: CliCodeIntelCommand): Promise<unknown> {
    const report = await this.codeIntelligenceReport.generate({
      targetFilePath: command.targetFilePath,
      query: command.query,
      maxChunks: command.maxChunks,
    });

    return {
      targetFilePath: report.targetFilePath,
      importedFiles:
        report.relationship?.imports.map((item) => ({
          importedPath: item.importedPath,
          resolvedPath: item.resolvedPath,
          isTypeOnly: item.isTypeOnly,
          specifiers: item.specifiers,
        })) ?? [],
      importedBy: report.relationship?.importedBy ?? [],
      relatedFiles: report.relatedFiles,
      symbols: report.symbols.map((item) => ({
        filePath: item.filePath,
        exports: item.exports.map((symbol) => symbol.name),
        imports: item.imports.map((symbol) => symbol.name),
      })),
      typeReferences: report.typeReferences.map((item) => ({
        filePath: item.filePath,
        references: item.references.slice(0, 20).map((reference) => reference.name),
      })),
      retrieval: {
        query: report.retrieval.query,
        returnedChunks: report.retrieval.chunks.length,
        filesScanned: report.retrieval.filesScanned,
        chunksScanned: report.retrieval.chunksScanned,
        topFiles: report.retrieval.chunks.map((item) => item.chunk.filePath),
      },
    };
  }
}
