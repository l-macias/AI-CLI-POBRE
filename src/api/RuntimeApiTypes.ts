import type { IncomingHttpHeaders } from 'node:http';
import type { JsonObject, JsonValue } from '../types/SharedTypes.js';

export type RuntimeApiMethod = 'GET' | 'POST';

export interface RuntimeApiRequest {
  method: RuntimeApiMethod;
  path: string;
  headers: IncomingHttpHeaders;
  query: URLSearchParams;
  body: JsonValue | null;
}

export interface RuntimeApiRouteResult {
  statusCode: number;
  body: JsonObject;
}

export interface RuntimeApiIssue {
  code: string;
  message: string;
}

export interface RuntimeApiServerConfig {
  host: string;
  port: number;
}

export interface RuntimeApiStartResult {
  host: string;
  port: number;
  url: string;
}
