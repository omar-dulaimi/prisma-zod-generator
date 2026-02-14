# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Prisma Generator that automatically generates Zod schemas from Prisma schema files. It reads Prisma schema definitions and transforms them into TypeScript Zod validation schemas for API endpoint validation.

## Key Commands

**IMPORTANT**: Always use `pnpm`, never use `npm` or `npx`.

## Windows + WSL Policy

- On Windows hosts, run repository commands through WSL by default.
- Prefer: `wsl.exe bash -lc "<command>"`.
- Only use PowerShell/CMD when explicitly requested or when a task is Windows-only.

### Build and Generate
- `pnpm exec tsc` - Compile TypeScript to JavaScript in the `lib/` directory
- `pnpm prisma generate` - Generate Zod schemas from Prisma schema
- `pnpm run gen-example` - Build and generate schemas in one command

### Development
- `pnpm run check-uncommitted` - Check for uncommitted changes before publishing
- `pnpm run package:publish` - Full publish process (update, check, package, publish)

## Architecture

### Core Components

**Generator Entry Point**: `src/generator.ts` - Simple shebang script that imports the main logic

**Main Logic**: `src/index.ts` - Entry point that orchestrates the generation process

**Transformer**: `src/transformer.ts` - Core class that transforms Prisma DMMF into Zod schemas
- Handles model operations (CRUD), enums, object schemas
- Manages imports and schema relationships
- Supports MongoDB, PostgreSQL, MySQL providers
- Handles Select/Include generation when enabled

**Helper Functions**: `src/helpers/` directory contains specialized helpers:
- `model-helpers.ts` - Model-specific transformations
- `aggregate-helpers.ts` - Aggregate operation support
- `include-helpers.ts` - Include schema generation
- `select-helpers.ts` - Select schema generation
- `mongodb-helpers.ts` - MongoDB-specific logic

**Utilities**: `src/utils/` directory:
- `writeFileSafely.ts` - Safe file writing with directory creation
- `formatFile.ts` - Code formatting using Prettier
- `writeIndexFile.ts` - Index file generation
- `removeDir.ts` - Directory cleanup

### Generated Output Structure

The generator creates schemas in the output directory (default: `./generated/schemas/`):
- `enums/` - Enum validation schemas
- `objects/` - Object validation schemas for input types
- Root level - Operation schemas (findMany, create, update, etc.)
- `index.ts` - Barrel export file

### Key Features

- **Provider Support**: Handles PostgreSQL, MySQL, MongoDB, SQL Server
- **Aggregate Operations**: Supports count, min, max, avg, sum aggregations
- **Relation Handling**: Manages complex model relationships
- **Select/Include**: Optional generation of select and include schemas
- **Type Safety**: Full TypeScript support with Prisma type imports
- **Custom Output**: Configurable output directory and Prisma client path

## Development Notes

- The project uses `private: true` in package.json - this is a generator, not a published package
- TypeScript compilation outputs to `lib/` directory
- The `package/` directory contains the packaged version for distribution
- Generator options can be configured in the Prisma schema generator block
- Test schemas are generated in `prisma/generated/schemas/` for development/testing

## Contribution Workflow

- Package manager: always use `pnpm`.
- Formatting & linting: run `pnpm format` then `pnpm lint` before pushing; commit any resulting changes.
- Conventional Commits with scope: `type(scope): subject`.
  - Choose `type` based on impact: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, etc.
  - Example: `fix(variants): include .js in ESM index imports`.
- Commit in small, logical units and add/update tests for behavior changes.
- Pull requests: use the preinstalled GitHub CLI with a Markdown body file.
  - Create a new body file (e.g., `.github/PR_BODY.md`) containing: Summary, Problem, Fix, Validation, and linked issues (e.g., `Fixes #234`).
  - Open the PR: `gh pr create --base master --head <branch> --title "fix(scope): concise title" --body-file .github/PR_BODY.md`.
  - Prefer keeping PR body files untracked unless explicitly requested.
- Ensure `pnpm build`, `pnpm test`, `pnpm format:check`, and `pnpm lint` succeed prior to push/PR.

## Local Overrides

- Use `CLAUDE.local.md` for private, repository-local Claude instructions.
- Keep `CLAUDE.local.md` untracked.
