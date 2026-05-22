import type { ApiRouteDefinition, ApiRouteMap } from '../api/ApiRouteMap.js';
import { AxiosUsageScanner, type AxiosUsage } from './AxiosUsageScanner.js';
import { FetchUsageScanner, type FetchUsage } from './FetchUsageScanner.js';

export interface FrontendApiUsage {
  id: string;
  sourceFile: string;
  endpoint: string;
  method: string;
  lineNumber: number;
  raw: string;
  transport: 'fetch' | 'axios';
}

export interface FrontendBackendLink {
  id: string;
  usage: FrontendApiUsage;
  route?: ApiRouteDefinition | undefined;
  matchType: 'exact' | 'method_mismatch' | 'missing_backend_route';
}

export interface FrontendBackendLinkResult {
  projectRoot: string;
  usages: FrontendApiUsage[];
  links: FrontendBackendLink[];
  generatedAt: string;
}

export interface FrontendBackendLinkerOptions {
  fetchScanner?: FetchUsageScanner | undefined;
  axiosScanner?: AxiosUsageScanner | undefined;
}

export class FrontendBackendLinker {
  private readonly fetchScanner: FetchUsageScanner;
  private readonly axiosScanner: AxiosUsageScanner;

  public constructor(options: FrontendBackendLinkerOptions = {}) {
    this.fetchScanner = options.fetchScanner ?? new FetchUsageScanner();
    this.axiosScanner = options.axiosScanner ?? new AxiosUsageScanner();
  }

  public async link(input: {
    projectRoot: string;
    routeMap: ApiRouteMap;
  }): Promise<FrontendBackendLinkResult> {
    const fetchResult = await this.fetchScanner.scan(input.projectRoot);
    const axiosResult = await this.axiosScanner.scan(input.projectRoot);

    const usages = [
      ...fetchResult.usages.map((usage) => this.fromFetchUsage(usage)),
      ...axiosResult.usages.map((usage) => this.fromAxiosUsage(usage)),
    ];

    const links = usages.map((usage) => this.linkUsage(usage, input.routeMap.routes));

    return {
      projectRoot: input.projectRoot,
      usages,
      links,
      generatedAt: new Date().toISOString(),
    };
  }

  private linkUsage(usage: FrontendApiUsage, routes: ApiRouteDefinition[]): FrontendBackendLink {
    const normalizedUsagePath = this.normalizeEndpoint(usage.endpoint);

    const exact = routes.find((route) => {
      return (
        route.method === usage.method && this.normalizeEndpoint(route.path) === normalizedUsagePath
      );
    });

    if (exact) {
      return {
        id: this.createLinkId(usage, 'exact'),
        usage,
        route: exact,
        matchType: 'exact',
      };
    }

    const pathOnly = routes.find((route) => {
      return this.normalizeEndpoint(route.path) === normalizedUsagePath;
    });

    if (pathOnly) {
      return {
        id: this.createLinkId(usage, 'method-mismatch'),
        usage,
        route: pathOnly,
        matchType: 'method_mismatch',
      };
    }

    return {
      id: this.createLinkId(usage, 'missing'),
      usage,
      matchType: 'missing_backend_route',
    };
  }

  private normalizeEndpoint(endpoint: string): string {
    const withoutOrigin = endpoint.replace(/^https?:\/\/[^/]+/, '');
    const withoutQuery = withoutOrigin.split('?')[0] ?? withoutOrigin;

    if (withoutQuery.length === 0) {
      return '/';
    }

    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  }

  private fromFetchUsage(usage: FetchUsage): FrontendApiUsage {
    return {
      id: usage.id,
      sourceFile: usage.sourceFile,
      endpoint: usage.endpoint,
      method: usage.method,
      lineNumber: usage.lineNumber,
      raw: usage.raw,
      transport: 'fetch',
    };
  }

  private fromAxiosUsage(usage: AxiosUsage): FrontendApiUsage {
    return {
      id: usage.id,
      sourceFile: usage.sourceFile,
      endpoint: usage.endpoint,
      method: usage.method,
      lineNumber: usage.lineNumber,
      raw: usage.raw,
      transport: 'axios',
    };
  }

  private createLinkId(usage: FrontendApiUsage, suffix: string): string {
    const slug = `${usage.sourceFile}-${usage.method}-${usage.endpoint}-${suffix}`
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    return `frontend-backend-link-${slug}`;
  }
}
