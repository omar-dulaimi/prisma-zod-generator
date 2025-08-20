---
id: modes
title: Generation Modes
---

| Mode    | Models default                        | Variants default                        | Operations                  | Notes                                                 |
| ------- | ------------------------------------- | --------------------------------------- | --------------------------- | ----------------------------------------------------- |
| full    | all enabled                           | all enabled                             | all Prisma ops              | Richest output                                        |
| minimal | disabled unless explicitly configured | input & pure enabled (result often off) | Restricted core CRUD + find | Prunes complex nested inputs, disables select/include |
| custom  | all enabled unless disabled           | respect `variants.*.enabled`            | all unless filtered         | Explicit control                                      |

Minimal mode specifics:

- Forces `select/include` disabled even if flags set.
- Applies `MINIMAL_OPERATIONS` (or `minimalOperations` override) for unspecified models.
- Skips many heavy nested input object schemas (allow-list basics).

## Emission Heuristics

| Condition                                                              | Effect                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `pureModels=true` AND all `variants.*.enabled=false` AND `mode=custom` | Pure-models-only (emit only pure model schemas)                   |
| `pureModels=true` AND only `variants.pure.enabled=true`                | Pure-variant-only (skip CRUD/input/result schemas)                |
| `emit.results=false`                                                   | Internally sets `variants.result.enabled=false` before generation |
| `useMultipleFiles=false`                                               | Single-file bundle; directory cleanup after flush                 |
| `mode=minimal`                                                         | Suppresses select/include + prunes deep input objects             |

Explicit `emit.*` booleans, when provided, override heuristics for that category (except minimal’s enforced suppressions).
