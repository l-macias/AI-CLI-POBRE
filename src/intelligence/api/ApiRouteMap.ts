export type ApiHttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD'
  | 'UNKNOWN';

export interface ApiRouteControllerRef {
  name: string;
  importPath?: string | undefined;
  resolvedFile?: string | undefined;
}

export interface ApiRouteMiddlewareRef {
  name: string;
  importPath?: string | undefined;
  resolvedFile?: string | undefined;
}

export interface ApiRouteDefinition {
  id: string;
  method: ApiHttpMethod;
  path: string;
  sourceFile: string;
  routerVariable: string;
  controller?: ApiRouteControllerRef | undefined;
  middlewares: ApiRouteMiddlewareRef[];
  lineNumber: number;
  raw: string;
}

export interface ApiRouteMap {
  projectRoot: string;
  routes: ApiRouteDefinition[];
  routeFiles: string[];
  controllerFiles: string[];
  middlewareFiles: string[];
  generatedAt: string;
}
