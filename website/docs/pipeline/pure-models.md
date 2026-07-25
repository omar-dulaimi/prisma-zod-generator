---
id: pure-models
title: Pure Model Schemas
---

Activated when `pureModels` true (implicitly in minimal mode) or `emit.pureModels`.

Flow:

- Enabled models filtered.
- Per-model exclusions combined (global pure exclusions + legacy + variant pure excludes).
- Naming preset resolved → fileName, export names, optional legacy aliases.
- Relation imports & enum imports normalized for custom patterns.
- If single-file mode: per-model files are never written to disk. Each model's content goes straight into the in-memory aggregator, the `models/` directory and its index are skipped, and only the bundle is flushed at the end.

:::note
Because nothing lands in `models/` in single-file mode, result schemas cannot resolve the per-model `<Model>Schema` references across the inlined bundle and fall back to `z.array(z.unknown()).optional()` / `z.unknown().optional()` for relation fields.
:::

Lean vs relations:

- `pureModelsLean` (default true) only suppresses the verbose JSDoc, statistics and inline comment blocks — it does not change which fields are emitted.
- `pureModelsIncludeRelations` (default false) adds relation fields; leaving it off is what restricts pure models to scalars and enums. With `zodImportTarget: "auto"` or `"v3"` relations are emitted as `z.lazy(() => <Related>Schema)`; with `zodImportTarget: "v4"` they become getter properties (`get author(): z.ZodOptional<z.ZodNullable<typeof UserSchema>> { return UserSchema.nullish(); }`) so recursion resolves lazily without `z.lazy`.
- `pureModelsExcludeCircularRelations` excludes problematic circular relations when `pureModelsIncludeRelations` is true.

Bytes: pure models always emit a base64 `z.string()` with a base64 regex and a `.max()` derived from the internal 16 MB size cap; a literal `@default("...")` is appended after that chain. This representation is not configurable — use `jsonSchemaCompatible: true` with `jsonSchemaOptions.bytesFormat` (`base64String` or `hexString`) if you need a different Bytes shape.

Json: un-annotated `Json` fields use a `z.unknown()` base plus a nesting-depth refinement. To give a `Json` field a real schema, annotate it with `@zod.import([...]).custom.use(...)` — see [Typed JSON fields with a referenced schema](./zod-comments.md#typed-json-fields-with-a-referenced-schema). That form is honored in pure models, including deeply nested inline schemas.

See [Literal Defaults](./special-types.md#literal-defaults) for how `@default(...)` values are emitted in pure model schemas.
