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

### Pull request body files (important)
- Never commit PR body files to the repository.
- Use a temporary file outside the repo (e.g., `/tmp/pr-body.md`) when running `gh pr create`:
  - `gh pr create --base master --head <branch> --title "fix(scope): concise title" --body-file /tmp/pr-body.md`
- If a body file must be created within the workspace for tooling reasons, it must be placed under a temp path that is ignored by git (e.g., `.tmp/pr-body.md`), and deleted immediately after PR creation.
- Ensure the PR body contains: Summary, Motivation/Context, Changes, Testing/Validation, Breaking changes, Related issues (e.g., `Closes #123`), and a short checklist.

### Commit Workflow (Improved)
Follow this process to create a high‑quality Conventional Commit:

1. Decide scope of commit
   - If staged changes exist (`git diff --cached --name-only` not empty), commit only those.
   - Otherwise, stage everything with `git add -A`.

2. Detect package manager / scripts
   - Prefer `pnpm` when available (lockfile or `corepack pnpm --version`).
   - Inspect `package.json` for `typecheck`, `lint`, and `format` scripts.

3. Quality gates (best-effort; skip gracefully if unavailable)
   - Typecheck: run `pnpm run typecheck` (or `npx tsc --noEmit` if TS project detected).
   - Lint: run `pnpm run lint` (or `npx eslint . --max-warnings=0` if config exists).
   - Format: run `pnpm run format` (or `npx prettier -w .` if config exists).
   - If any gate fails, stop and fix before committing.

4. Analyze changes to compose a Conventional Commit
   - Scope: infer from the most common first path segment of changed files.
   - Type: `feat`/`fix` for `src/` code; `test`, `docs`, `chore`/`build` as appropriate.
   - Breaking changes: append `!` and add a `BREAKING CHANGE:` footer when applicable.
   - Subject: concise, imperative (≤ 72 chars). Body: bullets of key changes; link issues (e.g., `Closes #123`).

5. Commit
   - Write message to a temp file; then `git commit -F <tempfile>`.

Policies
- Never mention AI/assistants in commits.
- Keep subject lines ≤ 72 chars; wrap body at ~100 chars.
- Use Commitizen (`git cz`) if available; otherwise follow above.

### Pull Request Workflow (Improved)
Create and push a feature branch, generate a rich PR body, and open a PR with GitHub CLI:

1. Branch strategy
   - From the default branch (synced to latest `origin/<default>`), create a branch if needed:
     - Name: `<type>/<scope>-<short-desc-kebab>` (e.g., `feat/api-add-pagination`).
     - Use `git fetch origin && git rebase origin/<default>` to ensure up-to-date.

2. Commit changes
   - Run the commit workflow above first to ensure clean, formatted changes.

3. Analyze branch changes
   - Compare against default: `git log --oneline --no-decorate --reverse origin/<default>..HEAD` and
     `git diff --name-status origin/<default>..HEAD`.
   - PR title: from the first non-chore Conventional Commit; else from latest commit.
   - Aggregate commits to build a comprehensive change list.

4. Generate PR body (markdown)
   - Include: Summary, Motivation/Context, Changes, Screenshots/Demos (if UI), Testing/Validation, Breaking changes, Related issues (`Closes #123`), Checklist.
   - Write to a temp file (e.g., `/tmp/pr-body.md` or `.tmp/pr-body.md`).

5. Push & open PR
   - `git push -u origin HEAD`
   - `gh pr create --base <default> --title "<title>" --body-file <tempfile>`

6. Labels, reviewers, cleanup
   - Add labels/reviewers as needed.
   - Delete the temp body file.

Policies
- PR title follows Conventional Commits; no AI mentions.
