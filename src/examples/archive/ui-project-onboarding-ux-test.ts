import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

interface PackageJson {
  scripts?: Record<string, unknown>;
}

interface UxCheck {
  name: string;
  status: 'passed';
  detail: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);

    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function readText(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readText(filePath);
  const parsed = JSON.parse(raw) as unknown;

  return parsed as T;
}

function checkIncludes(input: {
  content: string;
  expected: string;
  filePath: string;
  reason: string;
}): void {
  assert(
    input.content.includes(input.expected),
    `${input.filePath} should include "${input.expected}" because ${input.reason}.`,
  );
}

function checkAllIncludes(input: {
  content: string;
  expected: string[];
  filePath: string;
  reason: string;
}): void {
  for (const expected of input.expected) {
    checkIncludes({
      content: input.content,
      expected,
      filePath: input.filePath,
      reason: input.reason,
    });
  }
}

function requireScript(scripts: Record<string, unknown>, name: string): string {
  const script = scripts[name];

  assert(typeof script === 'string' && script.length > 0, `Expected package script: ${name}`);

  return script;
}

const root = process.cwd();

const packageJsonPath = path.resolve(root, 'package.json');
const appPath = path.resolve(root, 'ui/src/App.tsx');
const projectsPagePath = path.resolve(root, 'ui/src/pages/ProjectsPage.tsx');
const sessionPagePath = path.resolve(root, 'ui/src/pages/SessionPage.tsx');
const dashboardPath = path.resolve(root, 'ui/src/components/dashboard/ProjectDashboard.tsx');
const quickActionsPath = path.resolve(
  root,
  'ui/src/components/dashboard/DashboardQuickActions.tsx',
);
const currentProjectCardPath = path.resolve(
  root,
  'ui/src/components/dashboard/CurrentProjectCard.tsx',
);
const uiReadinessTestPath = path.resolve(root, 'src/examples/ui-runtime-readiness-smoke-test.ts');
const stylesPath = path.resolve(root, 'ui/src/styles.css');

const requiredFiles = [
  packageJsonPath,
  appPath,
  projectsPagePath,
  sessionPagePath,
  dashboardPath,
  quickActionsPath,
  currentProjectCardPath,
  uiReadinessTestPath,
  stylesPath,
];

for (const file of requiredFiles) {
  assert(await fileExists(file), `Expected file to exist: ${file}`);
}

const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
const scripts = packageJson.scripts ?? {};

const app = await readText(appPath);
const projectsPage = await readText(projectsPagePath);
const sessionPage = await readText(sessionPagePath);
const dashboard = await readText(dashboardPath);
const quickActions = await readText(quickActionsPath);
const currentProjectCard = await readText(currentProjectCardPath);
const uiReadinessTest = await readText(uiReadinessTestPath);
const styles = await readText(stylesPath);

const checks: UxCheck[] = [];

checkAllIncludes({
  content: app,
  filePath: appPath,
  expected: [
    'openGuidedSession',
    'onStartSession={openGuidedSession}',
    "setPage('session')",
    'setActiveSession(null)',
  ],
  reason: 'App should connect project onboarding to the Session page',
});

checks.push({
  name: 'app-project-to-session-navigation',
  status: 'passed',
  detail: 'Projects can navigate directly into a fresh guided session.',
});

checkAllIncludes({
  content: projectsPage,
  filePath: projectsPagePath,
  expected: [
    'Open a local project',
    'Choose the project folder',
    'Scan and use',
    'Project summary',

    'Start guided session',

    'onStartSession',
    'startGuidedSession',
    'project-onboarding-page',
    'project-onboarding-hero',
    'project-session-cta',
  ],
  reason: 'ProjectsPage should expose a professional guided project onboarding flow',
});

checks.push({
  name: 'projects-guided-onboarding',
  status: 'passed',
  detail: 'Projects page uses guided copy, clear selection, scan and start-session CTA.',
});

checkAllIncludes({
  content: sessionPage,
  filePath: sessionPagePath,
  expected: [
    'Create your guided runtime session',
    'sessionStartLoading',
    'startReadiness',
    'StartReadinessItem',
    'selectGoalTemplate',
    'session-start-readiness-card',
    'session-goal-template-grid-modern',
    'Start guided session',
    'Starting and preparing workflow...',
    'applyPreparedWorkflow',
    'prepareWorkflowForSession',
    'await prepareWorkflowForSession(created)',
    'Start the session and Zero will automatically prepare the workflow',
  ],
  reason: 'SessionPage should make first session creation guided and auto-prepare workflow',
});

checks.push({
  name: 'session-guided-entry',
  status: 'passed',
  detail: 'Session start has readiness, templates, clear CTA and automatic workflow preparation.',
});

checkAllIncludes({
  content: sessionPage,
  filePath: sessionPagePath,
  expected: [
    'prepareRuntimeWorkflow',
    'createDefaultTasks: true',
    'setStackIntelligence(workflow.stack)',
    'setApiRoutes(workflow.apiRoutes)',
    'setFrontendBackendLinks(workflow.frontendBackend)',
    'setPackageScripts(workflow.verifyScripts)',
    'setQuestions(workflow.questions.questions)',
    'setSuggestions(workflow.suggestions)',
  ],
  reason: 'Auto workflow preparation should hydrate project intelligence after session start',
});

checks.push({
  name: 'auto-workflow-preparation',
  status: 'passed',
  detail:
    'Session creation automatically prepares stack, routes, links, scripts, tasks and questions.',
});

checkAllIncludes({
  content: dashboard,
  filePath: dashboardPath,
  expected: [
    '<CurrentProjectCard',
    '<DashboardQuickActions',
    "onNavigate('projects')",
    "onNavigate('session')",
  ],
  reason: 'Dashboard should still route users clearly to Projects and Session',
});

checkAllIncludes({
  content: quickActions,
  filePath: quickActionsPath,
  expected: ['Start here', '1. Select project', '2. Start session', 'Select a local project first'],
  reason: 'Dashboard quick actions should preserve the onboarding path',
});

checkAllIncludes({
  content: currentProjectCard,
  filePath: currentProjectCardPath,
  expected: [
    'Current project',
    'No project selected yet.',
    'Select Project',
    'Zero can create a guided',
  ],
  reason: 'Current project card should explain why project selection matters',
});

checks.push({
  name: 'dashboard-onboarding-path',
  status: 'passed',
  detail: 'Dashboard keeps a clear route into project selection and session start.',
});

checkAllIncludes({
  content: uiReadinessTest,
  filePath: uiReadinessTestPath,
  expected: [
    'Open a local project',
    'Choose the project folder',
    'Scan and use',
    'Project summary',
    'Start guided session',

    'guided browse/select/scan onboarding',
  ],
  reason: 'UI readiness smoke test should track the new project onboarding UX',
});

checks.push({
  name: 'ui-readiness-updated',
  status: 'passed',
  detail: 'Existing UI readiness smoke now validates the new onboarding copy.',
});

checkAllIncludes({
  content: styles,
  filePath: stylesPath,
  expected: [
    '98.A — Project Onboarding Guided Layout',
    'project-onboarding-page',
    'project-onboarding-hero',
    'project-browser-modern',
    'project-readiness-list',
    '98.B — Project Ready CTA',
    'project-session-cta',
    '98.C — Session Start Guided Entry',
    'session-start-guided-modern',
    'session-start-readiness-card',
    'session-workflow-start-card',
  ],
  reason: 'styles.css should include project onboarding and guided session UX sections',
});

checks.push({
  name: 'onboarding-styles-locked',
  status: 'passed',
  detail: 'Project onboarding and guided session CSS sections are present.',
});

const uiReadinessScript = requireScript(scripts, 'ui:runtime-readiness:test');
const guidedWorkflowScript = requireScript(scripts, 'ui:guided-workflow-ux:test');

assert(
  uiReadinessScript.includes('src/examples/ui-runtime-readiness-smoke-test.ts'),
  'ui:runtime-readiness:test should point to UI runtime readiness smoke.',
);

assert(
  guidedWorkflowScript.includes('src/examples/ui-guided-workflow-ux-polish-test.ts'),
  'ui:guided-workflow-ux:test should point to guided workflow UX polish test.',
);

checks.push({
  name: 'existing-ui-scripts',
  status: 'passed',
  detail: 'Existing UI readiness and guided workflow UX scripts remain wired.',
});

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'ui-project-onboarding-ux-test',
      checks,
      lockedUxPrinciples: [
        'Project onboarding starts with a clear local-first guided flow.',
        'Folder selection, scan and project summary are visually separated.',
        'A scanned project exposes a clear Start guided session CTA.',
        'Session start explains readiness before asking the user to continue.',
        'Session creation automatically prepares workflow intelligence.',
        'Dashboard keeps the user oriented toward Projects and Session.',
      ],
    },
    null,
    2,
  ),
);
