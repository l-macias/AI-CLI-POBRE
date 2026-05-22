import type { IncomingMessage } from 'node:http';
import type { JsonValue } from '../types/SharedTypes.js';
import type { RuntimeApiMethod, RuntimeApiRequest } from './RuntimeApiTypes.js';

export class RuntimeApiRequestParser {
  public async parse(request: IncomingMessage): Promise<RuntimeApiRequest> {
    const method = this.parseMethod(request.method);
    const url = new URL(request.url ?? '/', 'http://localhost');
    const body = await this.parseBody(request);

    return {
      method,
      path: url.pathname,
      headers: request.headers,
      query: url.searchParams,
      body,
    };
  }

  private parseMethod(method: string | undefined): RuntimeApiMethod {
    if (method === 'POST') {
      return 'POST';
    }

    return 'GET';
  }

  private async parseBody(request: IncomingMessage): Promise<JsonValue | null> {
    if (request.method !== 'POST') {
      return null;
    }

    const chunks: Buffer[] = [];

    for await (const chunk of request) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        continue;
      }

      chunks.push(Buffer.from(String(chunk)));
    }

    const raw = Buffer.concat(chunks).toString('utf8').trim();

    if (raw.length === 0) {
      return null;
    }

    return JSON.parse(raw) as JsonValue;
  }
}
