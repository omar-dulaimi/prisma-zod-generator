---
id: single-file
title: Single File Bundle
---

```jsonc
{
  "useMultipleFiles": false,
  "singleFileName": "schemas.ts",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true },
    "input": { "enabled": true },
    "result": { "enabled": false },
  },
}
```

Produces one portable file; variants directory suppressed.
