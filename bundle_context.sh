#!/bin/bash

# Lista de archivos a incluir
files=(
  "package.json"
  "src/examples/runtime-api-server-test.ts"
  "src/api/RuntimeApiController.ts"
  "src/api/RuntimeApiRouter.ts"
  "src/api/RuntimeApiTypes.ts"
  "src/workflow/RuntimeWorkflowOrchestrator.ts"
  "src/workflow/RuntimeWorkflowTypes.ts"
  "src/projects/ProjectScanner.ts"
  "src/projects/ProjectRegistry.ts"
  "src/workspace/LocalSnapshotManager.ts"
  "src/verify/VerifyRunner.ts"
  "src/reports/SessionReportBuilder.ts"
  "ui/src/api/runtimeApi.ts"
  "ui/src/pages/ProjectsPage.tsx"
  "ui/src/pages/SessionPage.tsx"
  "src/examples/real-project-trial-test.ts"
  "src/examples/runtime-workflow-orchestrator-test.ts"
  "src/examples/local-app-launcher-test.ts"
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