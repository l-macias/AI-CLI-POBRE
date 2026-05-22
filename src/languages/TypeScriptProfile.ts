export interface TypeScriptProfileResult {
  hasTypeScript: boolean;
  sourceFiles: string[];
  configFiles: string[];
  strictLikely: boolean;
}

export class TypeScriptProfile {
  public detect(input: {
    files: string[];
    tsconfigText?: string | undefined;
  }): TypeScriptProfileResult {
    const sourceFiles = input.files.filter((file) => {
      return (
        file.endsWith('.ts') ||
        file.endsWith('.tsx') ||
        file.endsWith('.mts') ||
        file.endsWith('.cts')
      );
    });

    const configFiles = input.files.filter((file) => {
      return file.endsWith('tsconfig.json') || file.endsWith('tsconfig.node.json');
    });

    return {
      hasTypeScript: sourceFiles.length > 0 || configFiles.length > 0,
      sourceFiles,
      configFiles,
      strictLikely: input.tsconfigText?.includes('"strict"') ?? false,
    };
  }
}
