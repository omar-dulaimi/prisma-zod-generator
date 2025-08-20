---
id: naming-preset-map
title: Naming Preset Map
---

| Preset              | filePattern         | schemaSuffix | typeSuffix | exportNamePattern         | legacyAliases |
| ------------------- | ------------------- | ------------ | ---------- | ------------------------- | ------------- |
| default             | \{Model\}.schema.ts | Schema       | Type       | \{Model\}\{SchemaSuffix\} | false         |
| zod-prisma          | \{Model\}.schema.ts | Schema       | Type       | \{Model\}Schema           | true          |
| zod-prisma-types    | \{Model\}.schema.ts | (empty)      | (empty)    | \{Model\}                 | true          |
| legacy-model-suffix | \{Model\}.model.ts  | Model        | ModelType  | \{Model\}Model            | false         |

Override tokens:

- `\{Model\}`, `\{model\}`, `\{camel\}`, `\{kebab\}`, `\{SchemaSuffix\}`, `\{TypeSuffix\}`
