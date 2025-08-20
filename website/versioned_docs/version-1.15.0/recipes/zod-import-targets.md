---
id: zod-import-targets
title: Zod import targets
sidebar_label: Zod import targets
---

Control how generated schemas import Zod via the `zodImportTarget` config option.

Install Zod in your app (peer dependency), then pick one of:

- auto (default) or v3: `import { z } from 'zod'`
- v4: `import * as z from 'zod/v4'`

Notes
- In single‑file bundles, a single Zod import is hoisted at the top.
- This setting affects all generated files and variants.

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
