#!/bin/bash

# Lista de archivos a incluir
files=(
  "src/patches/PatchProposalGenerator.ts"
  "src/patches/PatchProposalValidator.ts"
  "src/patches/PatchRiskAnalyzer.ts"
  "src/patches/PatchProposal.ts"
  "src/patches/PatchStorage.ts"
  "src/patches/RuntimePatchApplyBridge.ts"
  "src/diff/PatchDiffBuilder.ts"
  "src/diff/PatchDiffTypes.ts"
  "src/api/RuntimeApiController.ts"
  "src/api/RuntimeApiRouter.ts"
  "ui/src/components/session/PatchPanel.tsx"
  "ui/src/components/patch/PatchDiffViewer.tsx"
  "ui/src/components/patch/PatchActions.tsx"
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