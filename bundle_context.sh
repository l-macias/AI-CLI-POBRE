#!/bin/bash

# Lista de archivos a incluir
files=(
  "src/interactive/RuntimeQuestionEngine.ts"
  "src/interactive/RuntimeQuestion.ts"
  "src/interactive/QuestionAnswerStore.ts"
  "src/interactive/RuntimeQuestionDecisionMapper.ts"
  "src/workflow/RuntimeActionAvailability.ts"
  "src/workflow/RuntimeWorkflowState.ts"
  "src/workflow/RuntimeWorkflowStateMachine.ts"
  "ui/src/components/questions/RuntimeQuestionsPanel.tsx"
  "ui/src/components/workflow/NextBestActionPanel.tsx"
  "ui/src/components/workflow/GuidedWorkflowPanel.tsx"
  "ui/src/pages/SessionPage.ts"
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