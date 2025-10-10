## Summary
Fix pure model naming issues causing import/export mismatches when custom naming is configured. Relations now reference the correct configured export symbol and imports resolve to the correct file paths across presets and custom patterns. Also aligns type export naming with the schema export name without using `any`.

## Motivation / Context
This addresses the failures reproduced by `pnpm gen-example` and the behavior described in issue #272. With custom `naming.pureModel.exportNamePattern` (e.g., `z{Model}`) and `filePattern` (e.g., `{model}.ts`), the generator previously imported non-existent symbols like `{Model}Schema` and used incorrect relative paths. It also produced inconsistent type export names.

## Changes
- Resolve relation symbols via `naming.pureModel.exportNamePattern` instead of hard-coded `{Model}Schema`.
- Derive related model import paths using `naming.pureModel.filePattern` (supports `{Model}`, `{model}`, `{camel}`, `{kebab}`) and actual suffix values.
- Align type export naming with the schema export name:
  - Default pattern → `PostSchema` + `PostType`.
  - Custom pattern (e.g., `z{Model}`) → `zUser` + `zUserType`.
  - Empty `typeSuffix` → preserves `Model` type alias to avoid surprises.
- Keep circular relations as-is (no `any` workaround); removed previous `ZodTypeAny` usage.
- Exclude generated output folders from repository build to avoid tsc picking up generated artifacts.

Touched files:
- `src/generators/model.ts`
- `tsconfig.json`
- `package.json` (pnpm ignored built Prisma deps for local dev ergonomics; optional to keep/squash)

## Testing / Validation
- Reproduced and validated `pnpm gen-example` locally.
- Verified circular exclusion tests and naming customization relation import tests:
  - `vitest --config vitest.config.mjs run tests/circular-dependency-exclusion.test.ts` → pass
  - `vitest --config vitest.config.mjs run tests/naming-customization.test.ts -t "generates correct import paths for custom filePattern with relations"` → pass
- Ran `pnpm build`. Formatting and lint executed before commit.

## Breaking changes
- None expected. Changes respect existing defaults and only alter behavior under custom naming patterns.

## Related issues
Closes #272

## Checklist
- [ ] Tests added/updated (existing tests cover changes)
- [x] Docs updated (N/A - internal behavior)
- [x] Typecheck / Lint / Format pass
