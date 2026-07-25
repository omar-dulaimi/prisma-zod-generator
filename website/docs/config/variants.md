---
id: variants
title: Variants System
---

Two forms:

1. Object-based (`variants.pure/input/result`) – each variant accepts `{ enabled?, suffix?, excludeFields?, partial?, strictMode? }`.
2. Array-based custom variants – each element: `{ name, suffix?, exclude?, additionalValidation?, makeOptional?, transformRequiredToOptional?, transformOptionalToRequired?, removeValidation? }`.

:::note
`strictMode` on an object-based variant (`variants.<variant>.strictMode`) outranks the per-model override `models.<Model>.strictMode.variants.<variant>`. See [Strict Mode → Configuration Hierarchy](./strict-mode.md#configuration-hierarchy) before combining the two.
:::

Generation behavior:

- Skips entirely if `emit.variants=false` or single-file mode active (variants suppressed in strict single-file).
- Pure models may still generate separately (`emit.pureModels`).
- `pureVariantOnlyMode` & `pureModelsOnlyMode` heuristics reduce other schema categories.

Custom variant field building applies:

- Base inferred zod type
- Optionality transforms
- Additional validations from variant def or `@zod` doc comments
- Enum imports resolved relative to variants directory

## Suffix Semantics

For **object-based** variants, `suffix` renames the exported const, not the file. The file name is always `variants/<variant>/<Model>.<variant>.ts`, so `variants.pure.suffix = ".model"` produces `variants/pure/User.pure.ts` exporting `UserModelSchema`.

For **array-based** custom variants, `suffix` drives both: an element `{ "name": "Api", "suffix": "Api" }` produces `variants/UserApi.schema.ts` exporting `UserApiSchema`.

## Partial Flag

The `partial` flag automatically applies `.partial()` to generated Zod schemas, making all fields optional. This is useful for update operations where you only want to provide some fields.

### Configuration

`partial` is honoured for object-based variants only:

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

:::caution
**Array-based custom variants ignore `partial`.** The array branch never reads the flag, so setting it has no effect on the emitted schema. For optionality control in custom variants use `makeOptional`, `transformRequiredToOptional`, or `transformOptionalToRequired` instead:

```json
{
  "variants": [
    {
      "name": "UpdateInput",
      "suffix": "UpdateInput",
      "transformRequiredToOptional": ["name", "email"]
    }
  ]
}
```
:::

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
