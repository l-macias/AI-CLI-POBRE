import type { ProviderMessage } from "../types/ProviderTypes.js";

export interface PromptBuilderInput {
  system: string;
  user: string;
  context?: string;
}

export class PromptBuilder {
  public build(input: PromptBuilderInput): ProviderMessage[] {
    const messages: ProviderMessage[] = [
      {
        role: "system",
        content: input.system,
      },
    ];

    if (input.context && input.context.trim().length > 0) {
      messages.push({
        role: "user",
        content: `Context:\n${input.context.trim()}`,
      });
    }

    messages.push({
      role: "user",
      content: input.user,
    });

    return messages;
  }
}
