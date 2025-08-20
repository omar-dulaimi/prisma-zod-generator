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

```jsonc
"gen:debug": "DEBUG_PRISMA_ZOD=1 prisma generate"
```

## Warning Categories

- File layout conflicts (generator block vs JSON) – precedence reminder.
- Minimal mode suppression of select/include.
- Config load failure fallback.
- Validation warnings (filter combinations).

## Tips

- Keep logs with issues to speed triage.
- Disable after debugging to reduce CI noise.
