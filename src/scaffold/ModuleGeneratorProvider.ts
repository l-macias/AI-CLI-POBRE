import type {
  ModuleGeneratorProviderInput,
  ModuleGeneratorProviderResult,
  ScaffoldFileProposal,
  ScaffoldProposal,
} from './ScaffoldTypes.js';

export interface ModuleGeneratorProvider {
  generate(input: ModuleGeneratorProviderInput): Promise<ModuleGeneratorProviderResult>;
}

export type FakeModuleGeneratorProviderMode =
  | 'json_only'
  | 'markdown_json'
  | 'invalid_json'
  | 'invalid_schema'
  | 'unsafe_path';

export interface FakeModuleGeneratorProviderOptions {
  mode?: FakeModuleGeneratorProviderMode | undefined;
  provider?: string | undefined;
  model?: string | undefined;
}

export class FakeModuleGeneratorProvider implements ModuleGeneratorProvider {
  private readonly mode: FakeModuleGeneratorProviderMode;
  private readonly provider: string;
  private readonly model: string;

  public constructor(options: FakeModuleGeneratorProviderOptions = {}) {
    this.mode = options.mode ?? 'markdown_json';
    this.provider = options.provider ?? 'fake-llm';
    this.model = options.model ?? 'fake-scaffold-model';
  }

  public generate(input: ModuleGeneratorProviderInput): Promise<ModuleGeneratorProviderResult> {
    const proposal = this.buildProposal(input);

    let rawOutput: string;

    if (this.mode === 'invalid_json') {
      rawOutput = '{ this is not valid json';
    } else if (this.mode === 'invalid_schema') {
      rawOutput = JSON.stringify(
        {
          id: proposal.id,
          summary: proposal.summary,
          files: 'not-an-array',
        },
        null,
        2,
      );
    } else {
      const json = JSON.stringify(proposal, null, 2);

      rawOutput =
        this.mode === 'markdown_json'
          ? ['Here is the scaffold proposal:', '', '```json', json, '```'].join('\n')
          : json;
    }

    return Promise.resolve({
      rawOutput,
      provider: this.provider,
      model: this.model,
      createdAt: new Date().toISOString(),
    });
  }

  private buildProposal(input: ModuleGeneratorProviderInput): ScaffoldProposal {
    const targetRoot =
      this.mode === 'unsafe_path' ? '../outside' : input.request.intent.normalizedTargetPath;

    const files: ScaffoldFileProposal[] = [
      {
        kind: 'create_file',
        targetFile: `${targetRoot}/index.ts`,
        content: this.buildIndexContent(input.request.intent.normalizedName),
        reason: 'Create public module entrypoint.',
      },
      {
        kind: 'create_file',
        targetFile: `${targetRoot}/${input.request.intent.normalizedName}.service.ts`,
        content: this.buildServiceContent(input.request.intent.normalizedName),
        reason: 'Create minimal service implementation.',
      },
      {
        kind: 'create_file',
        targetFile: `${targetRoot}/${input.request.intent.normalizedName}.types.ts`,
        content: this.buildTypesContent(input.request.intent.normalizedName),
        reason: 'Create module types.',
      },
    ];

    return {
      id: `scaffold-proposal-${input.request.intent.normalizedName}`,
      summary: `Create ${input.request.intent.moduleKind} module ${input.request.intent.normalizedName}.`,
      moduleName: input.request.intent.normalizedName,
      moduleKind: input.request.intent.moduleKind,
      targetRoot,
      riskLevel: 'low',
      files,
      explanation:
        'Deterministic fake scaffold proposal generated for runtime validation and diff preview.',
    };
  }

  private buildIndexContent(moduleName: string): string {
    return [
      `export * from './${moduleName}.service.js';`,
      `export * from './${moduleName}.types.js';`,
      '',
    ].join('\n');
  }

  private buildServiceContent(moduleName: string): string {
    const className = this.toPascalCase(moduleName);

    return [
      `import type { ${className}Config } from './${moduleName}.types.js';`,
      '',
      `export class ${className}Service {`,
      `  public constructor(private readonly config: ${className}Config) {}`,
      '',
      '  public getModuleName(): string {',
      `    return '${moduleName}';`,
      '  }',
      '}',
      '',
    ].join('\n');
  }

  private buildTypesContent(moduleName: string): string {
    const className = this.toPascalCase(moduleName);

    return [`export interface ${className}Config {`, '  enabled: boolean;', '}', ''].join('\n');
  }

  private toPascalCase(value: string): string {
    return value
      .split(/[-_]/g)
      .filter((part) => part.length > 0)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join('');
  }
}
