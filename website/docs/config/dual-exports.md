---
id: dual-exports
title: Dual Schema Exports
---

Type-safe + method-friendly exports for CRUD argument schemas.

## Rationale

Traditional choice: bind `z.ZodType<Prisma.X>` (great inference, limited chaining) vs plain Zod (full chaining, looser typing). Generator emits both.

## What You Get

```ts
export const PostFindManySchema: z.ZodType<Prisma.PostFindManyArgs> = base;
export const PostFindManyZodSchema = base;
```

Typed one locks inference to Prisma.\*; Zod one supports all refinements/extensions.

## Enabling / Disabling

These four flags can be set either in the Prisma generator block or in the JSON config file. Precedence is: generator block → JSON config → default.

```prisma
generator zod {
  provider           = "prisma-zod-generator"
  exportTypedSchemas = true   // default
  exportZodSchemas   = true   // default
  typedSchemaSuffix  = "Schema"    // default
  zodSchemaSuffix    = "ZodSchema" // default
}
```

The equivalent JSON config form:

```json title="zod-generator.config.json"
{
  "exportTypedSchemas": true,
  "exportZodSchemas": true,
  "typedSchemaSuffix": "Schema",
  "zodSchemaSuffix": "ZodSchema"
}
```

:::note
All four keys are declared in the bundled JSON Schema (`lib/config/schema.json`), so an editor wired up with `$schema` completes and validates them. Before that they were rejected as unknown properties — the schema sets `additionalProperties: false`, so `ConfigurationValidator` failed a config that used them.
:::

Disable one side to shrink surface:

```prisma
exportTypedSchemas = false
```

## Suffix Customization

Change names to fit convention:

```prisma
typedSchemaSuffix = "Args"
zodSchemaSuffix   = "Validator"
```

Produces `PostFindManyArgs` and `PostFindManyValidator` for CRUD operation schemas.

Scope note: input object schemas under `objects/` keep a hardcoded `ObjectSchema` suffix on the typed side (`PostCreateInputObjectSchema`) regardless of `typedSchemaSuffix`. `zodSchemaSuffix` does apply there, producing `PostCreateInputObject<Suffix>`.

## Single File Mode

Both exports inlined; tree-shakers can drop unused variant if imported selectively.

## When to Prefer One

- Library boundary: use typed version for stable contract.
- App code needing transformation: use Zod version then `.parse`.

## Interactions

- No effect on pure model schemas (they are single export each).
- Result schemas do **not** follow this pattern. `schemas/results/<Model><Op>Result.schema.ts` emits a single untyped `export const <Model><Op>ResultSchema = …` plus a `<Model><Op>ResultSchemaType` type alias, and ignores `exportTypedSchemas`, `exportZodSchemas` and both suffix options.

## Troubleshooting

If you only see one export: verify flags or earlier README examples; ensure no custom fork removed dual export logic.
