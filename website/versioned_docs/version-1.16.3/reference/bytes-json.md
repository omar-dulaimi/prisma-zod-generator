---
id: bytes-json
title: Bytes & JSON Details
---

**Bytes** mapping logic:

- Default pure model output: base64 string + regex validation.
- Set `complexTypes.bytes.useBase64=false` to emit `Uint8Array` schemas.
- Size limits: `minSize` / `maxSize` adjust validation (base64 length scaled 4/3).
- Allowed MIME types recorded as comments (binary mode needs external detection).

**JSON** mapping options (when enhanced config present):

- Serializability refine (JSON.stringify guard)
- Max depth & length checks
- Null allowance toggles (record vs strict modes)

### Helper: jsonMaxDepthRefinement

Utility to append a depth guard to complex JSON array/object schemas.

```ts
import { jsonMaxDepthRefinement } from 'prisma-zod-generator';
const DeepJson = z.array(z.any())${'${jsonMaxDepthRefinement(8)}'};
```

Pass desired max depth; nodes beyond trigger validation error. Prefer modest limits (5–12) to avoid costly traversals.
