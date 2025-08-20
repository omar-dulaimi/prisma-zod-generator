---
id: file-layout
title: File Layout & Single File Mode
---

Options:

- `useMultipleFiles` (default true)
- `singleFileName` (default `schemas.ts`)
- `placeSingleFileAtRoot` (default true) – root of output vs `schemas/` subdir
- `placeArrayVariantsAtRoot` (only for array variants)

Single-file mode:

1. Aggregates generated content (initSingleFile)
2. Writes final bundle (flushSingleFile)
3. Cleans sibling files in target directory
4. Disables variant emission path

Layout conflicts between generator block & JSON config are surfaced (generator block wins).
