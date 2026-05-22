#!/bin/bash

# Lista de archivos a incluir
files=(
  "ui/src/api/runtimeApi.ts"
  "ui/src/types/runtime.ts"
  "ui/src/pages/SessionPage.tsx"
  "ui/src/components/session/PatchPanel.tsx"
  "ui/src/components/patch/PatchDiffViewer.tsx"
  "ui/src/components/patch/PatchFileCard.tsx"
  "ui/src/components/patch/PatchSummary.tsx"
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