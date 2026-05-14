import { loadEnv } from "./config/env.js";
import { Logger } from "./observability/Logger.js";
import { ModelSelector } from "./providers/ModelSelector.js";
import { OpenRouterProvider } from "./providers/OpenRouterProvider.js";
import { PromptBuilder } from "./providers/PromptBuilder.js";
import { ProviderManager } from "./providers/ProviderManager.js";

const logger = new Logger({
  namespace: "zero-runtime:bootstrap",
  level: "debug",
});

function main(): void {
  const env = loadEnv();

  const modelSelector = new ModelSelector({
    defaultModel: env.OPENROUTER_DEFAULT_MODEL,
  });

  const providerManager = new ProviderManager();

  providerManager.register(
    new OpenRouterProvider({
      apiKey: env.OPENROUTER_API_KEY,
      baseUrl: env.OPENROUTER_BASE_URL,
    }),
  );

  const promptBuilder = new PromptBuilder();

  const messages = promptBuilder.build({
    system:
      'You are a provider connectivity test. Reply with a short JSON object: {"ok": true, "message": "ready"}.',
    user: "Test provider layer.",
  });

  logger.info("Provider layer initialized", {
    provider: "openrouter",
    model: modelSelector.selectModel(),
    openRouterConfigured: Boolean(env.OPENROUTER_API_KEY),
    messageCount: messages.length,
  });
}

main();
