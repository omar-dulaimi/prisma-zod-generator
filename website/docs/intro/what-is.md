---
id: what-is
title: Prisma Zod Generator
sidebar_label: What is it?
---

**The most powerful Prisma generator for type-safe validation** - Generate Zod schemas, React forms, TypeScript SDKs, OpenAPI docs, and more directly from your Prisma schema.

## Core Features (Free & Open Source)

Generate production-ready Zod validation schemas from your Prisma models with full customization:

### Schema Generation
- **Multiple variants**: Pure models, input schemas, result schemas
- **Generation modes**: Minimal (lean), Full (everything), Custom (fine-tuned)
- **Field filtering**: Include/exclude specific fields with wildcard patterns
- **Custom naming**: Configure naming patterns for all schema types
- **Output layouts**: Single-file or multi-file organization

### Advanced Validation
- **@zod annotations**: Add inline validation rules in Prisma comments
- **Type coercion**: Handle Bytes, Decimal, DateTime, JSON types
- **Relation handling**: Smart defaults for nested objects
- **Aggregate support**: Count, min, max, avg, sum operations
- **Optional fields**: Configurable `.nullish()`, `.optional()`, or `.nullable()`

### Why Use Prisma Zod Generator?

✅ **Eliminate drift** - Your validation always matches your database schema
✅ **Type safety** - End-to-end TypeScript from database to API
✅ **Configurable** - From minimal lean schemas to full CRUD suites
✅ **Production ready** - Used by thousands of projects worldwide
✅ **Domain-specific** - Generate different schema bundles for different contexts

## Pro Features

Upgrade to Pro for production-ready feature packs that save weeks of development time:

### 🎨 Developer Experience ($69/year - Starter)
- **[Form UX Pack](../features/forms.md)** - Auto-generated React forms with validation
- **[Server Actions](../features/server-actions.md)** - Typed Next.js server actions

### 🔐 Security & Governance ($199/year - Professional)
- **[Policies & Redaction](../features/policies.md)** - PII masking, GDPR compliance
- **[Drift Guard](../features/guard.md)** - CI checks for breaking schema changes
- **[PostgreSQL RLS](../features/postgres-rls.md)** - Database-level row security
- **[Performance Pack](../features/performance.md)** - Stream validation for millions of records
- **[SDK Publisher](../features/sdk.md)** - Generate typed API clients

### 🏗️ Platform & Scale ($599/year - Business)
- **[Contract Testing](../features/contracts.md)** - Consumer-driven Pact.js tests
- **[API Docs Pack](../features/api-docs.md)** - OpenAPI specs + mock server
- **[Data Factories](../features/factories.md)** - Realistic test data generation

### 🚀 Enterprise ($$$$ - Custom)
- **[Multi-Tenant Kit](../features/multi-tenant.md)** - Enterprise SaaS isolation
- **Quarterly Roadmap Reviews** - Strategic planning with the core team
- **Co-developed Feature Packs** - Build bespoke integrations together
- **White-Glove Onboarding** - Rollout playbooks and migration guidance

[View all Pro features →](../features/overview.md)

## Getting Started

```bash
# Install generator
pnpm add -D prisma-zod-generator

# Configure in schema.prisma
generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/zod"
}

# Generate schemas
pnpm prisma generate
```

[Read the full documentation →](../intro/quick-start.md)

### Using Pro Features

After purchasing a Pro tier:
1. You'll receive license key and setup instructions
2. Follow the provided installation guide
3. Use `pzg-pro` commands to generate feature packs

See [Pro Features Overview](../features/overview.md) for details.
