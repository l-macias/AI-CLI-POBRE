import type { ControllerImportMap } from './ControllerResolver.js';
import type { ApiRouteMiddlewareRef } from './ApiRouteMap.js';

export class MiddlewareResolver {
  public resolve(input: {
    candidateNames: string[];
    imports: ControllerImportMap;
  }): ApiRouteMiddlewareRef[] {
    return input.candidateNames.map((name) => {
      const imported = input.imports[name];

      return {
        name,
        ...(imported?.importPath ? { importPath: imported.importPath } : {}),
        ...(imported?.resolvedFile ? { resolvedFile: imported.resolvedFile } : {}),
      };
    });
  }
}
