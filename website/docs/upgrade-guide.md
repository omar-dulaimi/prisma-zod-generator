---
id: upgrade-guide
title: Upgrade Guide
---

This guide highlights actions needed when upgrading between notable versions.

## Compatibility

| Requirement | Supported |
| --- | --- |
| Prisma | `^7.0.0` (2.x) — use `prisma-zod-generator@1.32.1` for Prisma 6 |
| Node.js | `>= 20.19.0` |
| Zod | `>= 3.25.0 < 5` (Zod 4 recommended) |

## 1.x → 2.x (breaking)

**v2.0.0 requires Prisma 7.** If a Prisma older than 7 is detected, the generator prints:

```
[prisma-zod-generator] ⚠️ Detected prisma@<version>, but this release requires Prisma >=7.
Please pin prisma-zod-generator to ^1.32.1 while you remain on Prisma 6, or upgrade Prisma before using 2.x.
```

2.x targets `prisma`, `@prisma/client`, `@prisma/generator-helper`, and `@prisma/internals` at `^7.0.0`, so staying on Prisma 6 means staying on `prisma-zod-generator@1.32.1`.

The Prisma baseline is the only breaking change recorded for 2.0.0 — no JSON config keys were renamed or removed, so an existing `zod-generator.config.json` carries over unchanged.

## 2.0 → 2.3 (no breaking changes)

Additive only. New surface you may want to adopt:

- `zodImportPath` (2.3.0) — import `z` from your own module, e.g. a configured Zod instance with an i18n error map. The binding style still follows `zodImportTarget`.
- `@zod.meta({ ... })` and `@zod.describe("...")` metadata annotations at field and model level (2.2.0). `.meta()` needs Zod v4; under v3 it downgrades to `.describe()` when a `description` key is present, otherwise it is dropped with a warning.
- Typed JSON fields via `@zod.import([...]).custom.use(...)`, honored in pure models as well as CRUD objects (2.3.1) and hoisted correctly in single-file mode (2.3.3).
- Result-schema relation fields now reference the related model's schema — `z.array(TagSchema).optional()` — when `pureModels` is enabled (2.3.2).

## 1.6 → 1.7 (breaking)

Prisma `Bytes` is validated as `z.instanceof(Uint8Array)` in generated I/O schemas. Pure models continue to default to a base64 string with size checks — see [Bytes & JSON Details](./reference/bytes-json.md).

## Within 1.x

No breaking changes in generator output shape between 1.7 and 1.32.
