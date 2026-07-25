---
id: precedence
title: Configuration Precedence
---

Final config is assembled in stages:

1. Generator block options (Prisma `schema.prisma`) – highest priority.
2. JSON config file – either the explicit `config` path or an auto-discovered file (see [Auto-Discovery](#auto-discovery)).
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

## Auto-Discovery

When the generator block omits `config`, the generator looks for a config file **in the directory containing your `schema.prisma`** — the same base directory used for explicit `config` paths. For the usual `prisma/schema.prisma` layout that means every candidate below lives inside `prisma/`.

Candidates are tried in this order:

1. `zod-generator.config.json`
2. `.zod-generator.json`
3. `prisma/config.json` (i.e. `prisma/prisma/config.json` for the standard layout)
4. `config.json`

:::caution
A config file at the **project root** is not auto-discovered, because discovery starts from the schema directory. Point at it explicitly instead:

```prisma title="prisma/schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  config   = "../zod-generator.config.json"  // → project-root config
}
```

Only JSON is supported. The lookup also probes `zod-generator.config.js` and `.zod-generator.js`, but every candidate is read with `JSON.parse`, so an actual JavaScript module fails to load rather than being evaluated.
:::

## Unknown Keys Are Silently Ignored

The generator does **not** validate your config against the JSON Schema. Generation runs `parseConfiguration` → `mergeConfigurationWithPrecedence` → `processConfiguration`; the only check applied to the file is that it parses as JSON and is an object. A misspelled key such as `pureModel` (instead of `pureModels`) or `strictmode` (instead of `strictMode`) is therefore accepted, dropped during merging, and never reported — which usually surfaces as "my setting did nothing".

To catch typos, opt into schema validation: wire up `$schema` for editor squiggles and run `ConfigurationValidator` in CI. See [JSON Schema IntelliSense](./schema-json.md).

## Output Path Resolution

Output path resolution is deferred until after merging so a JSON `output` applies when the generator block omits `output`. Like config paths, output paths are also resolved relative to the schema file location.

Conflict warnings are logged (file layout options) via `warnOnFileLayoutConflicts`—generator block wins.

Legacy flags (e.g. `isGenerateSelect`, `isGenerateInclude`) are folded into the unified config; minimal mode forcibly disables select/include even if legacy flags true.
