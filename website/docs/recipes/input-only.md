---
id: input-only
title: Input Variant Only
---

```jsonc
{
  "variants": {
    "pure": { "enabled": false },
    "input": { "enabled": true },
    "result": { "enabled": false },
  },
  "emit": { "pureModels": false },
}
```

For update operations, enable the partial flag to make all fields optional:

```jsonc
{
  "variants": {
    "pure": { "enabled": false },
    "input": {
      "enabled": true,
      "partial": true  // Makes all fields optional with .partial()
    },
    "result": { "enabled": false },
  },
  "emit": { "pureModels": false },
}
```

Good for request validation only.
