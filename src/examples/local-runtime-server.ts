import { RuntimeApiServer } from '../api/RuntimeApiServer.js';

const server = new RuntimeApiServer({
  config: {
    host: '127.0.0.1',
    port: 17871,
  },
});

const started = await server.start();

console.log(
  JSON.stringify(
    {
      status: 'ok',
      service: 'zero-runtime-local-server',
      url: started.url,
      api: `${started.url}/api/health`,
      events: `${started.url}/api/events`,
      uiProxyTarget: started.url,
    },
    null,
    2,
  ),
);

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Stopping Zero Runtime local server...`);
  await server.stop();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
