# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript source for the generator. Key areas: `variants/`, `generators/`, `utils/`, `config/` (e.g., `src/prisma-generator.ts`, `src/variants/generator.ts`).
- `tests/` — Vitest test suite (e.g., `tests/prisma-client-esm-config.test.ts`).
- `prisma/` — Example schemas/utilities used by tests (multi‑provider helpers).
- `scripts/` — Release and docs tooling.
- `website/` — Docusaurus documentation site.
- `.github/` — CI workflows and templates.

## Build, Test, and Development Commands
Use pnpm.
- `pnpm install` — Install dependencies.
- `pnpm build` — Compile TypeScript (tsc).
- `pnpm test` — Run the default Vitest suite.
- `pnpm test:full` — Broader test pass (multiple suites).
- `pnpm test:ci` — CI‑oriented tests with coverage.
- `pnpm lint` — ESLint over `src/` and `tests/` (auto‑fix where safe).
- `pnpm format` / `pnpm format:check` — Prettier write/check.
- `pnpm gen-example` — Build and run a local generate cycle.

## Coding Style & Naming Conventions
- Language: TypeScript; aim for clear, typed APIs.
- Formatting: Prettier; Linting: ESLint. Run `pnpm format && pnpm lint` before pushing.
- Indentation: 2 spaces; line endings: LF.
- Naming: files use kebab‑case (e.g., `prisma-generator.ts`); types/interfaces PascalCase; functions/variables camelCase; prefer named exports.
- ESM/CJS: Preserve existing module boundaries and index emit patterns.

## Testing Guidelines
- Framework: Vitest. Tests live under `tests/` and end with `.test.ts`.
- Add focused tests alongside related areas (e.g., ESM index generation in `tests/prisma-client-esm-config.test.ts`).
- Run `pnpm test` locally; for comprehensive checks use `pnpm test:full` or `pnpm test:ci`.

## Commit & Pull Request Guidelines
- Use Conventional Commits with a scope: `type(scope): subject` (e.g., `fix(variants): include .js in ESM index imports`).
- Choose `type` intentionally based on impact: `feat`, `fix`, `docs`, `refactor`, `chore`, etc.
- Keep commits small and atomic; update/add tests with behavior changes.
- Before push: run and commit `pnpm format` and `pnpm lint` fixes; ensure `pnpm build`, `pnpm test`, and `pnpm format:check` pass.
- Create PRs with the preinstalled GitHub CLI and a dedicated Markdown body file, e.g.:
  - `gh pr create --base master --head <branch> --title "fix(scope): concise title" --body-file .github/PR_BODY.md`
  - The body file must be properly formatted (summary, rationale, linked issues like `Fixes #234`, and verification steps).
