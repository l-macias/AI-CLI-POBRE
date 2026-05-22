import { RuntimeApiServer } from '../api/RuntimeApiServer.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function getText(url: string): Promise<{
  contentType: string;
  body: string;
}> {
  const response = await fetch(url);

  return {
    contentType: response.headers.get('content-type') ?? '',
    body: await response.text(),
  };
}

const server = new RuntimeApiServer({
  config: {
    port: 17873,
  },
});

const started = await server.start();

try {
  const html = await getText(`${started.url}/`);

  assert(html.contentType.includes('text/html'), 'root should serve HTML');
  assert(html.body.includes('Zero Runtime'), 'HTML should include app title');
  assert(html.body.includes('/app.js'), 'HTML should reference app.js');
  assert(html.body.includes('/styles.css'), 'HTML should reference styles.css');

  const js = await getText(`${started.url}/app.js`);

  assert(js.contentType.includes('application/javascript'), 'app.js should serve JavaScript');
  assert(js.body.includes('/health'), 'app.js should call health endpoint');

  const css = await getText(`${started.url}/styles.css`);

  assert(css.contentType.includes('text/css'), 'styles.css should serve CSS');
  assert(css.body.includes('.shell'), 'CSS should include shell styles');

  const healthResponse = await fetch(`${started.url}/health`);
  const health = (await healthResponse.json()) as { status?: string };

  assert(health.status === 'ok', 'API should still respond under web server');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'web-ui-base-test',
        url: started.url,
        routes: ['/', '/app.js', '/styles.css', '/health'],
      },
      null,
      2,
    ),
  );
} finally {
  await server.stop();
}
