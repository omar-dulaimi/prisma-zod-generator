---
id: zod-import-targets
title: Zod import targets
sidebar_label: Zod import targets
---

Choose the Zod dialect your generated schemas target via the `zodImportTarget` config option. It picks the import line **and** the emitted schema style, so it is not a cosmetic setting.

Install Zod in your app (peer dependency — the supported range is `>=3.25.0 <5`), then pick one of:

- auto (default): `import * as z from 'zod'` (namespace import for better tree-shaking)
- v3: `import { z } from 'zod/v3'` (named import against Zod's v3 compatibility subpath — the `zod/v3` entry exists only from zod 3.25 onwards)
- v4: `import * as z from 'zod/v4'`

Notes
- In single‑file bundles, a single Zod import is hoisted at the top.
- This setting affects all generated files and variants.

## What changes between targets

`auto` and `v3` emit v3-compatible schema syntax. `v4` opts into Zod 4 APIs:

- Strict objects: `z.object({ … }).strict()` on auto/v3, `z.strictObject({ … })` on v4.
- Recursive and circular references: `z.lazy(() => …)` on auto/v3, field getters (`get author() { return … }`) on v4.
- `dateTimeStrategy: "isoString"`: a hand-rolled RFC3339 `z.string().regex(…)` on auto/v3, `z.iso.datetime()` on v4.

`@zod` comment annotations are the one place where `auto` is not simply "v3 syntax": for annotation mapping the generator reads the installed Zod major version from `zod/package.json` at generate time. So `@zod.meta({ … })` (added in v2.2.0) passes through under `auto` when Zod 4 is installed, but is downgraded to `.describe(description)` — or dropped with a warning if the object has no `description` key — under `auto` with Zod 3, and always under `zodImportTarget: "v3"`. See [@zod Comment Annotations](../pipeline/zod-comments.md).

## Custom import path (`zodImportPath`)

Requires v2.3.0 or newer.

Point `z` at your own module instead of `zod` — useful for a Zod instance configured with an [internationalized error map](https://zod.dev/error-customization?id=internationalization):

```json title="zod-generator.config.json"
{ "zodImportPath": "./lib/zod" }
```

turns every generated `import * as z from 'zod'` into `import * as z from './lib/zod'`. Your module must expose `z` matching the active `zodImportTarget` binding style — a namespace for `auto`/`v4`, a named export for `v3`. Because `auto`/`v4` bind the **module namespace** to `z`, re-exporting only a named `z` from that module would leave every generated `z.object(...)` call undefined; re-export the whole module instead:

```ts title="lib/zod.ts — for zodImportTarget auto | v4 (namespace binding)"
import * as z from 'zod';
z.config(z.locales.fr()); // Zod 4 API; configures the shared instance once, at import time
export * from 'zod';      // the generator binds `z` to this module's namespace
```

```ts title="lib/zod.ts — for zodImportTarget v3 (named binding)"
import { z } from 'zod/v3';
// configure the instance here
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
