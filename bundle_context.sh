#!/bin/bash

# Lista de archivos a incluir
files=(
  "src/agent/AgentTypes.ts"
  "src/agent/AgentRuntimeBridge.ts"
  "src/agent/AgentStepExecutor.ts"
  "src/agent/AgentLoopReporter.ts"
  "src/agent/InteractiveAgentLoop.ts"
  "src/cli/CliTypes.ts"
  "src/cli/CliCommandParser.ts"
  "src/cli/CliRuntimeBridge.ts"
  "src/cli/CliOutputFormatter.ts"
  "src/repair/RepairAttemptRunner.ts"
  "src/repair/RepairPromptBuilder.ts"
  "src/repair/OpenRouterRepairProposalProvider.ts"
  "src/repair/PolicyAwareRepairProposalProvider.ts"
  "src/repair/FakeLlmRepairProposalProvider.ts"
  "src/repair/StaticRepairProposalProvider.ts"
  "src/repair/RepairProposalProvider.ts"
  "src/providers/OpenRouterConfigLoader.ts"
  "src/providers/OpenRouterClient.ts"
  "src/providers/OpenRouterTypes.ts"
  "src/examples/agent-step-executor-test.ts"
  "src/examples/agent-patch-apply-test.ts"
  "src/examples/cli-agent-flow-test.ts"
  "src/examples/openrouter-repair-proposal-provider-test.ts"
  "src/examples/policy-aware-repair-provider-test.ts"
)

echo "A continuación te presento el código fuente de los archivos solicitados para contexto:"
echo "================================================================================"

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo ""
    echo "FILE_PATH: $file"
    echo "--------------------------------------------------------------------------------"
    cat "$file"
    echo ""
    echo "END_FILE: $file"
    echo "================================================================================"
  else
    echo "ADVERTENCIA: El archivo $file no fue encontrado."
  fi
done