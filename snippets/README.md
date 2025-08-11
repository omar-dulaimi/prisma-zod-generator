# Snippets

Per-recipe generator block examples, each with a unique generator name to avoid conflicts if you copy more than one:

- api-result-schemas/schema.prisma (zodApiResultSchemas)
- granular-per-model/schema.prisma (zodGranularPerModel)
- hide-fields/schema.prisma (zodHideFields)
- minimal-crud/schema.prisma (zodMinimalCrud)
- models-only/schema.prisma (zodModelsOnly)
- single-file/schema.prisma (zodSingleFile)
- trpc-optimized/schema.prisma (zodTrpcOptimized)

Helper snippets
- schema-comments/schema.prisma — rich @zod field annotations
- derive-trpc-schemas/derive-trpc-schemas.ts — derive request schemas via omit/extend

How to use
- Copy one schema.prisma block into your app’s Prisma schema and adjust paths.
- Keep generator block options (useMultipleFiles, singleFileName, placeSingleFileAtRoot) in sync with your JSON config to avoid overrides.
