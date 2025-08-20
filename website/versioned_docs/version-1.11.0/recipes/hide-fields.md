---
id: hide-fields
title: Hide Sensitive Fields
---

```jsonc
{
  "globalExclusions": { "result": ["password", "hashedPassword", "secret*"] },
}
```

Removes sensitive fields from outward-facing result schemas.
