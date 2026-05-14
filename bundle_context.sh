#!/bin/bash

# Lista de archivos a incluir
files=(
  "src/providers/Provider.ts"
  "src/providers/ProviderTypes.ts"
  "src/types/ProviderTypes.ts"
  "src/providers/ProviderManager.ts"
  "src/providers/OpenRouterProvider.ts"
  "src/providers/ModelSelector.ts"
  "src/providers/ModelCapabilities.ts"
  "src/providers/ProviderFallback.ts"
  "src/providers/TokenEstimator.ts"
  "src/providers/JsonRepair.ts"
  "src/providers/StructuredOutputParser.ts"
  "src/planning/PlanGenerator.ts"
  "src/core/RuntimeConfig.ts"
  "src/config/env.ts"
  src/examples/provider-smoke-test.ts
  src/examples/plan-generation-test.ts
  "package.json"
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