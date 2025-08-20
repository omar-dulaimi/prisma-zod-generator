---
id: performance
title: Performance & Build Tips
---

Strategies to reduce generation time and bundle size.

## Use Minimal Mode for Fast Iteration

`mode: "minimal"` prunes deep nested inputs and disables select/include.

## Targeted Model Generation

Restrict models via `models: { ModelName: {...} }` to skip unused ones.

## Disable Unused Categories

Turn off `emit.crud`, `emit.results`, or `emit.variants` when not needed.

## Single File for Deployment

`useMultipleFiles: false` produces one file—ideal for serverless bundling.

## Lean Pure Models

`pureModelsLean: true` + exclude heavy relations globally.

## Avoid Enum Explosion

Exclude enums or limit variants if you have large enum sets.

## CI Parallelization

Combine with `VITEST_PARALLEL=true` tests to overlap generation and testing in pipelines.
