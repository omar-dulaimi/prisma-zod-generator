---
id: config-options
title: All Configuration Options
description: Every configuration option in one table, with its type, observed default, where it can be set, and the page that explains it.
---

Options come from three sources. Later sources win: internal defaults, then the JSON config file, then the Prisma `generator` block. Safety options additionally accept environment variables, which outrank both of those. See [Configuration Precedence](/docs/config/precedence).

The **Where** column uses three values:

- `config file` — key only in the JSON config file (the file named by `config = "./..."`, or an auto-discovered one).
- `generator block` — key only in the Prisma `generator` block.
- `both` — settable in either. Where the generator-block spelling differs, see [Generator block spellings](#generator-block-spellings).

Defaults are the **observed** values the generator resolves at runtime, which is not always what the bundled JSON Schema advertises — see [Where the bundled JSON Schema disagrees](#where-the-bundled-json-schema-disagrees). Options marked † are declared but never read; they have no effect today (see [Declared but not read](#declared-but-not-read)).

## Options

| Option | Type | Default (observed) | Where | Explained in |
| --- | --- | --- | --- | --- |
| `$schema` | string | — (editor metadata; generation ignores it) | config file | [/docs/config/schema-json](/docs/config/schema-json) |
| `mode` | `"full" \| "minimal" \| "custom"` | `"full"` | both | [/docs/config/modes](/docs/config/modes) |
| `minimalOperations` | string[] | `["findMany","findUnique","findFirst","create","update","delete"]` | config file | [/docs/config/modes](/docs/config/modes) |
| `output` | string | `./generated`, resolved relative to the schema directory | both | [/docs/config/precedence](/docs/config/precedence) |
| `prismaClientPath` | string | derived from the `generator client` block's own `output`, not read unless set | config file | |
| `useMultipleFiles` | boolean | `true` | both | [/docs/config/file-layout](/docs/config/file-layout) |
| `singleFileName` | string | `"schemas.ts"` | both | [/docs/config/file-layout](/docs/config/file-layout) |
| `placeSingleFileAtRoot` | boolean | `true` | both | [/docs/config/file-layout](/docs/config/file-layout) |
| `placeArrayVariantsAtRoot` | boolean | `false` | config file | [/docs/config/file-layout](/docs/config/file-layout) |
| `formatGeneratedSchemas` | boolean | `false` | config file | |
| `pureModels` | boolean | `false`; `true` in minimal mode | config file | [/docs/pipeline/pure-models](/docs/pipeline/pure-models) |
| `pureModelsLean` | boolean | `true` | both | [/docs/pipeline/pure-models](/docs/pipeline/pure-models) |
| `pureModelsIncludeRelations` | boolean | `false` | both | [/docs/pipeline/pure-models](/docs/pipeline/pure-models) |
| `pureModelsExcludeCircularRelations` | boolean | `false` | both | [/docs/recipes/circular-dependency-exclusion](/docs/recipes/circular-dependency-exclusion) |
| `naming.preset` | `"default" \| "zod-prisma" \| "zod-prisma-types" \| "legacy-model-suffix"` | `"default"` | config file | [/docs/reference/naming-preset-map](/docs/reference/naming-preset-map) |
| `naming.pureModel.filePattern` | string, must end in `.ts` | `"{Model}.schema.ts"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.pureModel.schemaSuffix` | string (empty allowed) | `"Schema"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.pureModel.typeSuffix` | string (empty allowed) | `"Type"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.pureModel.exportNamePattern` | string | `"{Model}{SchemaSuffix}"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.pureModel.legacyAliases` | boolean | `false` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.schema.filePattern` | string, must end in `.ts` | `"{operation}{Model}.schema.ts"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.schema.exportNamePattern` | string | `"{Model}{Operation}Schema"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.input.filePattern` | string, must end in `.ts` | `"{InputType}.schema.ts"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.input.exportNamePattern` | string | `"{Model}{InputType}ObjectSchema"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.enum.filePattern` | string, must end in `.ts` | `"{Enum}.schema.ts"` | config file | [/docs/config/naming](/docs/config/naming) |
| `naming.enum.exportNamePattern` | string | `"{Enum}Schema"` | config file | [/docs/config/naming](/docs/config/naming) |
| `dateTimeStrategy` | `"date" \| "coerce" \| "isoString"` | `"date"` | both | [/docs/config/datetime-strategy](/docs/config/datetime-strategy) |
| `dateTimeSplitStrategy` | boolean | `true` | both | [/docs/config/datetime-strategy](/docs/config/datetime-strategy) |
| `decimalMode` | `"number" \| "string" \| "decimal"` | `"decimal"` | config file | [/docs/pipeline/special-types](/docs/pipeline/special-types) |
| `optionalFieldBehavior` | `"optional" \| "nullable" \| "nullish"` | `"nullish"` | both | [/docs/config/optional-fields](/docs/config/optional-fields) |
| `jsonSchemaCompatible` | boolean | `false` | both | [/docs/config/json-schema-compatibility](/docs/config/json-schema-compatibility) |
| `jsonSchemaOptions.dateTimeFormat` | `"isoString" \| "isoDate"` | `"isoString"` | both | [/docs/config/json-schema-compatibility](/docs/config/json-schema-compatibility) |
| `jsonSchemaOptions.bigIntFormat` | `"string" \| "number"` | `"string"` | both | [/docs/config/json-schema-compatibility](/docs/config/json-schema-compatibility) |
| `jsonSchemaOptions.bytesFormat` | `"base64String" \| "hexString"` | `"base64String"` | both | [/docs/reference/bytes-json](/docs/reference/bytes-json) |
| `jsonSchemaOptions.conversionOptions.unrepresentable` † | `"throw" \| "any"` | `"any"` (declared) | both | [/docs/config/json-schema-compatibility](/docs/config/json-schema-compatibility) |
| `jsonSchemaOptions.conversionOptions.cycles` † | `"ref" \| "throw"` | `"throw"` (declared) | both | [/docs/config/json-schema-compatibility](/docs/config/json-schema-compatibility) |
| `jsonSchemaOptions.conversionOptions.reused` † | `"inline" \| "ref"` | `"inline"` (declared) | both | [/docs/config/json-schema-compatibility](/docs/config/json-schema-compatibility) |
| `typedJson.schemaModule` | string | none (absent means the feature is off) | config file | [/docs/integrations/prisma-json-types-generator](/docs/integrations/prisma-json-types-generator) |
| `typedJson.schemaSuffix` | string (empty allowed) | `"Schema"` | config file | [/docs/integrations/prisma-json-types-generator](/docs/integrations/prisma-json-types-generator) |
| `typedJson.namespace` | string (identifier) | `"PrismaJson"` | config file | [/docs/integrations/prisma-json-types-generator](/docs/integrations/prisma-json-types-generator) |
| `typedJson.applyToResults` | boolean | `false` | config file | [/docs/integrations/prisma-json-types-generator](/docs/integrations/prisma-json-types-generator) |
| `typedJson.emitNamespace` | boolean | `false` | config file | [/docs/integrations/prisma-json-types-generator](/docs/integrations/prisma-json-types-generator) |
| `typedJson.namespaceOutput` | string | `"./prisma-json-types.d.ts"` | config file | [/docs/integrations/prisma-json-types-generator](/docs/integrations/prisma-json-types-generator) |
| `typedJson.map` | object (`TypeName` → Zod expression) | `{}` | config file | [/docs/integrations/prisma-json-types-generator](/docs/integrations/prisma-json-types-generator) |
| `zodImportTarget` | `"auto" \| "v3" \| "v4"` | `"auto"` | config file | [/docs/recipes/zod-import-targets](/docs/recipes/zod-import-targets) |
| `zodImportPath` | string | `"zod"`; `"zod/v3"` when target is `v3`, `"zod/v4"` when target is `v4` | config file | [/docs/recipes/zod-import-targets](/docs/recipes/zod-import-targets) |
| `strictCreateInputs` | boolean | `true` | config file | [/docs/recipes/granular-per-model](/docs/recipes/granular-per-model) |
| `preserveRequiredScalarsOnCreate` | boolean | `true` | config file | [/docs/recipes/granular-per-model](/docs/recipes/granular-per-model) |
| `inferCreateArgsFromSchemas` † | boolean | `false` (declared) | config file | |
| `addSelectType` | boolean | `true`; forced `false` in minimal mode | both | |
| `addIncludeType` | boolean | `true`; forced `false` in minimal mode | both | |
| `exportTypedSchemas` | boolean | `true` | both | [/docs/config/dual-exports](/docs/config/dual-exports) |
| `exportZodSchemas` | boolean | `true` | both | [/docs/config/dual-exports](/docs/config/dual-exports) |
| `typedSchemaSuffix` | string | `"Schema"` | both | [/docs/config/dual-exports](/docs/config/dual-exports) |
| `zodSchemaSuffix` | string | `"ZodSchema"` | both | [/docs/config/dual-exports](/docs/config/dual-exports) |
| `globalExclusions.input` | string[] | `[]` | config file | [/docs/config/filtering](/docs/config/filtering) |
| `globalExclusions.result` | string[] | `[]` | config file | [/docs/config/filtering](/docs/config/filtering) |
| `globalExclusions.pure` | string[] | `[]` | config file | [/docs/config/filtering](/docs/config/filtering) |
| `globalExclusions.operations` | operation names[] | `[]` | config file | [/docs/config/filtering](/docs/config/filtering) |
| `variants.pure.enabled` | boolean | `true` | both | [/docs/config/variants](/docs/config/variants) |
| `variants.input.enabled` | boolean | `true` | both | [/docs/config/variants](/docs/config/variants) |
| `variants.result.enabled` | boolean | `true`; `false` in minimal mode | both | [/docs/config/variants](/docs/config/variants) |
| `variants.<variant>.suffix` | string starting with `.` | `".model"` / `".input"` / `".result"` | config file | [/docs/config/variants](/docs/config/variants) |
| `variants.<variant>.excludeFields` | string[] | `[]`; `["id","createdAt","updatedAt"]` for `input` in minimal mode | config file | [/docs/config/variants](/docs/config/variants) |
| `variants.<variant>.partial` | boolean | `false` | config file | [/docs/config/variants](/docs/config/variants) |
| `variants.<variant>.strictMode` | boolean \| null | `null` (inherit) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `variants[].name` | string | required for the array form | config file | [/docs/config/variants](/docs/config/variants) |
| `variants[].suffix` | string | `name` with the first letter capitalized | config file | [/docs/config/variants](/docs/config/variants) |
| `variants[].exclude` | string[] | `[]` | config file | [/docs/config/variants](/docs/config/variants) |
| `variants[].additionalValidation` | `Record<string, string>` | `{}` | config file | [/docs/config/variants](/docs/config/variants) |
| `variants[].makeOptional` | string[] | `[]` | config file | [/docs/config/variants](/docs/config/variants) |
| `variants[].transformRequiredToOptional` | string[] | `[]` | config file | [/docs/config/variants](/docs/config/variants) |
| `variants[].transformOptionalToRequired` | boolean | `false` | config file | [/docs/config/variants](/docs/config/variants) |
| `variants[].removeValidation` | boolean | `false` | config file | [/docs/config/variants](/docs/config/variants) |
| `models.<Model>.enabled` | boolean | `true` | config file | [/docs/recipes/granular-per-model](/docs/recipes/granular-per-model) |
| `models.<Model>.operations` | operation names[] | all 17 operations; the minimal set in minimal mode | config file | [/docs/config/filtering](/docs/config/filtering) |
| `models.<Model>.variants.<variant>` | same shape as `variants.<variant>` | inherits the global variant config | config file | [/docs/config/variants](/docs/config/variants) |
| `models.<Model>.strictMode.enabled` | boolean \| null | `null` (inherit) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `models.<Model>.strictMode.operations` | boolean \| operation names[] \| null | `null` (inherit) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `models.<Model>.strictMode.exclude` | operation names[] | `[]` | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `models.<Model>.strictMode.objects` | boolean \| null | `null` (inherit) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `models.<Model>.strictMode.variants.pure` | boolean \| null | `null` (inherit) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `models.<Model>.strictMode.variants.input` | boolean \| null | `null` (inherit) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `models.<Model>.strictMode.variants.result` | boolean \| null | `null` (inherit) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `models.<Model>.fields.exclude` (legacy) | string[] | `[]` | config file | [/docs/config/filtering](/docs/config/filtering) |
| `models.<Model>.fields.include` (legacy) | string[] | `[]` | config file | [/docs/config/filtering](/docs/config/filtering) |
| `emit.enums` | boolean | `true` | config file | [/docs/config/emission-controls](/docs/config/emission-controls) |
| `emit.objects` | boolean | `true` | config file | [/docs/config/emission-controls](/docs/config/emission-controls) |
| `emit.crud` | boolean | `true` | config file | [/docs/config/emission-controls](/docs/config/emission-controls) |
| `emit.results` | boolean | unset — only `false` has an effect | config file | [/docs/config/emission-controls](/docs/config/emission-controls) |
| `emit.pureModels` | boolean | mirrors `pureModels` | config file | [/docs/config/emission-controls](/docs/config/emission-controls) |
| `emit.variants` | boolean | `true` | config file | [/docs/config/emission-controls](/docs/config/emission-controls) |
| `safety.level` | `"strict" \| "standard" \| "permissive" \| "disabled"` | `"standard"` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.enabled` | boolean | `true` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.allowDangerousPaths` | boolean | `false`; `true` under `permissive` and `disabled` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.allowProjectRoots` | boolean | `false`; `true` under `disabled` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.allowUserFiles` | boolean | `false`; `true` under `permissive` and `disabled` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.skipManifest` | boolean | `false`; `true` under `disabled` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.warningsOnly` | boolean | `false`; `true` under `permissive` and `disabled` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.customDangerousPaths` | string[] | `[]` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.customProjectFiles` | string[] | `[]` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `safety.maxUserFiles` | number | `5`; `0` under `strict`, `50` under `permissive`, unlimited under `disabled` | both | [/docs/reference/safety-system](/docs/reference/safety-system) |
| `strictMode.enabled` | boolean | `true` | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `strictMode.operations` | boolean | `true` | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `strictMode.objects` | boolean | `true` | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `strictMode.variants` | boolean | `true` | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `strictMode.enums` † | boolean | `true` (declared) | config file | [/docs/config/strict-mode](/docs/config/strict-mode) |
| `validateWhereUniqueAtLeastOne` | boolean | `false` | config file | [/docs/reference/where-unique-input](/docs/reference/where-unique-input) |

Operation names, wherever the table says `operation names[]`, are drawn from: `findMany`, `findUnique`, `findUniqueOrThrow`, `findFirst`, `findFirstOrThrow`, `create`, `createMany`, `createManyAndReturn`, `update`, `updateMany`, `updateManyAndReturn`, `upsert`, `delete`, `deleteMany`, `aggregate`, `groupBy`, `count`.

`emit.results: true` does not force result schemas on. Only `emit.results: false` changes behavior; otherwise minimal mode and `variants.result.enabled: false` still suppress them.

## Generator block spellings

Some options have a different key name in the Prisma `generator` block. Generator-block values are always strings.

| Generator block key | Maps to | Notes |
| --- | --- | --- |
| `config` | — | Path to the JSON config file. Generator block only. |
| `output` | `output` | Native Prisma attribute (not part of the config map). Wins over the JSON config `output` when the `generator zod` block spells it out. |
| `minimal` | `mode` | `"true"` sets `mode: "minimal"`. `"false"` leaves the config file's `mode` untouched. |
| `variants` | `variants.<variant>.enabled` | Comma-separated list of `pure`, `input`, `result`. Variants not listed are disabled. |
| `isGenerateSelect` | `addSelectType` | |
| `isGenerateInclude` | `addIncludeType` | |
| `safetyLevel` | `safety.level` | |
| `safetyEnabled` | `safety.enabled` | |
| `safetyAllowDangerousPaths` | `safety.allowDangerousPaths` | |
| `safetyAllowProjectRoots` | `safety.allowProjectRoots` | |
| `safetyAllowUserFiles` | `safety.allowUserFiles` | |
| `safetySkipManifest` | `safety.skipManifest` | |
| `safetyWarningsOnly` | `safety.warningsOnly` | |
| `safetyMaxUserFiles` | `safety.maxUserFiles` | |
| `safetyCustomDangerousPaths` | `safety.customDangerousPaths` | Comma-separated. |
| `safetyCustomProjectFiles` | `safety.customProjectFiles` | Comma-separated. |
| `jsonSchemaOptions` | `jsonSchemaOptions` | Must be a JSON object encoded as a string. |

Every other `both` row in the main table uses the same key name in the generator block as in the config file.

## Safety environment variables

These override both the generator block and the config file.

| Variable | Maps to |
| --- | --- |
| `PRISMA_ZOD_SAFETY_LEVEL` | `safety.level` |
| `PRISMA_ZOD_SAFETY_ENABLED` | `safety.enabled` |
| `PRISMA_ZOD_SAFETY_ALLOW_DANGEROUS_PATHS` | `safety.allowDangerousPaths` |
| `PRISMA_ZOD_SAFETY_ALLOW_PROJECT_ROOTS` | `safety.allowProjectRoots` |
| `PRISMA_ZOD_SAFETY_ALLOW_USER_FILES` | `safety.allowUserFiles` |
| `PRISMA_ZOD_SAFETY_SKIP_MANIFEST` | `safety.skipManifest` |
| `PRISMA_ZOD_SAFETY_WARNINGS_ONLY` | `safety.warningsOnly` |
| `PRISMA_ZOD_SAFETY_MAX_USER_FILES` | `safety.maxUserFiles` |
| `PRISMA_ZOD_SAFETY_CUSTOM_DANGEROUS_PATHS` | `safety.customDangerousPaths` |
| `PRISMA_ZOD_SAFETY_CUSTOM_PROJECT_FILES` | `safety.customProjectFiles` |

## Other environment variables

Not tied to a config key; read directly by the generator entrypoint.

| Variable | Effect |
| --- | --- |
| `PZG_SKIP=1` (or `true`) | Skips generation entirely for this run. `prisma generate` still runs — this generator does nothing when its turn comes and leaves whatever is already on disk untouched. Useful for a production build where schemas are already committed and regenerating them is wasted CI time rather than a no-op. |
| `PZG_NO_BANNER=1` (or `true`) | Silences the periodic sponsor message printed after install/generate. |
| `PZG_DEV_MODE=true` | Bypasses the Pro license check in a local checkout of this repo. Has no effect outside it. |

## Declared but not read

These keys are accepted, validate cleanly, and appear in editor IntelliSense, but no code in the generation pipeline reads them. Setting them changes nothing.

- **`inferCreateArgsFromSchemas`** — declared in the config schema, the `GeneratorConfig` type, and the runtime defaults, and referenced nowhere else in the codebase. Reserved for future work on typing operation `Args` from generated schemas rather than `Prisma.*`. Today, create-input shaping is controlled entirely by `strictCreateInputs` and `preserveRequiredScalarsOnCreate`.
- **`strictMode.enums`** — enum schemas are `z.enum(...)`, which has no `.strict()` to apply.
- **`jsonSchemaOptions.conversionOptions.*`** (`unrepresentable`, `cycles`, `reused`) — the generator never calls `z.toJSONSchema()` itself, so it has nothing to forward these to. Pass them directly to your own `z.toJSONSchema(schema, options)` call instead.

## Where the bundled JSON Schema disagrees

The `Default (observed)` column above reports what the generator actually does. Four points where the bundled JSON Schema (`lib/config/schema.json`) says something else:

| Option | JSON Schema says | Generator does |
| --- | --- | --- |
| `placeArrayVariantsAtRoot` | `default: true` | Treats an absent key as `false`, writing array-form variants to `schemas/variants/` |
| `addSelectType` | `default: false` | Resolves to `true` when the key is absent, so Select schemas are generated unless minimal mode is active |
| `addIncludeType` | `default: false` | Resolves to `true` when the key is absent, so Include schemas are generated unless minimal mode is active |
| `safety.level` | `enum` omits `"disabled"` | Accepts `"disabled"` and applies the corresponding preset |

The `dateTimeSplitStrategy` doc comment on the `GeneratorConfig` type also says `Default: false`, but both the JSON Schema and the runtime defaults use `true`.

## Keys the bundled JSON Schema does not declare

The JSON Schema sets `additionalProperties: false`, and the generator does not run it during generation, so these work but your editor will flag them as unknown properties. See [JSON Schema IntelliSense](/docs/config/schema-json).

- `minimalOperations`
- The array form of `variants`, and every `variants[].*` key
- `exportTypedSchemas`, `exportZodSchemas`, `typedSchemaSuffix`, `zodSchemaSuffix`
- `models.<Model>.fields.exclude` and `models.<Model>.fields.include` (legacy)
- The array form of `globalExclusions` (a flat `string[]` applied to every variant)
- `minimal: true` as a config-file key (equivalent to `mode: "minimal"`)

The same trade-off applies to typos: an unrecognized key is silently ignored rather than reported.

## Minimal example

A config file, saved as `prisma/config.json`:

```json
{
  "$schema": "../node_modules/prisma-zod-generator/lib/config/schema.json",
  "mode": "custom",
  "pureModels": true,
  "optionalFieldBehavior": "optional",
  "emit": {
    "objects": false,
    "crud": false
  }
}
```

Wired up in `schema.prisma`:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  config   = "./config.json"
  output   = "../src/schemas"
}
```

`optionalFieldBehavior` decides how a schema-optional field is wrapped in the pure model. For `bio String?`:

```ts
// "optionalFieldBehavior": "nullish"  (default)
bio: z.string().nullish(),

// "optionalFieldBehavior": "optional"
bio: z.string().optional(),

// "optionalFieldBehavior": "nullable"
bio: z.string().nullable(),
```
