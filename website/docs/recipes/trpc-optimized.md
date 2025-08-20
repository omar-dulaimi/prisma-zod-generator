---
id: trpc-optimized
title: tRPC Optimized
---

```jsonc
{
  "mode": "custom",
  "output": "./generated/zod",
  "globalExclusions": {
    "input": ["id", "createdAt", "updatedAt"],
    "result": [],
    "pure": ["password", "hashedPassword"],
  },
  "variants": {
    "pure": { "enabled": true, "suffix": ".model" },
    "input": { "enabled": true, "suffix": ".input" },
    "result": { "enabled": true, "suffix": ".output" },
  },
}
```

Aligns with typical request/response patterns + internal model snapshot.
