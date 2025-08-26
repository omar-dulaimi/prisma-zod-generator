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

Generator block flags (not JSON config):

```prisma
generator zod {
  provider           = "prisma-zod-generator"
  exportTypedSchemas = true   // default
  exportZodSchemas   = true   // default
  typedSchemaSuffix  = "Schema"    // default
  zodSchemaSuffix    = "ZodSchema" // default
}
```

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

Produces `PostFindManyArgs` and `PostFindManyValidator`.

## Single File Mode

Both exports inlined; tree-shakers can drop unused variant if imported selectively.

## When to Prefer One

- Library boundary: use typed version for stable contract.
- App code needing transformation: use Zod version then `.parse`.

## Interactions

- No effect on pure model schemas (they are single export each).
- Result schemas follow same pattern.

## Troubleshooting

If you only see one export: verify flags or earlier README examples; ensure no custom fork removed dual export logic.
