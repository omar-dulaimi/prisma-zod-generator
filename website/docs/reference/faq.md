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
pzg-pro license-check
```

**Do pro features require additional dependencies?**

Some pro features have optional peer dependencies:
- **Forms**: requires `react`, `react-hook-form`, `@hookform/resolvers`
- **SDK**: standalone, no additional deps
- **API Docs**: uses Express for mock server
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
