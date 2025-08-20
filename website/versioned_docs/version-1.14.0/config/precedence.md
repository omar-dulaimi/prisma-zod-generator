---
id: precedence
title: Configuration Precedence
---

Final config is assembled in stages:

1. Generator block options (Prisma `schema.prisma`) – highest priority.
2. JSON config file (explicit `config` path or auto-discovered: `zod-generator.config.json`, `prisma/config.json`, `config.json`).
3. Internal defaults (`processConfiguration`).

Output path resolution is deferred until after merging so a JSON `output` applies when the generator block omits `output`.

Conflict warnings are logged (file layout options) via `warnOnFileLayoutConflicts`—generator block wins.

Legacy flags (e.g. `isGenerateSelect`, `isGenerateInclude`) are folded into the unified config; minimal mode forcibly disables select/include even if legacy flags true.
