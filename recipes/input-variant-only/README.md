# Input Variant Only Recipe

Emit only input variant schemas (sanitized create/update inputs) plus required enums. Skip CRUD operation args, result schemas, pure models.

Use when:
- You want a lightweight validation layer for inbound data before constructing Prisma args yourself.
- You need per-field exclusions (e.g., omit protected fields) but not full operation argument objects.

Key flags:
- variants.input.enabled = true
- variants.pure.enabled = false
- variants.result.enabled = false
- emit.crud = false
- emit.objects = false (variant generator builds input variant directly)
- emit.results = false
- emit.pureModels = false
- emit.variants = true (to emit the variants/pure index wrapper; still outputs input variant directory)

Contents:
- zod-generator.config.json
- schema.prisma

Steps:
1) Copy files
2) Run: npx prisma generate
