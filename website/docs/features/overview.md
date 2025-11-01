---
title: Pro Features Overview
---

Upgrade the core generator with production‑ready feature packs. Generate UI, SDKs, docs, security helpers, CI tooling — all in minutes.

import Link from '@docusaurus/Link';

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

**After purchasing:**

1. DM [@omardulaimidev on X](https://x.com/omardulaimidev) with your GitHub username
2. You'll receive your license key and setup instructions within 24 hours
3. Run `pzg-pro license-check` to verify activation

### Available Tiers

| Tier | Annual Price | Features |
|------|--------------|----------|
| **Starter** | **$69/year** | Server Actions, Forms |
| **Professional** | **$199/year** | + SDK, API Docs, Policies, Guard, RLS, Performance |
| **Business** | **$599/year** | + Contracts, Factories, Priority response targets |
| **Enterprise** | **Custom** | + Multi-Tenant, roadmap reviews, custom feature collaboration |

---

## Plan Comparison

| Feature Pack | Core (MIT) | Starter (`starter`) | Professional (`professional`) | Business (`business`) | Enterprise (`enterprise`) |
|--------------|------------|---------------------|-------------------------------|-----------------------|---------------------------|
| Server Actions | ✅ | ✅ | ✅ | ✅ | ✅ |
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

```bash
# Check license
pzg-pro license-check

# Generate any pack
pzg-pro generate forms
pzg-pro generate sdk
pzg-pro generate api-docs
```

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
    <div className="feature-card__desc">Typed HTTP client (ESM/CJS) with retry/timeouts.</div>
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
    <div className="feature-card__desc">Tenant validation helpers for UI/API.</div>
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
import { UserForm } from '../generated/forms'
import APIClient from '@your-org/api-sdk'

const client = new APIClient({ baseUrl: 'http://127.0.0.1:3001' })

export default function Page() {
  return (
    <UserForm
      defaultValues={{ email: 'test@example.com' }}
      onSubmit={async (data) => {
        const res = await client.createUser(data)
        if (!res.success) throw new Error(res.error)
      }}
    />
  )
}
```
