---
id: variants
title: Variants System
---

Two forms:

1. Object-based (`variants.pure/input/result`) – enable flags + suffix + excludeFields + partial.
2. Array-based custom variants – each element: `{ name, suffix?, exclude?, additionalValidation?, makeOptional?, transformRequiredToOptional?, transformOptionalToRequired?, removeValidation?, partial? }`.

Generation behavior:

- Skips entirely if `emit.variants=false` or single-file mode active (variants suppressed in strict single-file).
- Pure models may still generate separately (`emit.pureModels`).
- `pureVariantOnlyMode` & `pureModelsOnlyMode` heuristics reduce other schema categories.

Custom variant field building applies:

- Base inferred zod type
- Optionality transforms
- Additional validations from variant def or `@zod` doc comments
- Enum imports resolved relative to variants directory

## Partial Flag

The `partial` flag automatically applies `.partial()` to generated Zod schemas, making all fields optional. This is useful for update operations where you only want to provide some fields.

### Configuration

Object-based variants:
```json
{
  "variants": {
    "input": {
      "enabled": true,
      "partial": true
    },
    "result": {
      "enabled": true,
      "partial": false
    }
  }
}
```

Array-based custom variants:
```json
{
  "variants": [
    {
      "name": "UpdateInput",
      "suffix": "UpdateInput",
      "partial": true
    },
    {
      "name": "CreateInput",
      "suffix": "CreateInput",
      "partial": false
    }
  ]
}
```

### Example Output

With `partial: true`:
```typescript
export const UserInputSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email()
}).strict().partial();
```

With `partial: false` (default):
```typescript
export const UserResultSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email()
}).strict();
```

### Use Cases

- **Update operations**: Use `partial: true` for PATCH/PUT endpoints where users provide only fields to update
- **Create operations**: Use `partial: false` for POST endpoints where all required fields must be provided
- **Form handling**: Partial schemas for progressive form completion
- **API flexibility**: Allow clients to send minimal payloads
