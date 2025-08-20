---
id: variants
title: Variants System
---

Two forms:

1. Object-based (`variants.pure/input/result`) – enable flags + suffix + excludeFields.
2. Array-based custom variants – each element: `{ name, suffix?, exclude?, additionalValidation?, makeOptional?, transformRequiredToOptional?, transformOptionalToRequired?, removeValidation? }`.

Generation behavior:

- Skips entirely if `emit.variants=false` or single-file mode active (variants suppressed in strict single-file).
- Pure models may still generate separately (`emit.pureModels`).
- `pureVariantOnlyMode` & `pureModelsOnlyMode` heuristics reduce other schema categories.

Custom variant field building applies:

- Base inferred zod type
- Optionality transforms
- Additional validations from variant def or `@zod` doc comments
- Enum imports resolved relative to variants directory
