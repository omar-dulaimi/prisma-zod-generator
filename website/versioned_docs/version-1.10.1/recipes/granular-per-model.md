---
id: granular-per-model
title: Granular Per Model
---

```jsonc
{
  "mode": "custom",
  "models": {
    "User": {
      "operations": ["findMany", "create"],
      "variants": { "input": { "excludeFields": ["role"] } },
    },
    "Post": {
      "operations": ["findMany", "findUnique"],
      "variants": { "result": { "excludeFields": ["internalFlag"] } },
    },
  },
}
```

Enables partial surface per model.
