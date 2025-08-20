---
id: quick-start
title: Quick Start
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## 1. Install

### Requirements

| Component                | Minimum |
| ------------------------ | ------- |
| Node.js                  | 18.x    |
| Prisma                   | 6.12.0  |
| Zod                      | 4.0.5   |
| TypeScript (recommended) | 5.2+    |

<Tabs>
<TabItem value="npm" label="npm">

```bash
npm install prisma-zod-generator zod @prisma/client
```

</TabItem>
<TabItem value="yarn" label="yarn">

```bash
yarn add prisma-zod-generator zod @prisma/client
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add prisma-zod-generator zod @prisma/client
```

</TabItem>
</Tabs>

## 2. Add generator to `schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
}

generator zod {
  provider = "prisma-zod-generator"
  // optional output = "./prisma/generated" (JSON config can supply if omitted)
}
```

## 3. (Optional) Create `prisma/zod-generator.config.json`

```jsonc
{
  "mode": "full",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true },
    "input": { "enabled": true },
    "result": { "enabled": true },
  },
}
```

## 4. Generate

```bash
npx prisma generate
```

## 5. Consume

```ts
import { UserSchema, UserInputSchema } from './prisma/generated/schemas';
UserSchema.parse(data);
```

## Directory Layout (multi-file default)

```
prisma/generated/
  schemas/
    enums/
    objects/
    variants/
    index.ts
  models/
```

Single-file mode collapses to `schemas.ts` via config (`useMultipleFiles:false`).
