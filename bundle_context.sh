#!/bin/bash

# Lista de archivos a incluir
files=(
  "ui/src/pages/SessionPage.tsx"
  "ui/src/components/sessions/SessionResumePanel.tsx"
  "ui/src/components/artifacts/RuntimeArtifactStorePanel.tsx"
  "ui/src/components/dashboard/RecentSessionsCard.tsx"
  "ui/src/components/dashboard/RecentArtifactsCard.tsx"
  "ui/src/api/runtimeApi.ts"
  "ui/src/types/runtime.ts"
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