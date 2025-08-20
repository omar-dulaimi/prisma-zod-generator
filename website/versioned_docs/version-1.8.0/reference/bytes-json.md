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
