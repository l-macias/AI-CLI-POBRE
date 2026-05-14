# Next Steps

## Next session

Session 23 — Retrieval System v1

## Goal

Retrieve only relevant project context instead of sending broad project/runtime context to the model.

## Implement

- `FileIndexer`
- `Chunker`
- `RelevanceScorer`
- `ContextRetriever`
- `ImportGraph`
- `RetrievalCache`

## Expected result

Given a query such as "runtime loop", the runtime should return only relevant project chunks/files.

## Rules

- runtime remains authority
- no shell tools
- no git tools
- no network tools
- ignore protected files
- ignore dependency/build directories
- keep retrieval deterministic
- keep retrieval cache local
- prepare foundation for future planning prompts
