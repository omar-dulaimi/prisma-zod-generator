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

## Highlights

- Zero‑boilerplate Zod schemas generated from your Prisma models
- Multiple variants for different layers: input, result, and pure models
- Fast minimal mode and filtering when you only need a subset
- Type‑safe across ESM/CJS, works great with TypeScript strict

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

