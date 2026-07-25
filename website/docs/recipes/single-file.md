---
id: single-file
title: Single File Bundle
---

```json title="zod-generator.config.json"
{
  "useMultipleFiles": false,
  "singleFileName": "schemas.ts",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true },
    "input": { "enabled": true },
    "result": { "enabled": false }
  }
}
```

Produces one portable file; the variants directory is suppressed.

:::caution Give the bundle a dedicated output directory
After the bundle is written, the generator empties the directory it sits in: every other file is unlinked and every other subdirectory is removed recursively. With the default `placeSingleFileAtRoot: true` that directory is your configured `output`, so pointing single-file mode at a directory shared with another generator — a `prisma-client` output, for example — deletes that generator's files. This post-pass is not governed by any [safety](./safety-custom-configuration.md) option and does not apply the Prisma-client preservation list that smart cleanup uses.

Set `placeSingleFileAtRoot: false` to put the bundle in a `schemas/` subdirectory instead, which narrows the wipe to that subdirectory (if `output` already ends in `schemas`, the two settings resolve to the same directory).
:::

## What the bundler does

Every generated schema is collected in memory and inlined into one file. Internal imports between generated files are stripped, and the following are hoisted once into the bundle header:

- **The Zod import**, honouring both `zodImportTarget` and `zodImportPath` — the bundle reuses the same import line the multi-file output would emit, so `zod/v3`, `zod/v4` and custom module paths all carry through.
- **The Prisma type import** (`import type { Prisma } from …`), rewritten to a single specifier regardless of how many directory depths contributed to the bundle. If the client generator declares an `importFileExtension`, it is applied here too.
- **The JSON helpers** `literalSchema` and `jsonSchema`, deduplicated to one copy instead of one per contributing file (v2.1.5).
- **External `@zod.import` modules** — custom validator modules referenced from annotations are hoisted into the bundle rather than stripped (v2.3.3).

:::note `@zod.import` paths are kept verbatim
Hoisted `@zod.import` lines are copied unchanged, so a relative specifier must resolve from the **bundle's** location, not from the model or schema file that carried the annotation. Absolute or package specifiers avoid the issue entirely.
:::
