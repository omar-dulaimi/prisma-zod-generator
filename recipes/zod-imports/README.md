# Zod import target recipes

Choose how generated schemas import Zod using `zodImportTarget`.

When to use
- You need to pin Zod v4 style to reduce bundle size.
- You want to keep default imports compatible with Zod v3 style.

Options
- auto (default) or v3: `import { z } from 'zod'`
- v4: `import * as z from 'zod/v4'`

Notes
- Single-file bundles hoist a single Zod import accordingly.
- This generator treats Zod as a peer dependency; install it in your app.

See also
- Docs: Recipes → Zod import targets
