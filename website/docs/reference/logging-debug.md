---
id: logging-debug
title: Logging & Debug Output
---

Minimal by default; enable debug for deep diagnostics.

## Default Output

Shows only warnings that affect emission (layout conflicts, minimal mode suppressions, config load fallback).

## Enable Debug

```bash
DEBUG_PRISMA_ZOD=1 npx prisma generate
# or
DEBUG=prisma-zod npx prisma generate
```

Add npm script:

```json title="package.json"
{
  "scripts": {
    "gen:debug": "DEBUG_PRISMA_ZOD=1 prisma generate"
  }
}
```

:::note
There are no module-scoped debug namespaces. `DEBUG_PRISMA_ZOD=1` (or `DEBUG=1` / `DEBUG=prisma-zod`) enables **all** generator debug output; any other `DEBUG` value leaves it off. Warnings, info, and errors always print — only `logger.debug` output is gated.
:::

## Warning Categories

Configuration and layout:

- File layout conflicts (generator block vs JSON) – precedence reminder.
- Minimal mode suppression of select/include.
- Config load failure fallback.
- Validation warnings (filter combinations).

`@zod` annotation parsing:

- `Some @zod annotations were invalid and filtered out: …` – one or more annotations failed validation and were dropped; the rest still applied.
- `Unknown @zod method: <method> - generating as-is` – the method is not in the known validation table, so it is passed straight through to the emitted schema.
- `Failed to detect Zod version, defaulting to v3 syntax` – the installed `zod` version could not be resolved.
- `Method <method> not supported in Zod v3; falling back to z.string()` – a v4-only string format was requested under Zod v3.
- `@zod.meta() requires Zod v4; dropped for <Model>.<field> (no description key to map to .describe)` – field-level `@zod.meta()` under Zod v3 with nothing to downgrade to `.describe()`.
- `@zod.meta() on a model requires Zod v4; annotation dropped` – the model-level equivalent.

Environment:

- `Detected prisma@<version>, but this release requires Prisma >=7.` – printed as an informational notice, together with the suggestion to pin `prisma-zod-generator` to `^1.32.1` while you stay on Prisma 6. Generation still proceeds.

## Tips

- Keep logs with issues to speed triage.
- Disable after debugging to reduce CI noise.
