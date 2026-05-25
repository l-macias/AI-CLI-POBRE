import { PatchRiskPolicy } from '../patches/PatchRiskPolicy.js';
import type { PatchFileChange } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function file(input: {
  path: string;
  operation?: PatchFileChange['operation'];
  riskLevel?: PatchFileChange['riskLevel'];
}): PatchFileChange {
  return {
    path: input.path,
    operation: input.operation ?? 'modify',
    beforeHash: 'hash',
    content: 'content',
    reason: `Patch risk policy test file: ${input.path}`,
    changesSummary: [`Risk policy test summary for ${input.path}.`],
    riskLevel: input.riskLevel ?? 'low',
    userSelectable: true,
  };
}

const policy = new PatchRiskPolicy();

const singleUiRisk = policy.riskForFile({
  path: 'ui/src/components/Button.tsx',
  operation: 'modify',
  totalFiles: 1,
});

assert(singleUiRisk === 'low', 'Expected single UI file to be low risk.');

const multiUiRisk = policy.riskForFile({
  path: 'ui/src/components/Button.tsx',
  operation: 'modify',
  totalFiles: 2,
});

assert(multiUiRisk === 'medium', 'Expected small multi-file UI patch to be medium risk.');

const securityRisk = policy.riskForFile({
  path: 'src/security/PromptInjectionScanner.ts',
  operation: 'modify',
  totalFiles: 1,
});

assert(securityRisk === 'high', 'Expected security-sensitive path to be high risk.');

const databaseRisk = policy.riskForFile({
  path: 'src/prisma/schema.prisma',
  operation: 'modify',
  totalFiles: 1,
});

assert(databaseRisk === 'high', 'Expected database-sensitive path to be high risk.');

const dependencyRisk = policy.riskForFile({
  path: 'package.json',
  operation: 'modify',
  totalFiles: 1,
});

assert(dependencyRisk === 'high', 'Expected dependency-sensitive path to be high risk.');

const deleteRisk = policy.riskForFile({
  path: 'ui/src/components/Button.tsx',
  operation: 'delete',
  totalFiles: 1,
});

assert(deleteRisk === 'high', 'Expected delete operation to be high risk.');

const lowAnalysis = policy.analyze([file({ path: 'ui/src/components/Button.tsx' })]);

assert(lowAnalysis.highestRisk === 'low', 'Expected low-impact single UI patch to be low risk.');
assert(
  lowAnalysis.risks.some((risk) => risk.code === 'LOW_RISK_PATCH_PROPOSAL'),
  'Expected low-risk patch proposal risk code.',
);

const smallMultiAnalysis = policy.analyze([
  file({ path: 'ui/src/components/Button.tsx' }),
  file({ path: 'ui/src/components/Card.tsx' }),
]);

assert(
  smallMultiAnalysis.highestRisk === 'medium',
  'Expected small multi-file patch to be medium risk.',
);
assert(
  smallMultiAnalysis.risks.some((risk) => risk.code === 'SMALL_MULTI_FILE_PATCH'),
  'Expected small multi-file patch risk code.',
);

const largeMultiAnalysis = policy.analyze([
  file({ path: 'ui/src/a.tsx' }),
  file({ path: 'ui/src/b.tsx' }),
  file({ path: 'ui/src/c.tsx' }),
  file({ path: 'ui/src/d.tsx' }),
  file({ path: 'ui/src/e.tsx' }),
  file({ path: 'ui/src/f.tsx' }),
]);

assert(
  largeMultiAnalysis.highestRisk === 'high',
  'Expected large multi-file patch to be high risk.',
);
assert(
  largeMultiAnalysis.risks.some((risk) => risk.code === 'LARGE_MULTI_FILE_PATCH'),
  'Expected large multi-file patch risk code.',
);

const mixedAnalysis = policy.analyze([
  file({ path: 'ui/src/components/Button.tsx' }),
  file({ path: 'src/security/PromptInjectionScanner.ts' }),
]);

assert(mixedAnalysis.highestRisk === 'high', 'Expected mixed security patch to be high risk.');
assert(
  mixedAnalysis.risks.some((risk) => risk.code === 'SECURITY_SENSITIVE_PATH'),
  'Expected security-sensitive risk code.',
);

console.log(
  JSON.stringify(
    {
      message: 'Patch risk policy test completed',
      singleUiRisk,
      multiUiRisk,
      securityRisk,
      databaseRisk,
      dependencyRisk,
      deleteRisk,
      lowAnalysis,
      smallMultiAnalysis,
      largeMultiAnalysis,
      mixedAnalysis,
    },
    null,
    2,
  ),
);
