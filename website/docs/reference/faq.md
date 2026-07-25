---
id: faq
title: FAQ
---

## Pro Features

**How do I purchase pro features?**

Visit [github.com/sponsors/omar-dulaimi](https://github.com/sponsors/omar-dulaimi) and select your tier. After sponsoring, DM [@omardulaimidev on X](https://x.com/omardulaimidev) with your GitHub username to receive your license key and setup instructions.

**How do I get my license after purchasing?**

After purchasing through GitHub Sponsors, send a DM on X to [@omardulaimidev](https://x.com/omardulaimidev) with your GitHub username. You'll receive your license key and setup instructions within 24 hours.

**What's included in each tier?**

- **Starter ($69/year)**: Server Actions Pack, Form UX Pack
- **Professional ($199/year)**: All Starter features + SDK Publisher, API Docs Pack, Policies & Redaction, Drift Guard, PostgreSQL RLS, Performance Pack
- **Business ($599/year)**: All Professional features + Contract Testing, Data Factories
- **Enterprise (Custom pricing)**: Everything + Multi-Tenant Kit, roadmap reviews, custom feature collaboration

See [full pricing details](/pricing) for complete tier comparison.

**Can I upgrade or downgrade my tier?**

Yes, you can adjust your GitHub Sponsors tier at any time. Contact [@omardulaimidev on X](https://x.com/omardulaimidev) to update your license accordingly.

**How do I activate my pro license?**

After receiving your license key from @omardulaimidev, follow the setup instructions provided. You can verify activation by running:

```bash
prisma-zod-generator license-check
```

**Do pro features require additional dependencies?**

Some pro features have optional peer dependencies:
- **Forms**: `react` plus the peers of the `framework` you select — `react-hook-form` + `@hookform/resolvers` (the default), or `formik` / `react-final-form`
- **SDK**: standalone, no additional deps
- **API Docs**: `express` and `cors` for the generated mock server
- **Contracts**: requires `@pact-foundation/pact`, `jest`

Check each feature's documentation for specific requirements.

**Can I use pro features in open source projects?**

Pro licenses are per-developer, not per-project. If you have an active subscription, you can use pro features in any of your projects (including open source). For team/organization use, consider Business or Enterprise tiers.

---

## Core Features (Free)

**Why are select/include schemas missing?** Minimal mode disables them unconditionally to keep surface lean.

**Why didn’t my JSON config output path apply?** Generator block `output` attribute (if explicitly present) takes precedence.

**How do I exclude a field across all variants?** Use `globalExclusions` or legacy global array; variant-specific overrides for finer control.

**Can I only emit pure models?** Enable `pureModels`, disable variants or set all variant enabled flags false (custom mode) → pureModelsOnly heuristic.

**Why enums missing?** `emit.enums=false` was set; object/CRUD schemas referencing enums may fail.

**How do I control optional field validation?** Use `optionalFieldBehavior` to choose between `.nullish()` (default), `.optional()`, or `.nullable()` for optional Prisma fields.

**Where should I place my config file?** Config file paths are resolved relative to your Prisma schema file, not the project root. If your schema is at `prisma/schema.prisma` and you use `config = "./my-config.json"`, the generator will look for `prisma/my-config.json`.

**My config file isn't being found, what's wrong?** Check that:
1. The path in `config = "./path/to/config.json"` is relative to your schema file location
2. The file exists at the resolved path (generator will show the full resolved path in error messages)
3. The config file contains valid JSON
4. You're not using an empty config path (`config = ""` will throw an error)

**Can I import `z` from my own module instead of `zod`?** Yes — set `zodImportPath` (added in 2.3.0) to a module that re-exports a configured Zod instance, for example one with an i18n error map:

```json title="zod-generator.config.json"
{
  "zodImportPath": "./lib/zod"
}
```

The binding style still follows `zodImportTarget`, so your module has to export `z` in a matching shape. It applies in single-file mode as well.

**How do I attach descriptions or metadata to a schema?** Use `@zod.describe("...")` or `@zod.meta({ ... })` in a doc comment (added in 2.2.0). Both work at field level and at model level. `.meta()` is a Zod v4 feature: under Zod v3 the generator downgrades `@zod.meta({ description: "..." })` to `.describe("...")`, and if there is no `description` key it drops the annotation with a warning.

**Can a Json field be typed instead of `unknown`?** Yes — combine `@zod.import([...])` with `@zod.custom.use(...)`:

```prisma
model Post {
  /// @zod.import(["import { TagSchema } from 'my-types'"]).custom.use(z.array(TagSchema))
  tags Json
}
```

This is honored in CRUD object schemas and in pure models (2.3.1), and the custom imports are hoisted into the bundle in single-file mode (2.3.3).

**Why are relation fields in result schemas `z.array(...).optional()`?** Relations only appear in a result when the query explicitly `include`s them, so they are always optional. Since 2.3.2, when `pureModels` is enabled the relation is typed against the related model's schema (`z.array(TagSchema).optional()`, imported from `../models/`); otherwise — and for self-relations or single-file mode — it falls back to `z.array(z.unknown()).optional()` so the file never has to import a cyclic reference.
