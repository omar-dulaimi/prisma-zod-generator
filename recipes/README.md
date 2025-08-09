# Recipes: common configuration presets and patterns

This folder collects community-requested “recipes” as drop-in JSON configs and small code/prisma snippets. Pick what matches your use-case, copy the JSON into your project as `zod-generator.config.json` (or any name you reference), and point your Prisma generator block at it:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  output   = "./prisma/generated"
  // point to the recipe you chose (copy into your app repo)
  config   = "./zod-generator.config.json"
}
```

Notes:
- All recipe files are pure JSON (no comments). Adjust paths and model names for your app.
- You can combine ideas across recipes. Options follow the precedence documented in the root README.
- For single-file output, variants are automatically skipped internally; you don’t need to disable them.

## Index

- single-file.json — One physical file with everything (Issue #140)
- models-only.json — Only pure model schemas (Issues #139, #43)
- minimal-crud.json — Minimal mode: CRUD only (Issue #84)
- api-result-schemas.json — Result/response schemas only (Issue #72)
- hide-fields.json — Hide properties globally/per-model (Issue #75)
- granular-per-model.json — Select operations per model, disable models (Issue #49)
- trpc-optimized.json — Input/output focused for tRPC (Issues #49, #139)
- snippets/schema-comments.prisma — Rich @zod field validation (Issue #80)
- snippets/derive-trpc-schemas.ts — Derive request schemas via omit/extend (Issue #49)

## How to use

1) Copy a recipe JSON to your application repo as `zod-generator.config.json`.
2) Update your Prisma `generator zod` block to set `config = "./zod-generator.config.json"`.
3) Adjust `output`, operations, model names, and exclusions to match your needs.
4) Run generation.

## Acknowledgements

These recipes are distilled from community requests and discussions in issues: #140, #139, #84, #80, #75, #72, #49, #43.
