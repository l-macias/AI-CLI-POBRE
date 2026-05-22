export interface ExpressProfileResult {
  hasExpress: boolean;
  routeFiles: string[];
  controllerFiles: string[];
  middlewareFiles: string[];
  serverEntryFiles: string[];
}

export class ExpressProfile {
  public detect(input: {
    files: string[];
    dependencies: Record<string, string>;
    fileContents: Record<string, string>;
  }): ExpressProfileResult {
    const routeFiles = input.files.filter((file) => {
      const normalized = file.replaceAll('\\', '/').toLowerCase();

      return (
        normalized.includes('/routes/') ||
        normalized.endsWith('routes.ts') ||
        normalized.endsWith('routes.js')
      );
    });

    const controllerFiles = input.files.filter((file) => {
      const normalized = file.replaceAll('\\', '/').toLowerCase();

      return normalized.includes('/controllers/') || normalized.includes('controller');
    });

    const middlewareFiles = input.files.filter((file) => {
      const normalized = file.replaceAll('\\', '/').toLowerCase();

      return (
        normalized.includes('/middlewares/') ||
        normalized.includes('/middleware/') ||
        normalized.includes('middleware')
      );
    });

    const serverEntryFiles = input.files.filter((file) => {
      const normalized = file.replaceAll('\\', '/').toLowerCase();
      const content = input.fileContents[file] ?? '';

      return (
        normalized.endsWith('server.ts') ||
        normalized.endsWith('server.js') ||
        normalized.endsWith('app.ts') ||
        normalized.endsWith('app.js') ||
        content.includes('express()') ||
        content.includes("from 'express'") ||
        content.includes('from "express"') ||
        content.includes("require('express')") ||
        content.includes('require("express")')
      );
    });

    return {
      hasExpress:
        'express' in input.dependencies || serverEntryFiles.length > 0 || routeFiles.length > 0,
      routeFiles,
      controllerFiles,
      middlewareFiles,
      serverEntryFiles,
    };
  }
}
