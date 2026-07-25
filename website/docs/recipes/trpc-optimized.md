---
id: trpc-optimized
title: tRPC Optimized
---

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "output": "./generated/zod",
  "globalExclusions": {
    "input": ["id", "createdAt", "updatedAt"],
    "result": [],
    "pure": ["password", "hashedPassword"]
  },
  "variants": {
    "pure": { "enabled": true, "suffix": ".model" },
    "input": { "enabled": true, "suffix": ".input" },
    "result": { "enabled": true, "suffix": ".output" }
  }
}
```

Aligns with typical request/response patterns + internal model snapshot.

## How far `globalExclusions.input` reaches

`globalExclusions.input` is not limited to the `.input` variant files. It applies to every CRUD input object whose name contains `Create`, `Update` or `Where`, because all of those resolve to the `input` variant. Two exemptions keep the generated types compatible with Prisma's own:

- `WhereUniqueInput` schemas always keep every field.
- Base Create input objects (`UserCreateInput`, `UserUncheckedCreateInput`, `UserCreateManyInput`, `UserCreateWithoutPostsInput`, and the nested/connect-or-create variations) keep every field while `strictCreateInputs` stays at its default of `true`.

`WhereInput` and `UpdateInput` are **not** exempt. With the config above:

- `UserWhereInput` loses `id`, `createdAt` and `updatedAt`, so you can no longer filter — or `deleteMany` / `updateMany` — by those fields.
- `UserUpdateInput` loses them too, which is usually what you want for `updatedAt` but rarely for `id`.

If you only want to trim the generated variant files and leave the CRUD input objects alone, use `variants.input.excludeFields` instead — that list is applied when emitting variant files and is never consulted by the CRUD object generator:

```json title="zod-generator.config.json"
{
  "variants": {
    "input": { "enabled": true, "suffix": ".input", "excludeFields": ["id", "createdAt", "updatedAt"] }
  }
}
```
