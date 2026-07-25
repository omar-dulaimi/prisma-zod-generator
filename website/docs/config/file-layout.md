---
id: file-layout
title: File Layout & Single File Mode
---

Options:

- `useMultipleFiles` (default true)
- `singleFileName` (default `schemas.ts`)
- `placeSingleFileAtRoot` (default true) – root of output vs `schemas/` subdir
- `placeArrayVariantsAtRoot` (default `false`) – applies only to the array form of `variants`, e.g. `"variants": [{ "name": "input", "suffix": "Input" }]`. When `false` (the default) those files are written to `schemas/variants/`; set it to `true` to write them to the `schemas/` root.

:::note
The bundled JSON Schema currently advertises `default: true` for `placeArrayVariantsAtRoot`. The generator's actual behaviour is `false` — omitting the key puts array variants under `schemas/variants/`.
:::

Single-file mode:

1. Aggregates generated content (initSingleFile)
2. Hoists and de-duplicates the shared `literalSchema` / `jsonSchema` helpers so the bundle defines them exactly once
3. Hoists external `@zod.import` custom-validator modules into the bundle instead of stripping them along with the other relative imports
4. Writes final bundle (flushSingleFile)
5. Cleans sibling files in target directory
6. Disables variant emission path

See [Single File Mode](../pipeline/single-file.md) for the full bundling pipeline.

Layout conflicts between generator block & JSON config are surfaced (generator block wins).
