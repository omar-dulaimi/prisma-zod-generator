---
id: single-file
title: Single File Mode
---

Enable with `useMultipleFiles: false`.

Mechanics:

- Initializes aggregator with resolved bundle path.
- Writes all schema content through in-memory collection — nothing is written per-file, so directories such as `models/` and their index files are never created.
- Strips imports between generated schemas (everything is inlined) while hoisting imports that point outside the generated tree: external modules declared with `@zod.import` are collected, deduplicated, sorted and re-emitted in the bundle header, so annotations referencing your own validators or JSON types still compile.
- Recognises the Zod import by its `z` binding rather than a hardcoded `zod` path, so a custom `zodImportPath` module survives bundling.
- Strips the per-file inline `literalSchema` / `jsonSchema` definitions and emits a single hoisted copy in the header.
- After generation, flushes aggregator and deletes sibling entries (keeps bundle only).
- Adjusts Prisma Client import to relative path if custom client output.
- Suppresses variant emission to avoid directory clutter.

:::caution
The cleanup step removes **every** entry beside the bundle, files and directories alike, and with the default `placeSingleFileAtRoot: true` that directory is the generator's output root. It does not apply the manifest-based protections the multi-file path uses. Give the zod generator its own `output` directory — never one shared with the Prisma Client generator or with hand-written files — when `useMultipleFiles` is `false`.
:::

Relative paths inside `@zod.import` statements are kept verbatim in the bundle header, so they must resolve from the bundle's own location.

Use when embedding schemas directly into application packages or publishing a lightweight distribution.
