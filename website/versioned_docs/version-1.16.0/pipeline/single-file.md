---
id: single-file
title: Single File Mode
---

Enable with `useMultipleFiles: false`.

Mechanics:

- Initializes aggregator with resolved bundle path.
- Writes all schema content through in-memory collection.
- After generation, flushes aggregator and deletes sibling entries (keeps bundle only).
- Adjusts Prisma Client import to relative path if custom client output.
- Suppresses variant emission to avoid directory clutter.

Use when embedding schemas directly into application packages or publishing a lightweight distribution.
