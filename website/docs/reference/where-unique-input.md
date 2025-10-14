---
id: where-unique-input
title: WhereUniqueInput Semantics
---

This page explains how `WhereUniqueInput` schemas are generated and validated, and how to enable an optional early validation check.

Overview

- Only unique selector fields are included at the top level (single-field uniques like `id` or `email`, plus named composite unique selectors like `userFolderPathIdx`).
- Top-level keys are optional by default to match Prisma’s runtime behavior.
- Composite uniqueness is enforced by nested selector schemas. For example, `{ adminFolderPathIdx: { adminId, path } }` requires both `adminId` and `path`.
- No cross-field superRefine is applied by default, to avoid false negatives on models with multiple composite unique keys.

Optional early validation

If you want to fail early when no selector is provided (reject `{}` at the Zod layer), enable the opt-in flag:

```jsonc
// zod-generator.config.json
{
  "validateWhereUniqueAtLeastOne": true
}
```

What it does

- Adds a minimal `.superRefine` to `*WhereUniqueInput` schemas that checks the presence of at least one top-level selector.
- Does not enforce “exactly one” (Prisma will still validate that constraint at runtime).
- Does not inspect nested composite fields; nested composite schemas already require all of their fields.

Examples

- Valid (one composite selector provided):
```ts
MediaFolderWhereUniqueInputObjectZodSchema.parse({
  adminFolderPathIdx: { adminId: 'A', path: '/root' },
});
```

- Invalid (composite selector present but empty): field-level errors from the nested schema:
```ts
MediaFolderWhereUniqueInputObjectZodSchema.parse({
  adminFolderPathIdx: {},
});
// → ZodError: adminFolderPathIdx.adminId and adminFolderPathIdx.path are required
```

- No selector provided:
  - With `validateWhereUniqueAtLeastOne=false` (default): parse may succeed; Prisma rejects later when used.
  - With `validateWhereUniqueAtLeastOne=true`: Zod rejects with “Provide at least one unique selector”.

Rationale

- Removing global superRefine avoids redundant and brittle cross-field logic.
- The nested composite schemas produce precise, actionable errors.
- For teams that want earlier feedback, the opt-in flag provides a safe, minimal check without re-implementing Prisma’s uniqueness rules.

