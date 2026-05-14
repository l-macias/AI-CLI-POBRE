# Active Module

## Module

Retrieval System v1

## Session

Session 23 — Retrieval System v1

## Status

Starting

## Purpose

Retrieve relevant project context instead of sending broad runtime/project context to the model.

## Goal

The runtime should search, chunk, score, and return only the most relevant project files/chunks for a given query.

## Planned components

- FileIndexer
- Chunker
- RelevanceScorer
- ContextRetriever
- ImportGraph
- RetrievalCache

## Core rule

Retrieval is runtime-owned.

The model may consume retrieved context, but the runtime decides:

- which files are indexed
- which files are ignored
- how chunks are produced
- how relevance is scored
- what context is returned
