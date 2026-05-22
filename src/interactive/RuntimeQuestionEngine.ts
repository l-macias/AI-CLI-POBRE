import { compareQuestionPriority } from './QuestionPriority.js';
import type {
  RuntimeQuestion,
  RuntimeQuestionEngineResult,
  RuntimeQuestionInput,
} from './RuntimeQuestion.js';

export class RuntimeQuestionEngine {
  public generate(input: RuntimeQuestionInput): RuntimeQuestionEngineResult {
    const questions = this.dedupe([
      ...this.scopeQuestions(input),
      ...this.permissionQuestions(input),
      ...this.workspaceQuestions(input),
      ...this.architectureQuestions(input),
      ...this.securityQuestions(input),
      ...this.verificationQuestions(input),
    ]).sort((a, b) => compareQuestionPriority(a.priority, b.priority));

    return {
      questions,
      generatedAt: new Date().toISOString(),
    };
  }

  private scopeQuestions(input: RuntimeQuestionInput): RuntimeQuestion[] {
    const text = this.text(input);
    const questions: RuntimeQuestion[] = [];

    if (
      (text.includes('frontend') || text.includes('backend') || text.includes('fullstack')) &&
      !this.hasDecision(input, ['frontend', 'backend', 'fullstack', 'scope'])
    ) {
      questions.push({
        id: this.createId('question-scope-boundary'),
        category: 'scope',
        priority: 'high',
        question: '¿Querés trabajar solo frontend, solo backend o fullstack?',
        reason: 'La respuesta cambia qué archivos puede analizar y modificar el runtime.',
        answerKind: 'single_choice',
        options: [
          {
            id: 'frontend-only',
            label: 'Solo frontend',
            value: 'frontend',
            description: 'No tocar backend ni base de datos.',
          },
          {
            id: 'backend-only',
            label: 'Solo backend',
            value: 'backend',
            description: 'No tocar UI/frontend.',
          },
          {
            id: 'fullstack',
            label: 'Fullstack',
            value: 'fullstack',
            description: 'Permitir frontend y backend con aprobación.',
          },
        ],
        createdAt: new Date().toISOString(),
      });
    }

    return questions;
  }

  private permissionQuestions(input: RuntimeQuestionInput): RuntimeQuestion[] {
    const text = this.text(input);
    const questions: RuntimeQuestion[] = [];

    if (
      (text.includes('package.json') ||
        text.includes('dependency') ||
        text.includes('install') ||
        text.includes('vite') ||
        text.includes('tailwind')) &&
      !this.hasDecision(input, ['package.json', 'dependencies', 'dependency'])
    ) {
      questions.push({
        id: this.createId('question-package-permission'),
        category: 'permission',
        priority: 'medium',
        question: '¿Puedo modificar package.json o agregar dependencias si hace falta?',
        reason: 'Modificar dependencias cambia instalación, build y superficie de riesgo.',
        answerKind: 'confirm',
        options: [
          {
            id: 'allow-package-json',
            label: 'Sí, con aprobación',
            value: 'allow_package_json',
          },
          {
            id: 'block-package-json',
            label: 'No tocar package.json',
            value: 'block_package_json',
          },
        ],
        createdAt: new Date().toISOString(),
      });
    }

    return questions;
  }

  private workspaceQuestions(input: RuntimeQuestionInput): RuntimeQuestion[] {
    if (input.workspaceMode && input.workspaceMode.trim().length > 0) {
      return [];
    }

    return [
      {
        id: this.createId('question-workspace-mode'),
        category: 'workspace',
        priority: 'medium',
        question:
          '¿Querés trabajar en modo local_snapshot, local_patchless, git_diff o git_branch_pr?',
        reason:
          'El modo de workspace define si se puede escribir, si requiere snapshot o si depende de Git.',
        answerKind: 'single_choice',
        options: [
          {
            id: 'mode-local-snapshot',
            label: 'local_snapshot',
            value: 'local_snapshot',
            description: 'Modo recomendado por defecto: permite rollback local sin Git.',
          },
          {
            id: 'mode-local-patchless',
            label: 'local_patchless',
            value: 'local_patchless',
            description: 'Solo análisis, sin escritura.',
          },
          {
            id: 'mode-git-diff',
            label: 'git_diff',
            value: 'git_diff',
            description: 'Requiere repositorio Git.',
          },
          {
            id: 'mode-git-branch-pr',
            label: 'git_branch_pr',
            value: 'git_branch_pr',
            description: 'Requiere Git y flujo orientado a PR.',
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private architectureQuestions(input: RuntimeQuestionInput): RuntimeQuestion[] {
    const text = this.text(input);
    const stack = new Set((input.stack ?? []).map((item) => item.toLowerCase()));
    const questions: RuntimeQuestion[] = [];

    if (
      (stack.has('pern') ||
        stack.has('postgresql') ||
        stack.has('prisma') ||
        text.includes('database') ||
        text.includes('postgres') ||
        text.includes('prisma')) &&
      !this.hasDecision(input, ['database', 'prisma', 'postgres', 'migration'])
    ) {
      questions.push({
        id: this.createId('question-database-boundary'),
        category: 'architecture',
        priority: 'high',
        question:
          '¿Puedo modificar base de datos, Prisma o migraciones si la solución lo requiere?',
        reason: 'Cambios de persistencia tienen impacto alto y deben tener permiso explícito.',
        answerKind: 'single_choice',
        options: [
          {
            id: 'database-readonly',
            label: 'No tocar base de datos',
            value: 'database_readonly',
          },
          {
            id: 'database-with-approval',
            label: 'Solo con aprobación previa',
            value: 'database_with_approval',
          },
          {
            id: 'database-allowed',
            label: 'Permitido dentro del plan',
            value: 'database_allowed',
          },
        ],
        createdAt: new Date().toISOString(),
      });
    }

    return questions;
  }

  private securityQuestions(input: RuntimeQuestionInput): RuntimeQuestion[] {
    const text = this.text(input);

    if (
      !text.includes('auth') &&
      !text.includes('secret') &&
      !text.includes('.env') &&
      !text.includes('token')
    ) {
      return [];
    }

    return [
      {
        id: this.createId('question-security-boundary'),
        category: 'security',
        priority: 'high',
        question:
          'Este cambio toca auth, secretos o configuración sensible. ¿Querés revisión de seguridad estricta antes de aprobar?',
        reason:
          'Cambios sensibles requieren mayor control, auditoría y validación antes de aplicar.',
        answerKind: 'confirm',
        options: [
          {
            id: 'security-strict',
            label: 'Sí, revisión estricta',
            value: 'security_strict',
          },
          {
            id: 'security-normal',
            label: 'No, revisión normal',
            value: 'security_normal',
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private verificationQuestions(input: RuntimeQuestionInput): RuntimeQuestion[] {
    const stack = new Set((input.stack ?? []).map((item) => item.toLowerCase()));

    if (!stack.has('typescript') && !stack.has('javascript')) {
      return [];
    }

    if (this.hasDecision(input, ['verify', 'verification', 'typecheck', 'lint'])) {
      return [];
    }

    return [
      {
        id: this.createId('question-verification-command'),
        category: 'verification',
        priority: 'low',
        question: '¿Qué verificación preferís usar al final: typecheck, lint, test o build?',
        reason:
          'La verificación final cambia los comandos seguros que el runtime debería proponer.',
        answerKind: 'single_choice',
        options: [
          {
            id: 'verify-typecheck',
            label: 'Typecheck',
            value: 'typecheck',
          },
          {
            id: 'verify-lint',
            label: 'Lint',
            value: 'lint',
          },
          {
            id: 'verify-test',
            label: 'Test',
            value: 'test',
          },
          {
            id: 'verify-build',
            label: 'Build',
            value: 'build',
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private dedupe(questions: RuntimeQuestion[]): RuntimeQuestion[] {
    const seen = new Set<string>();
    const result: RuntimeQuestion[] = [];

    for (const question of questions) {
      const key = `${question.category}:${question.question}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(question);
    }

    return result;
  }

  private text(input: RuntimeQuestionInput): string {
    return [
      input.objective,
      input.projectName ?? '',
      input.workspaceMode ?? '',
      ...(input.stack ?? []),
      ...(input.knownDecisions ?? []),
      ...(input.runtimeActions ?? []).map(
        (action) => `${action.title} ${action.description} ${action.status}`,
      ),
    ]
      .join(' ')
      .toLowerCase();
  }

  private hasDecision(input: RuntimeQuestionInput, terms: string[]): boolean {
    const decisions = (input.knownDecisions ?? []).join(' ').toLowerCase();

    return terms.some((term) => decisions.includes(term));
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
