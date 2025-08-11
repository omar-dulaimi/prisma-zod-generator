# API Result Schemas Recipe

Generates result/response schemas only.

Contents:
- zod-generator.config.json — ready-to-use config
- generator.prisma.example — matching Prisma generator block

Steps:
1) Copy zod-generator.config.json to your app repo
2) Copy generator.prisma.example into your schema.prisma (adjust paths)
3) Run: npx prisma generate
