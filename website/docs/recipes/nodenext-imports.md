---
id: nodenext-imports
title: NodeNext / Native TypeScript Imports
---

TypeScript's `moduleResolution: "nodenext"` and Node's native TypeScript support (type stripping) both require **explicit file extensions** on relative ESM imports. Without them, generated schemas fail with:

```
TS2835: Relative import paths need explicit file extensions in ECMAScript imports
```

No zod-generator configuration is needed for this. The generator follows the **`prisma-client` generator block's own knobs** — set `moduleFormat` and `importFileExtension` there, and every relative import the zod generator emits (operation schemas, objects, enums, variants, index barrels, and the Prisma type import) carries the same extension.

## NodeNext / bundler-free ESM

```prisma
generator client {
  provider            = "prisma-client"
  output              = "./generated/client"
  moduleFormat        = "esm"
  importFileExtension = "js"
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/zod"
}
```

Generated imports look like:

```ts
import type { Prisma } from '../../client/browser.js';
import { UserWhereInputObjectSchema } from './objects/UserWhereInput.schema.js';
```

The `.js` specifiers resolve to the `.ts` sources under `nodenext` — this is the standard TypeScript ESM convention, and the output compiles clean under `"module": "nodenext"` with `strict` enabled.

## Node native TypeScript (type stripping)

To `import` generated schemas directly in Node without a build step, use `.ts` specifiers instead:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "./generated/client"
  moduleFormat        = "esm"
  importFileExtension = "ts"
}
```

```bash
node --experimental-strip-types main.ts   # or plain `node` on versions where type stripping is stable
```

If you also typecheck this layout with `tsc`, enable `allowImportingTsExtensions` in your `tsconfig.json` (TypeScript only accepts it alongside `noEmit` or `emitDeclarationOnly`, which fits a type-stripping setup where Node runs the `.ts` sources directly).

## Notes

- The extension is applied only when the client generator declares `moduleFormat = "esm"` **and** an `importFileExtension` — matching Prisma's own behavior for its generated client.
- Works in both multi-file and single-file (`useMultipleFiles: false`) modes.
- Requires the modern `prisma-client` provider (Prisma 6.6+/7); the legacy `prisma-client-js` provider has no extension knobs and its output does not need them.
