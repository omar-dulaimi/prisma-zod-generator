<div align="center">
	<h1>Prisma Zod Generator</h1>
	<p><strong>Prisma → Zod in one generate. Ship validated, typed data everywhere.</strong></p>
	<p>
		<a href="https://www.npmjs.com/package/prisma-zod-generator"><img alt="npm version" src="https://img.shields.io/npm/v/prisma-zod-generator.svg?color=16C464&label=npm"></a>
		<a href="https://www.npmjs.com/package/prisma-zod-generator"><img alt="downloads" src="https://img.shields.io/npm/dw/prisma-zod-generator.svg?color=8B5CF6&label=downloads"></a>
		<a href="https://github.com/omar-dulaimi/prisma-zod-generator/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/omar-dulaimi/prisma-zod-generator/ci.yml?branch=master&label=CI"></a>
		<a href="https://github.com/omar-dulaimi/prisma-zod-generator/blob/master/LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0a0a.svg"></a>
		<img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-blue.svg">
		<img alt="Module formats" src="https://img.shields.io/badge/modules-ESM%20%2B%20CJS-444.svg">
		<a href="https://omar-dulaimi.github.io/prisma-zod-generator/"><img alt="Docs" src="https://img.shields.io/badge/docs-website-0ea5e9.svg"></a>
	</p>
	<sub>
		Prisma → Zod generator: zero‑boilerplate validation for your models.<br/>
		✍️ comment rules · ⚡ fast/minimal mode · 🎯 selective filtering · 🔒 strict types
	</sub>
</div>

---

> Docs: https://omar-dulaimi.github.io/prisma-zod-generator/

## Core Features

| Feature | Description |
|---------|-------------|
| **🔧 Generation Modes** | |
| Full Mode | Generate all schemas (CRUD, objects, enums, variants) |
| Minimal Mode | Lean subset: basic CRUD only, no complex nesting |
| Custom Mode | Explicitly control what gets generated |
| **📋 Schema Types** | |
| Pure Model Schemas | Direct model validation with optional relations |
| CRUD Operation Schemas | Validation for findMany, create, update, etc. |
| Input Object Schemas | WhereInput, CreateInput, UpdateInput, etc. |
| Result Schemas | Return type validation for operations |
| Enum Schemas | Prisma enum validation |
| **🎯 Schema Variants** | |
| Pure Variant | Canonical model snapshot (all fields) |
| Input Variant | Data for create/update (omits id, timestamps) |
| Result Variant | Data returned to callers (full model) |
| Custom Array Variants | User-defined variants with field exclusions |
| **🔍 Filtering & Selection** | |
| Model Filtering | Include/exclude specific models |
| Operation Filtering | Control which CRUD operations to generate |
| Field Filtering | Include/exclude fields per model/variant |
| Wildcard Patterns | Use glob patterns for flexible filtering |
| **📁 File Organization** | |
| Multi-file Output | Separate files per schema (default) |
| Single-file Bundle | All schemas in one file |
| Custom Directory Structure | Control where schemas are placed |
| ESM Import Extensions | Automatic .js extensions for ESM compatibility |
| **🏷️ Naming Customization** | |
| Naming Presets | Built-in patterns (default, zod-prisma, etc.) |
| Custom File Patterns | Control filename generation |
| Custom Export Names | Control export name generation |
| Token-based Patterns | Use {Model}, {operation}, {kebab}, etc. |
| **🔒 Type Safety** | |
| Dual Exports | Both typed (Prisma) and pure Zod schemas |
| Strict Type Binding | Explicit Prisma type annotations |
| ESM/CJS Support | Works with both module systems |
| **💾 Data Handling** | |
| JSON Field Support | Enhanced JSON validation and transforms |
| Bytes Field Support | Buffer/Uint8Array handling |
| DateTime Strategy | Date/string conversion options |
| Optional/Nullable Fields | Configurable optional field behavior |
| WhereUniqueInput Parity | Full Prisma Client compatibility |
| Relation Handling | Proper optional/required field mapping |
| **🎨 Advanced Features** | |
| Zod Comments | Inline validation rules via `@zod` comments |
| JSON Schema Compatibility | `z.toJSONSchema()` ready for OpenAPI integration |
| Circular Dependency Resolution | Smart relation exclusion to avoid cycles |
| Aggregate Support | Count, min, max, avg, sum operations |
| Select/Include Schemas | Validation for Prisma select/include |
| Custom Zod Import Target | Configure where Zod is imported from |
| Array Field Handling | Proper wrapping for enum arrays and nullable arrays |
| **⚡ Performance** | |
| Lazy Loading | Circular imports handled via z.lazy() |
| Minimal Bundle Size | Tree-shakeable exports |
| Fast Generation | Optimized schema building |
| **🛡️ Safety & Validation** | |
| Configurable Safety System | Manifest tracking and strict controls |
| Output Path Safety | Prevents accidental overwrites |
| File Collision Detection | Warns about naming conflicts |
| Config Validation | JSON schema validation of config |
| Unused Enum Generation | Include enums even if not directly used |
| **🔧 Database Support** | |
| PostgreSQL | Full support including arrays, JSON |
| MySQL | Complete compatibility |
| SQLite | Full feature support |
| MongoDB | Document model support |
| SQL Server | Complete compatibility |
| CockroachDB | PostgreSQL-compatible features |


## Prerequisites

- Node.js 18+
- Prisma installed and initialized (`npx prisma init`)
- Zod installed (runtime for generated schemas)

## Quick start

1) Star this repo 🌟

2) Install

```bash
npm i -D prisma-zod-generator
# pnpm: pnpm add -D prisma-zod-generator
# yarn: yarn add -D prisma-zod-generator
# bun:  bun add -d prisma-zod-generator
```

3) Add a generator block to your `schema.prisma`

```prisma
generator zod {
	provider = "prisma-zod-generator"
}
```

4) Generate

```bash
npx prisma generate
```

5) Import and use

```ts
// Default output exports an index; adjust path if you customized output
import { UserSchema } from './prisma/generated/schemas';

// Validate data
const parsed = UserSchema.safeParse({ id: 'clx...', email: 'a@b.com' });
if (!parsed.success) console.error(parsed.error.format());
```

## Docs & recipes

- Guides and recipes: https://omar-dulaimi.github.io/prisma-zod-generator/
- See `recipes/` in this repo for ready‑to‑copy setups

## Sponsor ❤️

If this saves you time or prevents bugs, please consider sponsoring to support maintenance and new features.

→ https://github.com/sponsors/omar-dulaimi

## Contributing

PRs welcome. Keep diffs focused and discuss larger changes in an issue first. See the test suites for expected behavior and coverage.

## License

MIT © [Omar Dulaimi](https://github.com/omar-dulaimi)

