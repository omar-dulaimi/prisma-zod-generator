# CRUD Only Recipe

Emit only CRUD operation argument schemas (and the required object input schemas / enums). No pure models, no variants layer, no result schemas.

Use when:
- You only need runtime validation for incoming Prisma args (e.g., API endpoints) and not output typing.
- You plan to infer output directly from Prisma Client responses.

Key flags:
- emit.crud = true
- emit.objects = true (needed because CRUD arg schemas import object schemas)
- emit.results = false
- pureModels = false & emit.pureModels = false
- emit.variants = false

Contents:
- zod-generator.config.json — config with explicit emission
- schema.prisma — matching Prisma generator block

Steps:
1) Copy zod-generator.config.json to your repo
2) Copy the generator block from schema.prisma (adjust paths)
3) Run: npx prisma generate

