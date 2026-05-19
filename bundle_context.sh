#!/bin/bash

# Lista de archivos a incluir
files=(
  "src/types/RepairTypes.ts"
  "src/patch-apply/PatchApplyTypes.ts"
  "src/patch-apply/PatchApplyRunner.ts"
  "src/security/ProtectedPathPolicy.ts"
  "src/security/PatchThreatAnalyzer.ts"
  "src/cli/CliTypes.ts"
  "src/cli/CliCommandParser.ts"
  "src/cli/CliRuntimeBridge.ts"
  "src/cli/CliOutputFormatter.ts"
  "src/cli/createCliCommandRegistry.ts"
  "src/cli/CliRunner.ts"
  "src/cli/commands/patchCommand.ts"
  "src/cli/commands/securityCommand.ts"
  "src/cli/commands/agentCommand.ts"
  "src/scaffold/ScaffoldTypes.ts"
  "src/scaffold/ScaffoldIntentParser.ts"
  "src/examples/scaffold-intent-parser-test.ts"
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