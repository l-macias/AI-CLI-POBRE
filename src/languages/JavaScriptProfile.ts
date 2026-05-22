export interface JavaScriptProfileResult {
  hasJavaScript: boolean;
  sourceFiles: string[];
  configFiles: string[];
  packageType: 'module' | 'commonjs' | 'unknown';
}

export class JavaScriptProfile {
  public detect(input: {
    files: string[];
    packageJson?:
      | {
          type?: string | undefined;
        }
      | undefined;
  }): JavaScriptProfileResult {
    const sourceFiles = input.files.filter((file) => {
      return (
        file.endsWith('.js') ||
        file.endsWith('.jsx') ||
        file.endsWith('.mjs') ||
        file.endsWith('.cjs')
      );
    });

    const configFiles = input.files.filter((file) => {
      return (
        file.endsWith('package.json') ||
        file.endsWith('vite.config.js') ||
        file.endsWith('next.config.js') ||
        file.endsWith('eslint.config.js')
      );
    });

    return {
      hasJavaScript: sourceFiles.length > 0 || configFiles.length > 0,
      sourceFiles,
      configFiles,
      packageType: this.resolvePackageType(input.packageJson?.type),
    };
  }

  private resolvePackageType(type: string | undefined): 'module' | 'commonjs' | 'unknown' {
    if (type === 'module') {
      return 'module';
    }

    if (type === 'commonjs') {
      return 'commonjs';
    }

    return 'unknown';
  }
}
