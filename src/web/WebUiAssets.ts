export interface WebUiAsset {
  contentType: string;
  body: string;
}

export class WebUiAssets {
  public get(pathname: string): WebUiAsset | null {
    if (pathname === '/' || pathname === '/index.html') {
      return {
        contentType: 'text/html; charset=utf-8',
        body: this.indexHtml(),
      };
    }

    if (pathname === '/app.js') {
      return {
        contentType: 'application/javascript; charset=utf-8',
        body: this.appJs(),
      };
    }

    if (pathname === '/styles.css') {
      return {
        contentType: 'text/css; charset=utf-8',
        body: this.stylesCss(),
      };
    }

    return null;
  }

  private indexHtml(): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Zero Runtime</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Local Runtime Cockpit</p>
        <h1>Zero Runtime</h1>
        <p class="subtitle">
          Control interactive coding sessions with runtime validation, project awareness and local snapshots.
        </p>
      </div>
      <div class="status-card">
        <span class="status-dot" id="healthDot"></span>
        <div>
          <strong id="healthLabel">Checking API...</strong>
          <p id="healthMeta">Local API server</p>
        </div>
      </div>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>Start session</h2>
        <label>
          Project root
          <input id="projectRoot" placeholder="C:\\\\Users\\\\LUCAS\\\\Desktop\\\\zero" />
        </label>
        <label>
          Project name
          <input id="projectName" placeholder="zero-runtime" />
        </label>
        <label>
          Goal
          <textarea id="goal" rows="4" placeholder="Build the next interactive platform step."></textarea>
        </label>
        <button id="startSession">Start session</button>
      </article>

      <article class="panel">
        <h2>Runtime command</h2>
        <label>
          Session ID
          <input id="sessionId" placeholder="interactive-session-..." />
        </label>
        <label>
          Command or instruction
          <textarea id="commandInput" rows="4" placeholder="/plan"></textarea>
        </label>
        <button id="sendCommand">Send command</button>
      </article>

      <article class="panel wide">
        <h2>Runtime output</h2>
        <pre id="output">{}</pre>
      </article>
    </section>
  </main>

  <script src="/app.js"></script>
</body>
</html>`;
  }

  private appJs(): string {
    return `const output = document.querySelector('#output');
const healthDot = document.querySelector('#healthDot');
const healthLabel = document.querySelector('#healthLabel');
const healthMeta = document.querySelector('#healthMeta');

function print(value) {
  output.textContent = JSON.stringify(value, null, 2);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

async function checkHealth() {
  try {
    const result = await api('/health');

    healthDot.classList.add('ok');
    healthLabel.textContent = result.status === 'ok' ? 'API online' : 'API unknown';
    healthMeta.textContent = result.service || 'zero-runtime-api';
  } catch (error) {
    healthDot.classList.remove('ok');
    healthLabel.textContent = 'API offline';
    healthMeta.textContent = error instanceof Error ? error.message : String(error);
  }
}

document.querySelector('#startSession').addEventListener('click', async () => {
  const projectRoot = document.querySelector('#projectRoot').value.trim();
  const projectName = document.querySelector('#projectName').value.trim();
  const goal = document.querySelector('#goal').value.trim();

  const result = await api('/sessions', {
    method: 'POST',
    body: {
      projectRoot,
      projectName,
      goal,
      createdBy: 'web-ui',
    },
  });

  if (result.session && result.session.id) {
    document.querySelector('#sessionId').value = result.session.id;
  }

  print(result);
});

document.querySelector('#sendCommand').addEventListener('click', async () => {
  const sessionId = document.querySelector('#sessionId').value.trim();
  const input = document.querySelector('#commandInput').value.trim();

  const result = await api('/sessions/' + encodeURIComponent(sessionId) + '/commands', {
    method: 'POST',
    body: {
      input,
    },
  });

  print(result);
});

checkHealth();`;
  }

  private stylesCss(): string {
    return `:root {
  color-scheme: dark;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #080b12;
  color: #eef3ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.22), transparent 32rem),
    linear-gradient(135deg, #080b12 0%, #111827 100%);
}

.shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 48px 0;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 28px;
}

.eyebrow {
  color: #93c5fd;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 12px;
}

h1 {
  margin: 0;
  font-size: clamp(42px, 8vw, 82px);
  line-height: 0.95;
}

.subtitle {
  color: #b9c4d8;
  max-width: 680px;
  font-size: 18px;
  line-height: 1.6;
}

.status-card,
.panel {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.76);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 80px rgba(0, 0, 0, 0.28);
  border-radius: 24px;
}

.status-card {
  min-width: 240px;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.status-card p {
  margin: 4px 0 0;
  color: #94a3b8;
}

.status-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.12);
}

.status-dot.ok {
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel {
  padding: 22px;
}

.panel.wide {
  grid-column: 1 / -1;
}

h2 {
  margin: 0 0 18px;
  font-size: 22px;
}

label {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
  color: #cbd5e1;
  font-weight: 600;
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(2, 6, 23, 0.72);
  color: #f8fafc;
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
}

textarea {
  resize: vertical;
}

button {
  border: 0;
  border-radius: 14px;
  padding: 12px 16px;
  color: #06101f;
  background: #93c5fd;
  font-weight: 800;
  cursor: pointer;
}

button:hover {
  background: #bfdbfe;
}

pre {
  margin: 0;
  min-height: 260px;
  max-height: 460px;
  overflow: auto;
  border-radius: 18px;
  padding: 18px;
  background: rgba(2, 6, 23, 0.84);
  color: #dbeafe;
}

@media (max-width: 820px) {
  .hero,
  .grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .status-card {
    width: 100%;
  }
}`;
  }
}
