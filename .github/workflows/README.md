# CI/CD Workflows

Three workflows live in this directory. That is the complete list — if something
is not described here, it does not run.

## `ci.yml` — CI

**Trigger**: push or PR to `master`, gated by a `filter` job that skips the run
when the range touches only docs, recipes or workflow config *and* no commit
message carries a release-worthy type.

**`test`** — Node 20.19.0, 22.x, 24.x:

1. `pnpm run gen-example` — build, then generate the example schemas
2. `pnpm run typecheck`
3. `pnpm run lint` — reported but `continue-on-error`, so it never blocks
4. `pnpm test` — every file matched by the vitest `include` glob, not a
   hand-maintained list, so a new test file cannot be silently left out
5. `pnpm run test:coverage:ci` — Node 24 only; thresholds calibrated for a
   checkout *without* the private `src/pro` submodule

No database services are provisioned, and none are needed: the provider suites
only run `prisma generate`, which never connects.

**`package-test`** — the only job that checks out the private submodule, so the
only place its checks can run:

1. builds and packages, then `npm pack --dry-run`
2. `pnpm run test:package-consumer` — installs the tarball into a throwaway
   project and generates through it
3. `pnpm run test:typecheck-fixtures` — type-checks emitted Pro UI output
   against the real MUI, Chakra, Mantine and Pact packages

> **Known gap:** the vitest suite never runs with the submodule present. `test`
> has no submodule (the `pro-*` suites self-skip) and `package-test` runs only
> the two commands above, one of which is a single Pro test file. So 20 of the
> 21 `tests/pro-*.test.ts` files execute only on a machine that has the
> submodule checked out.

## `docs.yml` — Docs

**Trigger**: push to `master` or manual dispatch. Also filtered, so it only
deploys when the pushed range actually touches the docs site. Builds
`website/` and deploys it to GitHub Pages.

## `semantic-release.yml` — Release

**Trigger**: push to `master` or manual dispatch; skipped when the head commit
message contains `[skip ci]`.

Initializes the private submodule, runs `gen-example`, `typecheck`, `lint` and
`pnpm test`, builds the package, then runs `semantic-release`. Publishing uses
**npm Trusted Publishing** (OIDC via `id-token: write`), so there is no npm
token to manage.

## Configuration

**`.releaserc.json`** — conventional commits; changelog generation; publishes
from `package/`. Release branches: `master`, plus
`upgrade/prisma-and-dependencies` as a `beta` prerelease line.

## Secrets

Only two, and one is automatic:

- `GITHUB_TOKEN` — provided by GitHub
- `SUBMODULE_DEPLOY_KEY` — SSH deploy key for the private `src/pro` submodule;
  required by `package-test` and by the release workflow

## Branch protection

Require the `test` and `package-test` checks on `master`.

## Commit messages

Conventional commits, with a scope: `type(scope): subject`.

`feat` → minor, `fix`/`perf`/`refactor` → patch, `BREAKING CHANGE:` in the
footer or `!` after the type → major. `docs`, `style`, `test`, `chore`, `ci`
and `build` do not themselves trigger a release.

## Running the same checks locally

```bash
pnpm run gen-example
pnpm run typecheck
pnpm run lint
pnpm test
pnpm test:coverage      # local thresholds, higher than the CI ones
pnpm run release:dry    # what semantic-release would do
```
