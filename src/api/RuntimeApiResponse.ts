import type { JsonObject } from '../types/SharedTypes.js';
import type { RuntimeApiIssue, RuntimeApiRouteResult } from './RuntimeApiTypes.js';

export class RuntimeApiResponse {
  public ok(body: JsonObject = {}): RuntimeApiRouteResult {
    return {
      statusCode: 200,
      body: {
        status: 'ok',
        ...body,
      },
    };
  }

  public created(body: JsonObject = {}): RuntimeApiRouteResult {
    return {
      statusCode: 201,
      body: {
        status: 'ok',
        ...body,
      },
    };
  }

  public error(statusCode: number, issues: RuntimeApiIssue[]): RuntimeApiRouteResult {
    return {
      statusCode,
      body: {
        status: 'error',
        issues: issues.map((issue) => {
          return {
            code: issue.code,
            message: issue.message,
          };
        }),
      },
    };
  }

  public notFound(path: string): RuntimeApiRouteResult {
    return this.error(404, [
      {
        code: 'RUNTIME_API_ROUTE_NOT_FOUND',
        message: `Runtime API route not found: ${path}`,
      },
    ]);
  }
}
