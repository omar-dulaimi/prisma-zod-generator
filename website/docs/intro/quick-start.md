---
id: quick-start
title: Quick Start
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## 1. Install

### Requirements

| Component | Minimum  | Recommended |
| --------- | -------- | ----------- |
| Node.js   | 20.19.0  | 22.x        |
| Prisma    | 7.0.0    | Latest 7.x  |
| Zod       | 3.25.0   | Latest 4.x  |
| TypeScript | 5.4.0   | 5.9.x       |

Zod 3.25+ and Zod 4 are both supported — the published peer range is `zod >=3.25.0 <5`. On Zod 3, set [`zodImportTarget: "v3"`](../recipes/zod-import-targets.md) so generated files import from `zod/v3`. A few Zod 4-only outputs degrade on v3 with a generation-time warning: `@zod.meta({...})` becomes `.describe(...)` when it carries a description (and is dropped otherwise), and Zod 4-only string formats such as `@zod.httpUrl()` fall back to the base `z.string()`.

<Tabs>
<TabItem value="npm" label="npm">

```bash
npm install -D prisma prisma-zod-generator
npm install zod @prisma/client
```

</TabItem>
<TabItem value="yarn" label="yarn">

```bash
yarn add -D prisma prisma-zod-generator
yarn add zod @prisma/client
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add -D prisma prisma-zod-generator
pnpm add zod @prisma/client
```

</TabItem>
</Tabs>

The generator runs at build time, so it belongs in `devDependencies` alongside the `prisma` CLI. Installing `prisma` locally also matters for correctness: this release requires Prisma 7 or newer, and the version check only runs when `prisma` is resolvable from your schema.

## 2. Add generator to `schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

generator zod {
  provider = "prisma-zod-generator"
  // optional output = "./generated" → resolves to prisma/generated (relative to the schema file)
  // optional config = "./zod-generator.config.json" (relative to schema file)
}
```

:::caution The prisma-client provider requires an output
The `prisma-client` generator must be given an explicit `output`. Omit it and Prisma fails the entire `generate` run with _An output path is required for the `prisma-client` generator_ — before any generator gets to run. The legacy `prisma-client-js` provider does not need one. Both providers work with prisma-zod-generator, but at least one of them must be present in your schema, or the generator throws its own error.
:::

:::info Path Resolution
Both `output` and `config` are resolved **relative to the Prisma schema file location**, not the project root. If your schema is at `prisma/schema.prisma`, then `config = "./my-config.json"` looks for `prisma/my-config.json`, and `output = "./generated"` writes to `prisma/generated`. When `output` is omitted entirely, the default is `<schema dir>/generated`.
:::

## 3. (Optional) Create configuration file — needed for `UserSchema` in step 5

Create `prisma/zod-generator.config.json` (next to your schema file):

```json title="prisma/zod-generator.config.json"
{
  "pureModels": true
}
```

`mode: "full"` and all three variants (`pure`, `input`, `result`) are already on by default, so `pureModels` is the only switch doing work here.

:::note
The config file must be strict JSON — the loader parses it with `JSON.parse`, so no comments and no trailing commas. A malformed file either fails loudly with `Invalid JSON in configuration file` (when referenced via `config = "..."`) or is skipped in favour of defaults when it was auto-discovered.
:::

## 4. Generate

```bash
npx prisma generate
```

## 5. Consume

With zero config you get the variant schemas and the CRUD operation schemas:

```ts
import { UserInputSchema, UserFindManySchema } from './prisma/generated/schemas';

UserInputSchema.parse(body);
```

The bare `UserSchema` is the **pure model**, so it only exists once you enable `"pureModels": true` as in step 3:

```ts
import { UserSchema } from './prisma/generated/schemas';

UserSchema.parse(data);
```

## Directory Layout (multi-file default)

```
prisma/generated/
  helpers/                    # only when your schema has Json or Decimal fields
  schemas/
    findManyUser.schema.ts    # CRUD operation schemas sit at the schemas root
    createOneUser.schema.ts
    ...
    enums/
    objects/
    results/                  # result schemas (full mode; off in minimal mode)
    variants/
      pure/
      input/
      result/
    models/                   # pure models, only when "pureModels": true
    index.ts                  # barrel re-exporting everything above
```

Single-file mode collapses everything into one file via `useMultipleFiles: false` — `prisma/generated/schemas.ts` by default (`singleFileName`, placed at the output root because `placeSingleFileAtRoot` defaults to `true`).

Using `moduleResolution: "nodenext"`, or running TypeScript directly in Node? Extensionless directory imports like the ones above will not resolve. Set `moduleFormat` and `importFileExtension` on your `prisma-client` generator block — see [NodeNext / Native TypeScript Imports](../recipes/nodenext-imports.md).

## Next Steps

- [Zod import targets](../recipes/zod-import-targets.md) — target `zod/v3` or `zod/v4`, or point `z` at your own configured Zod instance.
- [NodeNext / Native TypeScript Imports](../recipes/nodenext-imports.md) — ESM-safe output with explicit file extensions.
- Explore PZG Pro feature packs (SDK, Forms, API Docs, RLS, Multi‑tenant, Performance, Factories, Guard, Contracts, Server Actions): [Pro Features](../features/overview.md).
