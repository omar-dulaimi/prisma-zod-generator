---
title: Drift Guard
---

> **Available in:** Professional, Business, Enterprise tiers

CI helper to catch breaking changes in generated outputs (schema/API drift).

## What It Does

- Compares generated output between `--base` and `--head` branches
- Detects breaking changes in schemas, types, and APIs
- Produces GitHub-formatted reports for PR comments

## Prerequisites

```bash
# PZG Pro license required (PZG_LICENSE_KEY)
```

## Generate & Run

```bash
pnpm exec pzg-pro guard --schema=./prisma/schema.prisma --base=origin/main --head=HEAD --format=github
```

### Command Options

- `--schema <path>` – Path to your Prisma schema (defaults to `./prisma/schema.prisma`).
- `--base <ref>` – Git reference to compare from (defaults to `origin/main`).
- `--head <ref>` – Git reference to compare to (defaults to `HEAD`).
- `--format <github|json|text>` – Output format (defaults to `github`).
- `--json`, `--text`, `--github` – Shortcut flags for `--format`.
- `--strict` – Treat warnings as breaking changes.
- `--allowed-break <identifier>` – Whitelist specific breaking change identifiers (repeatable).
- `--help` – Show usage and exit.

Identifiers are `<Model>.<field>:<change>` for field-level changes and `<Model>:<change>` for
model- and enum-level ones — for example `User.email:field_removed`, `User.role:type_changed`, or
`Session:model_removed`.

The command runs entirely on the command line—no custom scripts required. Make sure you execute it inside a git repo (so the base ref can be resolved) and with a valid PZG Pro license available (`PZG_LICENSE_KEY`).

Under the hood the CLI loads the DMMF for the base and head schemas, runs `validateDriftFromDMMF`, and prints a GitHub-friendly report. A non-zero exit code indicates breaking changes.

:::tip Git history
Fetch the full history (`fetch-depth: 0`) before running the command in CI so the base ref’s schema can be read.
:::

### Programmatic API

Prefer to orchestrate things yourself? Import `validateDriftFromDMMF` from `prisma-zod-generator/lib/pro` and feed it the base/head DMMF documents alongside your generator configuration. The CLI is thin sugar over that helper.

It resolves to `{ success, changes, output }`, so you can inspect `result.changes` to build the identifiers used by `--allowed-break`.

## GitHub Actions

```yaml
name: PZG Drift Guard
on: [pull_request]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm i --frozen-lockfile
      - run: pnpm exec pzg-pro guard --base=origin/main --head=HEAD --format=github
        env:
          PZG_LICENSE_KEY: ${{ secrets.PZG_LICENSE_KEY }}
```


## See Also

- [Contract Testing](./contracts.md) - Test API contracts
- [SDK Publisher](./sdk.md) - Detect SDK breaking changes
