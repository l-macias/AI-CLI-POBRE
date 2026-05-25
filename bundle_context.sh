#!/bin/bash

# Lista de archivos a incluir
files=(
  "src/patches/RuntimePatchProviderBridge.ts"
  "src/providers/ProviderRouter.ts"
  "src/providers/ProviderTypes.ts"
  "src/patches/RuntimePatchProposalStorage.ts"
  "src/patches/PatchProposalValidator.ts"
  "src/api/RuntimeApiController.ts"
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