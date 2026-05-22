export interface ReactProfileResult {
  hasReact: boolean;
  hasVite: boolean;
  hasNext: boolean;
  componentFiles: string[];
  appEntryFiles: string[];
}

export class ReactProfile {
  public detect(input: {
    files: string[];
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }): ReactProfileResult {
    const allDependencies = {
      ...input.dependencies,
      ...input.devDependencies,
    };

    const componentFiles = input.files.filter((file) => {
      return (
        (file.endsWith('.tsx') || file.endsWith('.jsx')) &&
        (file.includes('/components/') ||
          file.includes('\\components\\') ||
          /^[^/\\]+\.tsx$/.test(file))
      );
    });

    const appEntryFiles = input.files.filter((file) => {
      const normalized = file.replaceAll('\\', '/');

      return (
        normalized.endsWith('src/main.tsx') ||
        normalized.endsWith('src/main.jsx') ||
        normalized.endsWith('src/App.tsx') ||
        normalized.endsWith('src/App.jsx') ||
        normalized.endsWith('app/page.tsx') ||
        normalized.endsWith('pages/_app.tsx')
      );
    });

    return {
      hasReact: 'react' in allDependencies || componentFiles.length > 0,
      hasVite:
        'vite' in allDependencies || input.files.some((file) => file.includes('vite.config')),
      hasNext:
        'next' in allDependencies || input.files.some((file) => file.includes('next.config')),
      componentFiles,
      appEntryFiles,
    };
  }
}
