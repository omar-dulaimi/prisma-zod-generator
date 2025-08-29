---
id: precedence
title: Configuration Precedence
---

Final config is assembled in stages:

1. Generator block options (Prisma `schema.prisma`) – highest priority.
2. JSON config file (explicit `config` path or auto-discovered: `zod-generator.config.json`, `prisma/config.json`, `config.json`).
3. Internal defaults (`processConfiguration`).

## Config File Path Resolution

Config file paths are resolved **relative to the Prisma schema file directory**, not the project root:

```prisma title="prisma/schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  config   = "./my-config.json"  // → prisma/my-config.json
}
```

```prisma title="apps/api/schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  config   = "../../shared/zod.config.json"  // → shared/zod.config.json
}
```

This allows flexible config placement in monorepos and projects with custom schema locations.

## Output Path Resolution

Output path resolution is deferred until after merging so a JSON `output` applies when the generator block omits `output`. Like config paths, output paths are also resolved relative to the schema file location.

Conflict warnings are logged (file layout options) via `warnOnFileLayoutConflicts`—generator block wins.

Legacy flags (e.g. `isGenerateSelect`, `isGenerateInclude`) are folded into the unified config; minimal mode forcibly disables select/include even if legacy flags true.
