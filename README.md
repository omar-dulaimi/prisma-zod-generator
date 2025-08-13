<div align="center">
	<h1>Prisma Zod Generator</h1>
	<p><strong>Prisma → Zod in one generate. Ship validated data everywhere.</strong></p>
	<p>
		<a href="https://www.npmjs.com/package/prisma-zod-generator"><img alt="npm version" src="https://img.shields.io/npm/v/prisma-zod-generator.svg?color=16C464&label=version"></a>
		<a href="https://www.npmjs.com/package/prisma-zod-generator"><img alt="weekly downloads" src="https://img.shields.io/npm/dw/prisma-zod-generator.svg?color=8B5CF6&label=downloads"></a>
		<a href="https://github.com/omar-dulaimi/prisma-zod-generator/actions"><img alt="CI status" src="https://img.shields.io/github/actions/workflow/status/omar-dulaimi/prisma-zod-generator/ci.yml?branch=master&label=CI"></a>
		<a href="https://github.com/omar-dulaimi/prisma-zod-generator/blob/master/LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-0a0a0a.svg"></a>
		<img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-informational.svg">
		<img alt="Module formats" src="https://img.shields.io/badge/modules-esm%20%2B%20cjs-444.svg">
	</p>
	<sub><code>input</code> · <code>result</code> · <code>pure</code> variants • comment rules • minimal mode • targeted filtering</sub>
</div>

---

> 📘 Docs: https://omar-dulaimi.github.io/prisma-zod-generator/

## Prerequisites

- Node.js 18+ (or Bun / Deno with Prisma compatibility layer)
- Prisma (installed & `npx prisma init` done)
- Zod (runtime dependency for the generated schemas)
- TypeScript recommended (strict mode ideal)

## Quick Start ⚡

**1. Install (pick one)**
```bash
# npm
npm i -D prisma-zod-generator zod
```
```bash
# pnpm
pnpm add -D prisma-zod-generator zod
```
```bash
# yarn
yarn add -D prisma-zod-generator zod
```
```bash
# bun
bun add -d prisma-zod-generator zod
```

**2. Add to schema.prisma**
```prisma
generator zod {
	provider = "prisma-zod-generator"
}
```

**3. Generate**
```bash
npx prisma generate
```

**4. Use**
```ts
import { UserSchema } from './prisma/generated/zod';
```

Optional config: add `prisma/zod-generator.config.json` only if you need tweaks.


## ❤️ Sponsor

If this generator saves you engineering hours or reduces production risk, sponsoring keeps it fast, stable, and evolving.

Your support helps:

- Prioritized issue triage & regression fixes
- New variant / edge‑case coverage (providers, previews)
- Performance & DX improvements (leaner outputs, smarter filtering)
- Continued compatibility as Prisma & Zod evolve

Monthly tiers (GitHub Sponsors) unlock:

| Tier | Intended For | Perks |
| ---- | ------------- | ----- |
| Solo | Indie devs | 💖 Listed in README (opt‑in) |
| Team | Startups | Priority issues + roadmap influence |
| Scale | Companies | Early feature previews + escalation channel |

➡️  Sponsor here: https://github.com/sponsors/omar-dulaimi

One‑off support also welcome (GitHub custom amount).


## Contribute
PRs welcome. Keep diffs small; no unrelated refactors.

Before starting a feature or significant refactor: **open an issue / feature request first** (or discuss in an existing one) so we can:
- Confirm scope & fit
- Avoid duplicate / misaligned work
- Point you to internal patterns or existing WIP

Okay to skip issue for: typo fixes, tiny docs tweaks, test flake isolation.

See tests for coverage expectations.

## License
Released under the MIT License – see [LICENSE](./LICENSE) for full text.

Built & maintained by [Omar Dulaimi](https://github.com/omar-dulaimi) with community contributors.

