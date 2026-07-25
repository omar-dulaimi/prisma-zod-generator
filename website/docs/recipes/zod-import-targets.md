---
id: zod-import-targets
title: Zod import targets
sidebar_label: Zod import targets
---

Control how generated schemas import Zod via the `zodImportTarget` config option.

Install Zod in your app (peer dependency), then pick one of:

- auto (default): `import * as z from 'zod'` (namespace import for better tree-shaking)
- v3: `import { z } from 'zod'` (named import for compatibility)
- v4: `import * as z from 'zod/v4'`

Notes
- In single‑file bundles, a single Zod import is hoisted at the top.
- This setting affects all generated files and variants.

## Custom import path (`zodImportPath`)

Point `z` at your own module instead of `zod` — useful for a Zod instance configured with an [internationalized error map](https://zod.dev/error-customization?id=internationalization):

```json title="zod-generator.config.json"
{ "zodImportPath": "./lib/zod" }
```

turns every generated `import * as z from 'zod'` into `import * as z from './lib/zod'`. Your module must re-export `z` matching the active `zodImportTarget` binding style — a namespace for `auto`/`v4`, a named export for `v3`:

```ts title="lib/zod.ts"
import * as z from 'zod';
z.config(z.locales.fr()); // e.g. configure an i18n error map
export { z };
```

Notes
- The binding style follows `zodImportTarget`; only the module path changes.
- Applies to every generated file, including single‑file bundles.
- Values that aren't valid module specifiers are ignored (with a warning) and the default path is used.

Quick recipes
- Copy one of these into your config JSON:

```json title="zod-generator.config.json"
{ "zodImportTarget": "auto" }
```

```json title="zod-generator.config.json"
{ "zodImportTarget": "v4" }
```

See also
- Reference → Bytes and JSON
- Configuration → Modes and Variants
