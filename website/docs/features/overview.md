---
title: Pro Features Overview
---

Upgrade the core generator with production‑ready feature packs. Generate UI, SDKs, docs, security helpers, CI tooling — all in minutes.

import Link from '@docusaurus/Link';
import tiersImg from '@site/static/img/tiers.png';

## How to Get Pro Features

Purchase any tier through GitHub Sponsors and get started in minutes:

<div style={{ display: 'flex', gap: '1rem', margin: '2rem 0', flexWrap: 'wrap' }}>
  <Link
    className="button button--primary button--lg"
    to="https://github.com/sponsors/omar-dulaimi"
    style={{ textDecoration: 'none' }}
  >
    💎 Purchase on GitHub Sponsors
  </Link>
  <Link
    className="button button--secondary button--lg"
    to="/pricing"
    style={{ textDecoration: 'none' }}
  >
    📊 View Full Pricing
  </Link>
</div>

:::note Picking the right tier on GitHub Sponsors
The sponsors page has two tabs: **Monthly** and **One-time**. PZG plans live under the One-time tab
(second tab). Monthly supporter tiers such as **Pro (Individual)** do **not** include Prisma Zod Generator
licenses. Switch to the One-time tab and choose a yearly tier labeled **PZG Starter**, **PZG
Professional**, **PZG Business**, or **PZG Enterprise** when you need Pro features.
:::

<figure style={{ textAlign: 'center', margin: '1rem auto 2rem', maxWidth: 360 }}>
  <img
    src={tiersImg}
    alt="GitHub Sponsors One-time tab showing Prisma Zod Generator tiers"
    style={{
      width: '100%',
      borderRadius: '12px',
      boxShadow: '0 6px 30px rgba(15, 23, 42, 0.35)',
      border: '1px solid rgba(148, 163, 184, 0.4)',
    }}
  />
  <figcaption style={{ fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-700)' }}>
    Switch to <strong>One-time</strong> to see the Prisma Zod Generator Starter, Professional, and Business tiers.
  </figcaption>
</figure>

**After purchasing:**

1. DM [@omardulaimidev on X](https://x.com/omardulaimidev) with your GitHub username
2. You'll receive your license key and setup instructions within 24 hours
3. Export the key as `PZG_LICENSE_KEY` so the generator can read it:

   ```bash
   export PZG_LICENSE_KEY="pzg_live_..."
   ```

   Any mechanism that puts the variable in the generator's environment works — a shell export, a `.env` file loaded by your tooling, or a CI secret. Every Pro pack resolves the license from `process.env.PZG_LICENSE_KEY`, so without it generation fails with `PZG Pro license required. Set PZG_LICENSE_KEY environment variable.`
4. Run `prisma-zod-generator license-check` to verify activation

### Available Tiers

| Tier | Annual Price | Features |
|------|--------------|----------|
| **Starter** | **$69/year** | Server Actions, Forms |
| **Professional** | **$199/year** | + SDK, Policies, Guard, RLS, Performance |
| **Business** | **$599/year** | + Contracts, API Docs, Factories, Priority response targets |
| **Enterprise** | **Custom** | + Multi-Tenant, roadmap reviews, custom feature collaboration |

---

## Plan Comparison

| Feature Pack | Core (MIT) | Starter (`starter`) | Professional (`professional`) | Business (`business`) | Enterprise (`enterprise`) |
|--------------|------------|---------------------|-------------------------------|-----------------------|---------------------------|
| Server Actions | ❌ | ✅ | ✅ | ✅ | ✅ |
| Forms UX | ❌ | ✅ | ✅ | ✅ | ✅ |
| Policies & Redaction | ❌ | ❌ | ✅ | ✅ | ✅ |
| Drift Guard | ❌ | ❌ | ✅ | ✅ | ✅ |
| PostgreSQL RLS | ❌ | ❌ | ✅ | ✅ | ✅ |
| Performance Pack | ❌ | ❌ | ✅ | ✅ | ✅ |
| SDK Publisher | ❌ | ❌ | ✅ | ✅ | ✅ |
| Contract Testing | ❌ | ❌ | ❌ | ✅ | ✅ |
| API Docs Pack | ❌ | ❌ | ❌ | ✅ | ✅ |
| Data Factories | ❌ | ❌ | ❌ | ✅ | ✅ |
| Multi-Tenant Kit | ❌ | ❌ | ❌ | ❌ | ✅ |
| Private Discord Channel | ❌ | ✅ | ✅ | ✅ | ✅ |
| Priority Response Targets | ❌ | ❌ | ❌ | ✅ | ✅ |
| Roadmap Reviews & Co-built Features | ❌ | ❌ | ❌ | ❌ | ✅ |

:::tip Choosing a plan
Starter is perfect for solo builders shipping typed Server Actions and forms. Professional unlocks security packs for production teams. Business adds integration and documentation tooling with faster support, and Enterprise layers on multi-tenant tooling plus roadmap collaboration.
:::

---

## Generate in minutes

Prisma allows only one generator per name, so enable every pack you need on a **single** `pzgPro`
block — the generator reads all ten `enable*` flags off that one block and runs the enabled packs
concurrently:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output   = "./generated/pro"

  enableForms         = true
  enableSDK           = true
  enableApiDocs       = true
  enableServerActions = true
  // enablePolicies, enableContracts, enablePostgresRLS,
  // enableMultiTenant, enablePerformance, enableFactories
}
```

Every flag defaults to `false`. Then:

```bash
# Check license
prisma-zod-generator license-check

# Run Prisma generators
pnpm exec prisma generate
```

### Configuring packs

Each pack takes options as a stringified JSON value on a key named after the pack (`forms`,
`sdk`, `apiDocs`, `policies`, `contracts`, `postgresRls`, `multiTenant`, `performance`,
`factories`, `serverActions`) — see each pack's page for its keys.

When you are configuring several packs at once, point `configPath` at an external JSON file
instead. The path is resolved relative to your schema directory and its contents are merged over
the generator block's configuration:

```prisma
generator pzgPro {
  provider   = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output     = "./generated/pro"
  configPath = "./pzg-pro.config.json"
}
```

```json
{
  "enableForms": true,
  "enableSDK": true,
  "forms": { "uiLibrary": "shadcn", "enableI18n": true },
  "sdk": { "platforms": ["typescript"] }
}
```

:::caution The key is `configPath`
Some older notes refer to this key as `config`. The generator only reads `configPath`; a key named
`config` is ignored. The file must be strict JSON — it is read with `JSON.parse`, so no comments
and no trailing commas.
:::

### What happens if a pack fails

Packs are generated concurrently and each one's errors are caught individually. If a pack throws —
a license tier it is not entitled to, a malformed option, an unwritable output directory — you get a
warning on stderr, that pack emits nothing, and `prisma generate` still exits `0` while the other
packs finish normally.

That matters in CI: a missing directory under `generated/pro/` is the signal that a pack failed, not
a non-zero exit code. If a pack you enabled produced no output, re-read the generator's warnings and
confirm your plan includes it (see the Plan Comparison table above).

## Packs at a glance

<div className="feature-card-grid">
  <Link className="feature-card" to="./forms">
    <div className="feature-card__icon">🧩</div>
    <div className="feature-card__title">Forms UX</div>
    <div className="feature-card__desc">Schema‑driven React forms with Zod + RHF.</div>
  </Link>
  <Link className="feature-card" to="./sdk">
    <div className="feature-card__icon">🔌</div>
    <div className="feature-card__title">SDK Publisher</div>
    <div className="feature-card__desc">Typed TypeScript + Python HTTP clients from your schema.</div>
  </Link>
  <Link className="feature-card" to="./api-docs">
    <div className="feature-card__icon">📚</div>
    <div className="feature-card__title">API Docs</div>
    <div className="feature-card__desc">OpenAPI + runnable mock server for local dev.</div>
  </Link>
  <Link className="feature-card" to="./policies">
    <div className="feature-card__icon">🕵️</div>
    <div className="feature-card__title">Policies</div>
    <div className="feature-card__desc">PII redaction + policy helpers from annotations.</div>
  </Link>
  <Link className="feature-card" to="./postgres-rls">
    <div className="feature-card__icon">🧷</div>
    <div className="feature-card__title">Postgres RLS</div>
    <div className="feature-card__desc">RLS session context helpers + example SQL.</div>
  </Link>
  <Link className="feature-card" to="./multi-tenant">
    <div className="feature-card__icon">🏷️</div>
    <div className="feature-card__title">Multi‑Tenant</div>
    <div className="feature-card__desc">Server-side tenant validation, middleware, and extensions.</div>
  </Link>
  <Link className="feature-card" to="./performance">
    <div className="feature-card__icon">🚄</div>
    <div className="feature-card__title">Performance</div>
    <div className="feature-card__desc">Streaming validators for large arrays.</div>
  </Link>
  <Link className="feature-card" to="./factories">
    <div className="feature-card__icon">🏭</div>
    <div className="feature-card__title">Factories</div>
    <div className="feature-card__desc">Realistic test data builders.</div>
  </Link>
  <Link className="feature-card" to="./guard">
    <div className="feature-card__icon">🛡️</div>
    <div className="feature-card__title">Drift Guard</div>
    <div className="feature-card__desc">CI diffs to catch breaking changes.</div>
  </Link>
  <Link className="feature-card" to="./contracts">
    <div className="feature-card__icon">🤝</div>
    <div className="feature-card__title">Contracts</div>
    <div className="feature-card__desc">Consumer/provider tests + definitions.</div>
  </Link>
  <Link className="feature-card" to="./server-actions">
    <div className="feature-card__icon">🧠</div>
    <div className="feature-card__title">Server Actions</div>
    <div className="feature-card__desc">Typed actions validated with Zod.</div>
  </Link>
</div>

:::tip Pro Tip
You can generate multiple packs side‑by‑side — e.g., SDK + API Docs + Forms — to iterate UI against a mock server while the backend evolves.
:::

## Examples

Validate then submit (Forms + SDK)

```tsx
import { UserForm } from '@/generated/pro/forms'
import { APIClient } from '@/generated/pro/sdk/typescript'

const client = new APIClient('http://127.0.0.1:3001')

export default function Page() {
  return (
    <UserForm
      defaultValues={{ email: 'test@example.com' }}
      onSubmit={async (data) => {
        // The generated client throws on non-2xx responses
        await client.createUser(data)
      }}
    />
  )
}
```
