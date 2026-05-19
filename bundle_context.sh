#!/bin/bash

# Lista de archivos a incluir
files=(
  "src/cli/CliTypes.ts"
  "src/cli/CliCommandHandler.ts"
  "src/cli/CliCommandRegistry.ts"
  "src/cli/CliApp.ts"
  "src/cli/CliOutputFormatter.ts"
  "src/cli/commands/helpCommand.ts"
  "src/cli/commands/patchCommand.ts"
  "src/cli/index.ts"
  "src/cli/main.ts"
  "src/index.ts"
  "src/examples/cli-test.ts"
  "src/examples/cli-agent-flow-test.ts"
  "src/cli/commands/securityCommand.ts"
  "src/cli/CliCommandParser.ts"
  "src/cli/CliRuntimeBridge.ts"
  "src/examples/cli-security-review-test.ts"
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