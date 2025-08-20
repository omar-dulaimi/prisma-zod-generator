---
id: pure-models-lean
title: Pure Models Lean
---

Remove heavy relation fields globally:

```jsonc
{
  "pureModels": true,
  "pureModelsLean": true,
  "pureModelsIncludeRelations": false,
  "globalExclusions": { "pure": ["*Relation", "posts", "comments"] },
}
```

Generates scalar-centric schemas for simpler validation surfaces.
