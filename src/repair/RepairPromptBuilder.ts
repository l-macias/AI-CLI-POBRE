import type { RepairRequest } from '../types/RepairTypes.js';

export class RepairPromptBuilder {
  public build(request: RepairRequest): string {
    const files = request.targetFiles
      .map((file) => {
        return `FILE: ${file.relativePath}
EXISTS: ${String(file.exists)}
BYTES: ${String(file.bytes)}
RELEVANT_RANGE: ${file.relevantLineStart ?? 'unknown'}-${file.relevantLineEnd ?? 'unknown'}

\`\`\`
${file.content}
\`\`\``;
      })
      .join('\n\n---\n\n');

    const findings = request.findings
      .map((finding) => {
        return `- ${finding.source}: ${finding.relatedFile ?? 'unknown'}:${
          finding.line ?? '?'
        }:${finding.column ?? '?'} — ${finding.message}`;
      })
      .join('\n');

    const constraints = request.constraints
      .map((constraint) => {
        return `- [${constraint.severity}] ${constraint.code}: ${constraint.description}`;
      })
      .join('\n');

    return `You are proposing a code repair for a real project.

The LLM proposes. The runtime validates, decides, executes, audits, and revalidates.

OBJECTIVE:
${request.objective}

FINDINGS:
${findings}

CONSTRAINTS:
${constraints}

TARGET FILES:
${files}

REQUIRED OUTPUT:
Return a JSON object only, with this shape:

{
  "summary": "short summary",
  "riskLevel": "low | medium | high",
  "operations": [
    {
      "kind": "replace_file",
      "targetFile": "relative/path.tsx",
      "newContent": "full new file content",
      "reason": "why this change fixes the finding"
    }
  ],
  "explanation": "brief explanation"
}

Rules:
- Do not modify unrelated files.
- Do not invent dependencies.
- Do not access secrets.
- Prefer minimal fixes.
- Preserve existing style.
- Return JSON only.`;
  }
}
