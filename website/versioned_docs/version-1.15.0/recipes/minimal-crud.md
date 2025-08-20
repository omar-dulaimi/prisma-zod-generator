---
id: minimal-crud
title: Minimal CRUD
---

```jsonc
{
  "mode": "minimal",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true },
    "input": { "enabled": true },
    "result": { "enabled": false },
  },
}
```

Produces lean create/update/find schemas, prunes deep nested inputs, disables select/include.
