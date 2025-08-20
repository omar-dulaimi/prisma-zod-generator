# Recipes overview

This folder contains “recipes”: small, focused configuration presets you can drop into your project. A recipe is a starting point for a common setup; details and trade‑offs live in each recipe’s own README.

What a recipe includes
- A `zod-generator.config.json` you can copy as‑is.
- A short `README.md` explaining when/why to use it.
- Optionally, a `schema.prisma` snippet to help you wire it up.

How to use a recipe
1) Copy the recipe’s `zod-generator.config.json` into your repo (rename if you like).
2) Reference it from your Prisma generator block and set your desired output path.
3) Run Prisma generate.

Generator block example
```prisma
generator zod {
  provider = "prisma-zod-generator"
  output   = "./prisma/generated"
  // path is relative to schema.prisma
  config   = "./zod-generator.config.json"
}
```

Important precedence note
- The Prisma generator block takes precedence over JSON for simple file‑layout options.
- If `schema.prisma` sets `useMultipleFiles`, `singleFileName`, or `placeSingleFileAtRoot`, it will override the JSON. Keep them aligned to avoid surprises.

Discover recipes
- Browse the folders under `recipes/`. Each folder has its own README with specifics and trade‑offs.

Validation
- The test suite validates every `.json` in `recipes/` against the config schema to catch drift early.

Contributing a new recipe
- Add `recipes/<your-name>/` with:
  - `zod-generator.config.json` (no comments)
  - `README.md` describing the use case
  - Optional `schema.prisma` snippet
- Run tests to validate your JSON before opening a PR.

Troubleshooting
- If file layout looks off, compare the generator block and JSON—generator block wins for layout.
- You can enable verbose logs by setting `DEBUG_PRISMA_ZOD=1` during generation to surface conflicts.
