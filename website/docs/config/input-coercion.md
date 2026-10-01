---
id: input-coercion
title: Input Coercion
---

Coerce string values (as they arrive from an HTTP query string or a raw HTML form) into `Int`, `Float`, `BigInt`, `Decimal` and `Boolean` fields when validating input schemas.

## Overview

HTTP query parameters and raw form submissions arrive as strings — filter values like `"30"` or `"true"` fail against `z.number().int()` and `z.boolean()`. With `inputCoercion: true` the generator emits `z.coerce.number()` / `z.coerce.bigint()` (and a decimal-coercing base) for input types, and accepts `'true'`/`'false'` strings for booleans.

Enable it in the JSON config file or directly in the Prisma generator block:

```json
{
  "inputCoercion": true
}
```

```prisma
generator zod {
  provider      = "prisma-zod-generator"
  output        = "./generated/zod"
  inputCoercion = true
}
```

## What gets coerced

When enabled, coercion applies to every **DMMF input type** — the filter objects (`WhereInput`, `WhereUniqueInput`, `ScalarFilter`…), CRUD input objects (`CreateInput`, `UpdateInput`, `UncheckedCreateInput`…), `Select`/`Include` objects, their nested children, and the generated argument schemas (including the `take`/`skip` pagination args) — plus the **`input` variant**. It does **not** apply to pure models, the `result` variant, or operation result schemas, which keep strict `z.number()`, `z.boolean()`, etc., so read-model validation stays tight.

An annotated field keeps its full chain — `@zod.min(1)` on an `Int` with coercion enabled emits `z.coerce.number().int().min(1)`.

## Boolean coercion

Booleans are **not** coerced with `z.coerce.boolean()`. That constructor applies JavaScript's `Boolean(x)`, which:
- maps `'false'` to `true` and `''`, `null`, `[]` to `false`,
- flattens nested objects — a filter object like `{ posts: { where: ... } }` would validate as `true`,
- lets an **omitted** required `Boolean` silently pass as `false`.

Instead, the emitted boolean schema accepts `'true'`/`'false'` strings alongside real booleans:
- on `zodImportTarget: "auto"` with a Zod 4 install (`"v4"` explicitly): `z.union([z.boolean(), z.stringbool()])` — the bare `z.boolean()` arm also keeps a JSON `true`/`false` from appearing in the `stringbool()` arm;
- on Zod 3 (`"v3"`): `z.preprocess((v) => v === "true" ? true : v === "false" ? false : v, z.boolean())`.

Both forms survive `z.toJSONSchema()`. Zod's own coercion (`z.coerce.number()`) still accepts the empty forms it always did — `''`, `null` and `[]` map to `0`, and `true` maps to `1` — which is inherent to `z.coerce`, not something this option adds.

## Validation examples

```typescript
const filter = UserWhereInput.safeParse({ age: "30" });                                   // ✅
const filter = UserWhereInput.safeParse({ age: { gte: "10", lte: "20" } });               // ✅
const filter = UserWhereInput.safeParse({ verified: "true" });                            // ✅
const filter = UserWhereInput.safeParse({ verified: "false" });                           // ✅
const filter = UserWhereInput.safeParse({ verified: true });                              // ✅
const include = UserInclude.safeParse({ posts: { where: { published: true } } });         // ✅ nested object kept, not flattened
const bad = UserWhereInput.safeParse({ verified: "nope" });                               // ❌
const bad = UserWhereInput.safeParse({ verified: { equals: "" } });                       // ❌
```

## Related Configuration

- [`@zod.coerce()`](../pipeline/zod-comments.md#type-coercion) — the per-field annotation; with this option both routes share the exact same emitted boolean form.
- [`dateTimeStrategy`](./datetime-strategy.md) — `DateTime` already coerces on input schemas by default, independently of this option.
- [`zodImportTarget`](../recipes/zod-import-targets.md) — selects the boolean coercion emission above.
- [`jsonSchemaCompatible`](./json-schema-compatibility.md) — overrides coercion settings; when enabled, every emitter checks it first.