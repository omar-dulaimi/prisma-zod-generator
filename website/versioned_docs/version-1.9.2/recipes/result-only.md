---
id: result-only
title: Result Variant Only
---

Focus on response shaping for outbound APIs:

```jsonc
{
  "mode": "custom",
  "variants": {
    "pure": { "enabled": false },
    "input": { "enabled": false },
    "result": { "enabled": true },
  },
  "emit": { "pureModels": false },
}
```
