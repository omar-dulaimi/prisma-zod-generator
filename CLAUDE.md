# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Prisma Generator that automatically generates Zod schemas from Prisma schema files. It reads Prisma schema definitions and transforms them into TypeScript Zod validation schemas for API endpoint validation.

## Key Commands

### Build and Generate
- `tsc` - Compile TypeScript to JavaScript in the `lib/` directory
- `npx prisma generate` - Generate Zod schemas from Prisma schema
- `npm run gen-example` - Build and generate schemas in one command

### Development
- `npm run check-uncommitted` - Check for uncommitted changes before publishing
- `npm run package:publish` - Full publish process (update, check, package, publish)

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