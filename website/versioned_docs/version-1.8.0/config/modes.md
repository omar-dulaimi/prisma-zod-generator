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
