---
id: json-friendly-datetime
title: JSON-friendly DateTime (Split Strategy Default)
---

This recipe shows how the default split strategy for DateTime improves JSON API ergonomics:

- Input schemas accept ISO datetime strings via `z.coerce.date()`
- Pure model and result schemas remain strict `z.date()`

The split behavior is enabled by default via `dateTimeSplitStrategy: true`. You can still override globally with `dateTimeStrategy`.

Why this matters

- Most clients send ISO strings in JSON. With the split default, creates/updates parse ISO strings without extra code, while output and model snapshots keep strong Date objects.

Minimal configuration

```jsonc
// zod-generator.config.json
{
  "mode": "custom",
  "output": "./generated",
  // enabled by default; shown here for clarity
  "dateTimeSplitStrategy": true,
  "variants": {
    "pure":   { "enabled": true, "suffix": ".model" },
    "input":  { "enabled": true, "suffix": ".input" },
    "result": { "enabled": true, "suffix": ".result" }
  }
}
```

Example model

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  author   User?     @relation(fields: [authorId], references: [id])
  authorId Int?
}
```

Sample JSON payload accepted by Create/Update inputs

```json
{
  "data": {
    "title": "Hello World",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "author": { "connect": { "email": "alice@example.com" } }
  }
}
```

Overrides (optional)

- Force `coerce` across all variants:
```jsonc
{ "dateTimeStrategy": "coerce" }
```

- Force strict `date` across all variants:
```jsonc
{ "dateTimeStrategy": "date" }
```

- Force `isoString` across all variants:
```jsonc
{ "dateTimeStrategy": "isoString" }
```

Related changes

- WhereUniqueInput relies on base object validation. Composite unique selectors are enforced by their nested schemas. If you want early failure when no selector is provided, enable `validateWhereUniqueAtLeastOne: true` in your config.

References

- Configuration → DateTime Strategy: config/datetime-strategy
- Reference → WhereUniqueInput Semantics: reference/where-unique-input
