import type { ProviderMessage } from "../types/ProviderTypes.js";

export class TokenEstimator {
  public estimateTextTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  public estimateMessagesTokens(messages: ProviderMessage[]): number {
    return messages.reduce((total, message) => {
      return (
        total +
        this.estimateTextTokens(message.role) +
        this.estimateTextTokens(message.content)
      );
    }, 0);
  }
}
