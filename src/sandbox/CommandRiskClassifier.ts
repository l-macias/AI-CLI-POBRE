import type {
  CommandRiskClassification,
  CommandRiskLevel,
  SandboxCommandRequest,
} from '../types/SandboxTypes.js';

const blockedCommandNames = new Set([
  'rm',
  'del',
  'format',
  'shutdown',
  'reboot',
  'curl',
  'wget',
  'ssh',
  'scp',
  'ftp',
  'powershell',
  'cmd',
  'bash',
  'sh',
  'git',
]);

const dangerousArgPatterns = [
  /(^|\s)-rf($|\s)/i,
  /(^|\s)--force($|\s)/i,
  /(^|\s)install($|\s)/i,
  /(^|\s)add($|\s)/i,
  /(^|\s)publish($|\s)/i,
  /(^|\s)exec($|\s)/i,
  /\|/,
  /&&/,
  /;/,
  />/,
  /</,
  /\$\(/,
  /`/,
];

export class CommandRiskClassifier {
  public classify(request: SandboxCommandRequest): CommandRiskClassification {
    const reasons: string[] = [];
    const command = request.command.trim().toLowerCase();
    const joinedArgs = request.args.join(' ');

    if (blockedCommandNames.has(command)) {
      reasons.push(`Command "${request.command}" is globally blocked.`);
    }

    for (const pattern of dangerousArgPatterns) {
      if (pattern.test(joinedArgs)) {
        reasons.push(`Arguments match dangerous pattern: ${String(pattern)}.`);
      }
    }

    if (request.networkAccess === true) {
      reasons.push('Network access requested.');
    }

    return {
      command: request.command,
      args: [...request.args],
      riskLevel: this.resolveRiskLevel(reasons, request),
      reasons,
    };
  }

  private resolveRiskLevel(reasons: string[], request: SandboxCommandRequest): CommandRiskLevel {
    if (reasons.length > 0) {
      return 'blocked';
    }

    if (request.command === 'npm' || request.command === 'pnpm' || request.command === 'yarn') {
      return 'low';
    }

    return 'medium';
  }
}
