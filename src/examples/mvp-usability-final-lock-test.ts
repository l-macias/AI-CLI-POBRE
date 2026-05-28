import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface PackageJson {
  scripts?: Record<string, string>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(relativePath: string): string {
  const absolutePath = path.resolve(relativePath);

  assert(existsSync(absolutePath), `Expected file to exist: ${relativePath}`);

  return readFileSync(absolutePath, 'utf8');
}

function readPackageJson(): PackageJson {
  return JSON.parse(readText('package.json')) as PackageJson;
}

function requireScript(scripts: Record<string, string>, name: string): string {
  const script = scripts[name];

  assert(script, `Expected package script: ${name}`);

  return script;
}

function requireIncludes(input: { file: string; content: string; expected: string }): void {
  assert(
    input.content.includes(input.expected),
    `Expected ${input.file} to include: ${input.expected}`,
  );
}

const filesToCheck = [
  'ui/src/components/dashboard/DashboardQuickActions.tsx',
  'ui/src/components/dashboard/CurrentProjectCard.tsx',
  'ui/src/components/session/ChatPanel.tsx',
  'ui/src/pages/ProjectsPage.tsx',
  'ui/src/pages/SessionPage.tsx',
  'ui/src/components/session/PlanPanel.tsx',
  'ui/src/components/session/PatchPanel.tsx',
  'ui/src/components/reports/ReportExportPanel.tsx',
  'ui/src/components/artifacts/RuntimeArtifactStorePanel.tsx',
  'ui/src/styles.css',
];

for (const file of filesToCheck) {
  assert(existsSync(path.resolve(file)), `Expected UI file: ${file}`);
}

const quickActions = readText('ui/src/components/dashboard/DashboardQuickActions.tsx');
const currentProject = readText('ui/src/components/dashboard/CurrentProjectCard.tsx');
const chatPanel = readText('ui/src/components/session/ChatPanel.tsx');
const projectsPage = readText('ui/src/pages/ProjectsPage.tsx');
const sessionPage = readText('ui/src/pages/SessionPage.tsx');
const planPanel = readText('ui/src/components/session/PlanPanel.tsx');
const patchPanel = readText('ui/src/components/session/PatchPanel.tsx');
const reportPanel = readText('ui/src/components/reports/ReportExportPanel.tsx');
const artifactPanel = readText('ui/src/components/artifacts/RuntimeArtifactStorePanel.tsx');
const styles = readText('ui/src/styles.css');

requireIncludes({
  file: 'DashboardQuickActions.tsx',
  content: quickActions,
  expected: 'Start here',
});

requireIncludes({
  file: 'DashboardQuickActions.tsx',
  content: quickActions,
  expected: 'plan → patch → sandbox → report',
});

requireIncludes({
  file: 'CurrentProjectCard.tsx',
  content: currentProject,
  expected: 'Select Project',
});

requireIncludes({
  file: 'ChatPanel.tsx',
  content: chatPanel,
  expected: 'Session notes',
});

requireIncludes({
  file: 'ChatPanel.tsx',
  content: chatPanel,
  expected: 'prepare project → create plan → create patch',
});

requireIncludes({
  file: 'ProjectsPage.tsx',
  content: projectsPage,
  expected: 'Select a local project',
});

requireIncludes({
  file: 'ProjectsPage.tsx',
  content: projectsPage,
  expected: 'Scan and use project',
});

requireIncludes({
  file: 'SessionPage.tsx',
  content: sessionPage,
  expected: 'sessionGoalTemplates',
});

requireIncludes({
  file: 'SessionPage.tsx',
  content: sessionPage,
  expected: 'Start guided runtime session',
});

requireIncludes({
  file: 'SessionPage.tsx',
  content: sessionPage,
  expected: 'MVP demo completion',
});

requireIncludes({
  file: 'PlanPanel.tsx',
  content: planPanel,
  expected: 'Implementation plan',
});

requireIncludes({
  file: 'PlanPanel.tsx',
  content: planPanel,
  expected: 'The plan is the controlled blueprint',
});

requireIncludes({
  file: 'PatchPanel.tsx',
  content: patchPanel,
  expected: 'Patch lifecycle',
});

requireIncludes({
  file: 'PatchPanel.tsx',
  content: patchPanel,
  expected: 'Sandbox needs recovery',
});

requireIncludes({
  file: 'ReportExportPanel.tsx',
  content: reportPanel,
  expected: 'Demo evidence exported',
});

requireIncludes({
  file: 'RuntimeArtifactStorePanel.tsx',
  content: artifactPanel,
  expected: 'No active artifacts found',
});

requireIncludes({
  file: 'styles.css',
  content: styles,
  expected: '97.C.1 — MVP demo flow / empty state polish',
});

requireIncludes({
  file: 'styles.css',
  content: styles,
  expected: '97.C.2 — Projects onboarding polish',
});

requireIncludes({
  file: 'styles.css',
  content: styles,
  expected: '97.C.3 — Guided plan/patch panels',
});

requireIncludes({
  file: 'styles.css',
  content: styles,
  expected: '97.C.4 — Session start guided flow',
});

requireIncludes({
  file: 'styles.css',
  content: styles,
  expected: '97.C.5 — Report/artifact completion guidance',
});

const scripts = readPackageJson().scripts ?? {};
const usabilityScript = requireScript(scripts, 'usability:final-lock:test');

assert(
  usabilityScript === 'tsx src/examples/mvp-usability-final-lock-test.ts',
  'Expected usability final lock script to point to mvp-usability-final-lock-test.ts.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'mvp-usability-final-lock-test',
      checkedFiles: filesToCheck.length,
      lockedAreas: [
        'dashboard onboarding',
        'project selection flow',
        'session goal templates',
        'guided plan panel',
        'guided patch panel',
        'report completion guidance',
        'artifact empty states',
      ],
    },
    null,
    2,
  ),
);
