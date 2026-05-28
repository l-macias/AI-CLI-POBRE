#!/bin/bash

# Lista de archivos a incluir
files=(
  "ui/src/pages/SettingsPage.tsx"
  "ui/src/components/settings/ProviderSettingsPanel.tsx"
  "ui/src/components/settings/ModelSettingsPanel.tsx"
  "ui/src/components/settings/SettingsTypes.ts"
  "ui/src/api/runtimeApi.ts"
  "ui/src/types/runtime.ts"
  "src/api/RuntimeApiController.ts"
  "src/api/RuntimeApiRouter.ts"
  "src/settings/RuntimeSettingsStore.ts"
  "src/providers/ProviderStatusService.ts"
  "src/examples/provider-settings-ui-test.ts"
  "src/examples/runtime-settings-smoke-test.ts"
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