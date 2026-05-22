import type { RuntimeQuestion, RuntimeQuestionAnswer } from './RuntimeQuestion.js';
import type {
  SessionDecisionCategory,
  SessionDecisionCreateInput,
  SessionDecisionStrength,
} from './SessionDecision.js';

export interface RuntimeQuestionDecisionMapping {
  decision: SessionDecisionCreateInput;
  reason: string;
}

export class RuntimeQuestionDecisionMapper {
  public map(input: {
    sessionId: string;
    question: RuntimeQuestion;
    answer: RuntimeQuestionAnswer;
  }): RuntimeQuestionDecisionMapping {
    const category = this.mapCategory(input.question.category);
    const strength = this.mapStrength(input.question.category, input.answer.answer);
    const statement = this.buildStatement(input.question, input.answer.answer);

    return {
      decision: {
        sessionId: input.sessionId,
        category,
        strength,
        statement,
        source: 'user',
        metadata: {
          questionId: input.question.id,
          question: input.question.question,
          answer: input.answer.answer,
          answerKind: input.question.answerKind,
        },
      },
      reason: `Mapped runtime question answer into session decision: ${input.question.id}`,
    };
  }

  private mapCategory(category: RuntimeQuestion['category']): SessionDecisionCategory {
    if (category === 'scope') {
      return 'scope';
    }

    if (category === 'workspace') {
      return 'workspace';
    }

    if (category === 'security') {
      return 'security';
    }

    if (category === 'architecture') {
      return 'architecture';
    }

    if (category === 'permission') {
      return 'permission';
    }

    return 'workflow';
  }

  private mapStrength(
    category: RuntimeQuestion['category'],
    answer: string,
  ): SessionDecisionStrength {
    if (
      category === 'scope' ||
      category === 'workspace' ||
      answer.includes('readonly') ||
      answer.includes('block') ||
      answer.includes('strict')
    ) {
      return 'hard_rule';
    }

    if (category === 'permission' || category === 'architecture' || category === 'security') {
      return 'constraint';
    }

    return 'preference';
  }

  private buildStatement(question: RuntimeQuestion, answer: string): string {
    if (question.category === 'scope') {
      if (answer === 'frontend') {
        return 'No tocar backend en esta sesión. Trabajar solo frontend.';
      }

      if (answer === 'backend') {
        return 'No tocar frontend en esta sesión. Trabajar solo backend.';
      }

      if (answer === 'fullstack') {
        return 'Permitir trabajo fullstack con aprobación del runtime.';
      }
    }

    if (question.category === 'workspace') {
      return `Trabajar en modo ${answer}.`;
    }

    if (question.category === 'architecture') {
      if (answer === 'database_readonly') {
        return 'No tocar database, base de datos, Prisma ni migraciones.';
      }

      if (answer === 'database_with_approval') {
        return 'Modificar database, base de datos, Prisma o migraciones solo con aprobación previa.';
      }

      if (answer === 'database_allowed') {
        return 'Permitir modificar database, base de datos, Prisma o migraciones dentro del plan aprobado.';
      }
    }

    if (question.category === 'permission') {
      if (answer === 'allow_package_json') {
        return 'Permitir modificar package.json o dependencias solo con aprobación.';
      }

      if (answer === 'block_package_json') {
        return 'No tocar package.json ni agregar dependencias.';
      }
    }

    if (question.category === 'security') {
      if (answer === 'security_strict') {
        return 'Usar revisión de seguridad estricta antes de aprobar cambios sensibles.';
      }

      return 'Usar revisión de seguridad normal para esta sesión.';
    }

    if (question.category === 'verification') {
      return `Usar ${answer} como verificación preferida al final.`;
    }

    return `Pregunta respondida: "${question.question}" => "${answer}".`;
  }
}
