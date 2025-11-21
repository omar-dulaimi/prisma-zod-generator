<div align="center">
	<h1>Prisma Zod Generator</h1>
	<p><strong>Unify Prisma validation, policy guardrails, and developer workflows in a single generator.</strong></p>
	<p>
		<a href="https://omar-dulaimi.github.io/prisma-zod-generator/pricing"><strong>🚀 Get PZG Pro – Purchase on GitHub</strong></a> |
		<a href="https://omar-dulaimi.github.io/prisma-zod-generator/"><strong>📚 Documentation</strong></a> |
		<a href="https://omar-dulaimi.github.io/prisma-zod-generator/docs/features/guard"><strong>🛡️ Drift Guard</strong></a>
	</p>
	<p>
		<a href="https://www.npmjs.com/package/prisma-zod-generator"><img alt="npm version" src="https://img.shields.io/npm/v/prisma-zod-generator.svg?color=16C464&label=npm"></a>
		<a href="https://www.npmjs.com/package/prisma-zod-generator"><img alt="downloads" src="https://img.shields.io/npm/dw/prisma-zod-generator.svg?color=8B5CF6&label=downloads"></a>
		<a href="https://github.com/omar-dulaimi/prisma-zod-generator/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/omar-dulaimi/prisma-zod-generator/ci.yml?branch=master&label=CI"></a>
		<a href="https://github.com/omar-dulaimi/prisma-zod-generator/blob/master/LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0a0a.svg"></a>
		<img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript%20>=5.4%20(rec%205.9)-3178c6.svg">
		<img alt="Module formats" src="https://img.shields.io/badge/modules-ESM%20%2B%20CJS-444.svg">
		<a href="https://omar-dulaimi.github.io/prisma-zod-generator/"><img alt="Docs" src="https://img.shields.io/badge/docs-website-0ea5e9.svg"></a>
		<img alt="Node.js" src="https://img.shields.io/badge/node-%3E%3D20.19.0%20(rec%2022.x)-339933?logo=node.js&logoColor=white">
	</p>
	<sub>
		Prisma → Zod generator for end-to-end workflows.<br/>
		🚀 generate validation · 🔐 gate policies · 📚 ship docs · ⚙️ automate server actions
	</sub>
</div>

---

> Docs: https://omar-dulaimi.github.io/prisma-zod-generator/

## 🌟 All Features (Core + Pro)

<div align="center">
  <img src="https://img.shields.io/badge/🎯_Core_Features_(Free)-27AE60?style=for-the-badge&color=27AE60&logoColor=white" alt="Core Features" />
  <img src="https://img.shields.io/badge/💎_Pro_Features_(Paid)-9B59B6?style=for-the-badge&color=9B59B6&logoColor=white" alt="Pro Features" />
</div>

<br />

<details open>
<summary>
  <h3>📋 <strong>Complete Feature Overview</strong></h3>
</summary>

<div align="center">
  <p><sub>Green = Free (MIT) • Purple/Gold = Pro (Paid)</sub></p>
</div>

<br />
<!-- diagram:diagram-01-23b43096d1 -->
<p align="center">
  <img src="docs/assets/diagrams/diagram-01-23b43096d1.svg" alt="Prisma Zod Generator feature map (Core vs Pro tiers)" width="960" />
</p>
<details data-mermaid-source>
  <summary>View Mermaid source</summary>

```mermaid
graph TB
    classDef coreRoot fill:#1e8449,stroke:#0b5345,stroke-width:4px,color:#fff;
    classDef coreCategory fill:#27ae60,stroke:#145a32,stroke-width:3px,color:#fff;
    classDef coreItem fill:#58d68d,stroke:#196f3d,color:#0b3d1f;
    classDef proRoot fill:#f39c12,stroke:#7d6608,stroke-width:4px,color:#fff;
    classDef proCategory fill:#9b59b6,stroke:#512e5f,stroke-width:3px,color:#fff;
    classDef proItem fill:#bb8fce,stroke:#5b2c6f,color:#2e0f3a;

    subgraph "🎯 CORE FEATURES (Free Forever)"
        PZG[Prisma Zod Generator]

        PZG --> GEN[Schema Generation]
        PZG --> CUSTOM[Customization]
        PZG --> SAFETY[Type Safety]
        PZG --> PERF[Performance]

        GEN --> GEN1["⚡ Minimal Mode"]
        GEN --> GEN2["🌟 Full Mode"]
        GEN --> GEN3["🎛️ Custom Mode"]
        GEN --> GEN4["📦 Schema Variants"]
        GEN --> GEN5["🔢 Decimal Handling"]
        GEN --> GEN6["📅 DateTime Support"]

        CUSTOM --> CUST1["🎨 Naming Patterns"]
        CUSTOM --> CUST2["📂 File Organization"]
        CUSTOM --> CUST3["🎯 Selective Generation"]
        CUSTOM --> CUST4["🔧 Config Options"]
        CUSTOM --> CUST5["🧰 Multi-Provider Helpers"]

        SAFETY --> SAFE1["✅ Zod v4 Formats"]
        SAFETY --> SAFE2["🛡️ Strict Mode"]
        SAFETY --> SAFE3["🔒 Type Checking"]
        SAFETY --> SAFE4["📋 Validation Suites"]

        PERF --> PERF1["⚡ Fast Output"]
        PERF --> PERF2["📦 Tree Shaking"]
        PERF --> PERF3["🎯 Selective Imports"]
        PERF --> PERF4["📁 Granular Emit Control"]
    end

    subgraph "💎 PRO FEATURES (Paid Plans)"
        PRO[PZG Pro]

        PRO --> SEC[Security & Governance]
        PRO --> DEV[Developer Experience]
        PRO --> PLAT[Platform & Scale]

        SEC --> SEC1["🛡️ Policies & Redaction"]
        SEC --> SEC2["🚨 Drift Guard"]
        SEC --> SEC3["🐘 PostgreSQL RLS"]
        SEC --> SEC4["🧪 Contract Testing"]

        SEC1 --> SEC1A["Role-Based Policies"]
        SEC1 --> SEC1B["Conditional Access"]
        SEC1 --> SEC1C["PII Redaction"]

        SEC2 --> SEC2A["CI Integration"]
        SEC2 --> SEC2B["Breaking Change Alerts"]
        SEC2 --> SEC2C["Auto-Block Enforcement"]

        DEV --> DEV1["⚡ Server Actions Pack"]
        DEV --> DEV2["📝 Form UX Pack"]
        DEV --> DEV3["📄 API Docs Pack"]
        DEV --> DEV4["🏭 Data Factories"]

        DEV1 --> DEV1A["Next.js Actions"]
        DEV1 --> DEV1B["Type-Safe Handlers"]
        DEV1 --> DEV1C["Error Recovery"]

        PLAT --> PLAT1["📦 SDK Publisher"]
        PLAT --> PLAT2["🏢 Multi-Tenant Kit"]
        PLAT --> PLAT3["🚀 Performance Pack"]

        PLAT3 --> PLAT3A["Streaming Validation"]
        PLAT3 --> PLAT3B["Chunked Processing"]
        PLAT3 --> PLAT3C["Memory Efficient Pipelines"]
    end

    class PZG coreRoot;
    class GEN,CUSTOM,SAFETY,PERF coreCategory;
    class GEN1,GEN2,GEN3,GEN4,GEN5,GEN6,CUST1,CUST2,CUST3,CUST4,CUST5,SAFE1,SAFE2,SAFE3,SAFE4,PERF1,PERF2,PERF3,PERF4 coreItem;

    class PRO proRoot;
    class SEC,DEV,PLAT proCategory;
    class SEC1,SEC2,SEC3,SEC4,SEC1A,SEC1B,SEC1C,SEC2A,SEC2B,SEC2C,DEV1,DEV2,DEV3,DEV4,DEV1A,DEV1B,DEV1C,PLAT1,PLAT2,PLAT3,PLAT3A,PLAT3B,PLAT3C proItem;
```
</details>
<!-- /diagram:diagram-01-23b43096d1 -->

### 🎯 Core Features (MIT License - Free Forever)

**Schema Generation**
- ⚡ Minimal Mode - Essential CRUD only
- 🌟 Full Mode - Complete ecosystem
- 🎛️ Custom Mode - Granular control
- 📦 Schema Variants - Input, result, pure models
- 🔢 Decimal Handling - BigInt & Decimal support
- 📅 DateTime Support - ISO formats & Zod v4

**Customization**
- 🎨 Naming Patterns - Custom schema names
- 📂 Organization - File structure control
- 🎯 Selective Generation - Filter what gets generated
- 🔧 Config Options - Extensive configuration
- 🧰 Multi-Provider Helpers - Ready-made presets for each datasource

**Type Safety**
- ✅ Zod v4 Formats - ISO string methods (`.iso.date()`, `.iso.datetime()`, etc.)
- 🛡️ Strict Mode - Enforce type correctness
- 🔒 Type Checking - Full TypeScript integration
- 📋 Validation - Runtime type validation

**Performance**
- ⚡ Fast Output - Optimized generation
- 📦 Tree Shaking - Remove unused code
- 🎯 Selective Imports - Import only what you need
- 📁 Granular Emit Control - Precise directory + preset outputs

---

### 💎 Pro Features (Paid Plans)

**Security & Governance**
- 🛡️ **Policies & Redaction** (Professional+) - Role-based policies, conditional access, PII protection
- 🚨 **Drift Guard** (Professional+) - Breaking change detection, CI integration
- 🐘 **PostgreSQL RLS** (Professional+) - Row-level security, tenant isolation
- 🧪 **Contract Testing** (Business+) - Pact.js integration, consumer-driven contracts

**Developer Experience**
- ⚡ **Server Actions Pack** (Starter+) - Next.js typed server actions
- 📝 **Form UX Pack** (Starter+) - React Hook Form + UI library integration
- 📄 **API Docs Pack** (Business+) - OpenAPI v3, Swagger UI generation
- 🏭 **Data Factories** (Business+) - Test data generation

**Platform & Scale**
- 📦 **SDK Publisher** (Professional+) - Generate typed client SDKs
- 🏢 **Multi-Tenant Kit** (Enterprise) - Tenant isolation, context management
- 🚀 **Performance Pack** (Professional+) - Streaming validation, chunked processing, memory efficient

<div align="center">
  <p>
    <a href="https://omar-dulaimi.github.io/prisma-zod-generator/pricing"><strong>View Pricing & Plans</strong></a> |
    <a href="https://omar-dulaimi.github.io/prisma-zod-generator/docs"><strong>Full Documentation</strong></a>
  </p>
</div>

</details>

<br />

---

## 📖 Quick Start

> ⭐️ Tip: Star the repo to keep track of new generators, recipes, and fixes.

```bash
# Install
npm install -D prisma-zod-generator

# Add to schema.prisma
generator zod {
  provider = "prisma-zod-generator"
}

# Generate
npx prisma generate
```

## 🧠 Config IntelliSense

Point your config file at the published JSON Schema to get autocomplete, hover docs, and validation errors in any JSON-aware editor:

```json title="prisma/config.json"
{
  "$schema": "../node_modules/prisma-zod-generator/lib/config/schema.json",
  "mode": "full"
}
```

Use a relative path that matches your repo layout (for example `./node_modules/...`). See the [JSON Schema IntelliSense guide](https://omar-dulaimi.github.io/prisma-zod-generator/docs/config/schema-json) for monorepo examples, CI validation scripts, and tips on shipping the schema with custom tooling.

## 💡 Usage Examples

- See the [full documentation](https://omar-dulaimi.github.io/prisma-zod-generator/) for detailed guides, upgrade notes, and feature walkthroughs.
- Browse `recipes/` for copy-paste presets, CI snippets, and integration templates that match your stack.
- Share `llms.txt` with AI copilots for an on-ramp to the architecture, commands, and conventions.

## ❤️ Sponsor Development

If Prisma Zod Generator saves you time or catches bugs before production, consider sponsoring to fund maintenance and new feature work.

- On GitHub Sponsors, switch to the **One-time** tab (second tab) to see the PZG plan tiers. Pick the
  yearly tiers labeled **PZG Starter**, **PZG Professional**, **PZG Business**, or **PZG Enterprise** to
  unlock the corresponding Pro licenses—monthly “support” tiers (e.g., *Pro (Individual)*) in the
  Monthly tab do not include PZG Pro.

<p align="center">
  <img src="website/static/img/tiers.png" alt="GitHub Sponsors One-time tab showing PZG yearly tiers" width="320" />
  <br />
  <sub>Open the One-time tab to see the Prisma Zod Generator Starter, Professional, and Business tiers.</sub>
</p>
- Become a sponsor: https://github.com/sponsors/omar-dulaimi

## 🤝 Contributing

PRs are welcome! Keep diffs focused, open an issue before large refactors, and lean on the test suites for expected behavior and coverage.

## 🖼️ Updating Diagrams

When you edit Mermaid blocks in this README, run `pnpm render:diagrams` afterwards. The script refreshes the SVG fallbacks in `docs/assets/diagrams/` so diagrams render correctly on npm and GitHub Mobile.

## 📄 License

MIT © [Omar Dulaimi](https://github.com/omar-dulaimi)

**Core features**: MIT licensed, free forever  
**Pro features**: Commercial license, see [pricing](https://omar-dulaimi.github.io/prisma-zod-generator/pricing)
