# Granular Per-Model Recipe

Select operations per model and disable some models.

Contents:
- zod-generator.config.json — ready-to-use config
- schema.prisma — matching Prisma generator block

Steps:
1) Copy zod-generator.config.json to your app repo
2) Open schema.prisma in this folder and copy the generator block into your app's Prisma schema (adjust paths)
3) Run: npx prisma generate
