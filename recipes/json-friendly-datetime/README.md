# JSON-friendly DateTime (default split strategy)

This recipe demonstrates the default split strategy for DateTime handling:
- Input schemas accept ISO datetime strings via z.coerce.date()
- Pure models and result schemas use strict z.date()

The split is enabled by default through dateTimeSplitStrategy=true. You can still override globally with dateTimeStrategy.

Directory contents
- schema.prisma
- zod-generator.config.json

Key behavior
- When no dateTimeStrategy is set and dateTimeSplitStrategy=true (default):
  - Inputs → z.coerce.date() (accepts "2025-01-01T00:00:00.000Z")
  - Pure and result variants → z.date()

Override examples
- Force coerce across all variants:
  - { "dateTimeStrategy": "coerce" }
- Force strict date across all variants:
  - { "dateTimeStrategy": "date" }
- Force ISO string validation across all variants:
  - { "dateTimeStrategy": "isoString" }

Usage

1) Place schema.prisma and zod-generator.config.json next to your Prisma schema (usually prisma/schema.prisma)

2) Example payloads accepted by generated input schemas (Create/Update):
```json
{
  "data": {
    "title": "Hello",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "author": { "connect": { "email": "alice@example.com" } }
  }
}
```

3) Run Prisma + generator:
```bash
npx prisma generate
```

Notes
- WhereUniqueInput now accepts “at least one unique selector” (e.g., { "email": "alice@example.com" }) and enforces completeness for composite uniques. This change is part of the generator core; no config needed in this recipe.

Troubleshooting
- If your inputs are still rejecting ISO strings:
  - Make sure you do not set "dateTimeStrategy": "date" in your config (which would override the split default).
  - Check that you are using the newly generated schemas (run `npx prisma generate` again).

Related docs
- Configuration → DateTime Strategy: website/docs/config/datetime-strategy.md
- Reference → WhereUniqueInput behavior: website/docs/reference/where-unique-input.md