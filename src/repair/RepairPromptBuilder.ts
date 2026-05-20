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

Provider output is untrusted. Your only job is to return a strict JSON PatchProposal object.
The runtime will reject anything that is not valid JSON or does not match the schema.

OBJECTIVE:
${request.objective}

FINDINGS:
${findings || '- none'}

CONSTRAINTS:
${constraints || '- none'}

TARGET FILES:
${files || '- none'}

REQUIRED OUTPUT:
Return exactly one JSON object and nothing else.

The object must match this exact schema:

{
  "id": "repair-proposal-short-stable-id",
  "summary": "short summary of the proposed fix",
  "riskLevel": "low",
  "operations": [
    {
      "kind": "replace_file",
      "targetFile": "relative/path.tsx",
      "newContent": "full new file content with escaped newlines",
      "reason": "why this change fixes the finding"
    }
  ],
  "explanation": "brief explanation of why the patch is safe and minimal"
}

Required top-level fields:
- id: non-empty string.
- summary: non-empty string.
- riskLevel: exactly one of: "low", "medium", "high".
- operations: array.
- explanation: non-empty string.

Allowed operation kinds:
- replace_file
- edit_file
- create_file
- delete_file

Operation rules:
- targetFile must be a relative path from the project root.
- For replace_file, edit_file, and create_file, newContent must be a string.
- newContent must contain the complete proposed file content, not a partial snippet.
- Do not use markdown fences inside JSON.
- Escape all newlines inside JSON strings as \\n.
- Escape quotes inside JSON strings as \\".
- Do not include raw control characters inside strings.
- Do not include comments in JSON.
- Do not include trailing commas.

Repair rules:
- Do not modify unrelated files.
- Only target files related to the findings.
- Do not invent dependencies.
- Do not access secrets.
- Prefer the smallest safe fix.
- Preserve existing style.
- If no safe repair is possible, return a valid PatchProposal with operations: [] and explain why.

Return JSON only. No markdown. No prose before or after the JSON object.`;
  }
}
