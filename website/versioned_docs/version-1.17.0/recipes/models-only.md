---
id: models-only
title: Models Only
---

Emit only pure model schemas (no CRUD/object scaffolding):

```jsonc
{
  "mode": "custom",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true },
    "input": { "enabled": false },
    "result": { "enabled": false },
  },
  "emit": { "objects": false, "crud": false, "variants": false },
}
```

Triggers "pureModelsOnly" heuristic; keeps output minimal.
