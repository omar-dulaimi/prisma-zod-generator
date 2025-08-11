# Recipes: common configuration presets and patterns

This folder collects community-requested “recipes” as drop-in JSON configs and small code/prisma snippets. Pick what matches your use-case, copy the JSON into your project as `zod-generator.config.json` (or any name you reference), and point your Prisma generator block at it.

Important: The Prisma generator block takes precedence over the JSON for simple options like file layout. If your schema.prisma sets `useMultipleFiles`, `singleFileName`, or `placeSingleFileAtRoot`, it will override the recipe JSON. Keep them in sync to avoid surprises.

```prisma
generator zod {
  provider = "prisma-zod-generator"
  output   = "./prisma/generated"
  // point to the recipe you chose (copy into your app repo)
  config   = "./zod-generator.config.json"
}
```

Recommended generator blocks

- Single-file output

```prisma
generator zod {
  provider              = "prisma-zod-generator"
  output                = "./prisma/generated"
  // Keep these in the generator block so they can't be accidentally overridden
  useMultipleFiles      = false
  singleFileName        = "schemas.ts" // optional; default is schemas.ts
  placeSingleFileAtRoot = true         // optional; default is true
  config                = "./zod-generator.config.json"
}
```

- Multi-file output (models-only and most others)

```prisma
generator zod {
  provider         = "prisma-zod-generator"
  output           = "./prisma/generated"
  useMultipleFiles = true
  config           = "./zod-generator.config.json"
}
```

Tip: If your generator block already sets `useMultipleFiles`, `singleFileName`, or `placeSingleFileAtRoot`, make sure those match the recipe to prevent unexpected extra files or a bundle when you wanted many files.

Notes on logging: If there’s a mismatch, you’ll see a concise, tagged info line in the Prisma output. Enable `DEBUG_PRISMA_ZOD=1` for conflict details.

Notes:
- All recipe files are pure JSON (no comments). Adjust model names for your app. The output path is controlled by the Prisma generator block, not the JSON.
- You can combine ideas across recipes. Options follow the precedence documented in the root README.
- For single-file output, variant files are skipped internally; you don’t need to disable them.

Per-recipe generator block snippets

See ready-to-copy blocks under the top-level snippets/<recipe>/schema.prisma:

- ../snippets/single-file/schema.prisma
- ../snippets/models-only/schema.prisma
- ../snippets/minimal-crud/schema.prisma
- ../snippets/api-result-schemas/schema.prisma
- ../snippets/trpc-optimized/schema.prisma
- ../snippets/hide-fields/schema.prisma
- ../snippets/granular-per-model/schema.prisma

Foldered quick-starts

Prefer a copy-paste starter? Each recipe now has a folder with:

- zod-generator.config.json (ready to use)
- generator.prisma.example (matching generator block)
- README.md (short how-to)

Folders:

- models-only/
- single-file/
- minimal-crud/
- api-result-schemas/
- trpc-optimized/
- hide-fields/
- granular-per-model/

## Index

- single-file/ — One physical file with everything (Issue #140)
- models-only/ — Only pure model schemas (Issues #139, #43)
- minimal-crud/ — Minimal mode: CRUD only (Issue #84)
- api-result-schemas/ — Result/response schemas only (Issue #72)
- hide-fields/ — Hide properties globally/per-model (Issue #75)
- granular-per-model/ — Select operations per model, disable models (Issue #49)
- trpc-optimized/ — Input/output focused for tRPC (Issues #49, #139)
- snippets/schema-comments.prisma — Rich @zod field validation (Issue #80)
- snippets/derive-trpc-schemas.ts — Derive request schemas via omit/extend (Issue #49)

## How to use

1) Copy a recipe JSON to your application repo as `zod-generator.config.json`.
2) Update your Prisma `generator zod` block to set `config = "./zod-generator.config.json"`.
3) Adjust the generator block `output` (path) and make sure `useMultipleFiles`/`singleFileName` match the recipe you chose.
4) Run generation.

## Create input strictness options

Two config switches control how Create-like inputs handle exclusions:

- strictCreateInputs (boolean, default: true)
  - true: Create* inputs match Prisma exactly; exclusions do not apply to these inputs.
  - false: Exclusions apply to Create* inputs as well.
- preserveRequiredScalarsOnCreate (boolean, default: true)
  - When strictCreateInputs is false, this keeps truly required scalar fields present in Create* inputs even if they are listed for exclusion.

Tip: To fully hide fields (including required scalars) from Create* inputs, set:

{ "strictCreateInputs": false, "preserveRequiredScalarsOnCreate": false }

## Acknowledgements

These recipes are distilled from community requests and discussions in issues: #140, #139, #84, #80, #75, #72, #49, #43.
