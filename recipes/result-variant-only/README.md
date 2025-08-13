# Result Variant Only Recipe

Emit only result variant schemas (validated shapes for outbound data) plus required enums. Skip CRUD arg schemas, pure models, input variant, and object input schemas.

Use when:
- You only validate/shape responses (e.g., serialization layer) and trust inbound data elsewhere.
- Want a contract for data leaving the service (e.g., API responses, public DTOs).

Key flags:
- variants.result.enabled = true
- variants.input.enabled = false
- variants.pure.enabled = false (unless you want model objects too)
- emit.crud = false
- emit.objects = false
- emit.results = true
- emit.pureModels = false
- emit.variants = true

Contents:
- zod-generator.config.json
- schema.prisma

Steps:
1) Copy files
2) Generate: npx prisma generate
