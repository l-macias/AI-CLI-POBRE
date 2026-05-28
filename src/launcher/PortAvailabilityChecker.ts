import { createServer } from 'node:net';

export interface PortAvailabilityCheckInput {
  host: string;
  port: number;
}

export interface PortAvailabilityCheckResult {
  host: string;
  port: number;
  available: boolean;
  message: string;
}

export class PortAvailabilityChecker {
  public async check(input: PortAvailabilityCheckInput): Promise<PortAvailabilityCheckResult> {
    return new Promise<PortAvailabilityCheckResult>((resolveCheck) => {
      const server = createServer();

      const finish = (result: PortAvailabilityCheckResult): void => {
        server.removeAllListeners();

        if (server.listening) {
          server.close(() => {
            resolveCheck(result);
          });
          return;
        }

        resolveCheck(result);
      };

      server.once('error', (error: NodeJS.ErrnoException) => {
        const isBusy = error.code === 'EADDRINUSE';

        finish({
          host: input.host,
          port: input.port,
          available: false,
          message: isBusy
            ? `Port ${input.port} is already in use on ${input.host}.`
            : `Port ${input.port} is not available on ${input.host}: ${error.message}`,
        });
      });

      server.once('listening', () => {
        finish({
          host: input.host,
          port: input.port,
          available: true,
          message: `Port ${input.port} is available on ${input.host}.`,
        });
      });

      server.listen(input.port, input.host);
    });
  }
}
