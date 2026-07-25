---
title: PZG Pro CLI & API Reference
sidebar_label: Pro CLI & API
---

# PZG Pro API Reference

Complete API documentation for all PZG Pro features and CLI commands.

## 📋 Table of Contents

- [CLI Commands](#cli-commands)
- [License API](#license-api)
- [Policies API](#policies-api)
- [Server Actions API](#server-actions-api)
- [SDK Publisher API](#sdk-publisher-api)
- [Drift Guard API](#drift-guard-api)

## 🖥️ CLI Commands {#cli-commands}

### Core Commands

#### `prisma-zod-generator license-check`
Validate and display license information.

```bash
prisma-zod-generator license-check
```

**Sample Output:**
```
🔍 Checking PZG Pro license...

✅ Valid PZG Pro license found
📋 Plan: Business (business)
👥 Max Seats: 1
🆔 Customer ID: Name
📅 Valid Until: 2026-11-09T01:03:50.464Z
🌐 License verified with server

🚀 Ready to use PZG Pro features!
📚 Docs: /docs
💬 Support: https://github.com/omar-dulaimi/prisma-zod-generator/issues
```

#### `pzg-pro guard`
Run schema drift detection.

```bash
npx pzg-pro guard [options]
```

**Options:**
- `--schema <path>`: Path to `schema.prisma` (default: `./prisma/schema.prisma`)
- `--base <ref>`: Base git reference (default: `origin/main`)
- `--head <ref>`: Head git reference (default: `HEAD`)
- `--format <github|json|text>`: Output format (default: `github`)
- `--json`, `--text`, `--github`: Shortcuts for `--format`
- `--strict`: Fail the command when breaking changes remain. Without it the report is printed but the command always exits 0.
- `--allowed-break <identifier>`: Whitelist a specific change (repeatable)
- `--help`: Show usage

**Change identifiers** for `--allowed-break` are built as `<Model>.<field>:<change>` for field-level changes and `<Model>:<change>` for model- and enum-level ones. The `<change>` token is one of `model_added`, `model_removed`, `field_added`, `field_removed`, `type_changed`, `optional_to_required`, `required_to_optional`, `list_changed`, `enum_added`, `enum_removed`, `enum_value_added`, `enum_value_removed`, or `comparison_error`.

**Examples:**
```bash
# Compare current branch to main (GitHub-style output)
npx pzg-pro guard --schema ./prisma/schema.prisma --base origin/main --format github

# Produce machine-readable JSON
npx pzg-pro guard --format json > drift-report.json

# Fail CI on breaking changes, but allow one known removal
npx pzg-pro guard --strict --allowed-break User.email:field_removed
```

## 🔑 License API {#license-api}

### TypeScript API

```typescript
import {
  validateLicense,
  hasFeature,
  requireFeature,
  getLicenseStatus
} from 'prisma-zod-generator/lib/license';

// Validate license (non-throwing)
const license = await validateLicense(false);
if (license) {
  console.log(`Plan: ${license.plan}, Seats: ${license.maxSeats}`);
}

// Check feature availability
const hasPolicies = hasFeature(license, 'policies');

// Require feature (throws if not available)
await requireFeature('sdk-publisher', { userId: 'user-123' });

// Get license status
const status = await getLicenseStatus();
console.log('Valid:', status.valid);
```

> Set `PZG_LICENSE_KEY` in your environment before invoking the CLI. `PZG_LICENSE_PUBLIC_KEY` is only needed if you were issued a non-default verification key — otherwise a built-in one is used. Verification is fully offline.

### License Object Schema

```typescript
interface License {
  key: string;                 // Full license key
  plan: 'starter' | 'professional' | 'business' | 'enterprise';
  validUntil: string;         // ISO date string
  maxSeats: number;           // Maximum developer seats
  cached: boolean;            // Whether loaded from cache
}

interface LicenseStatus {
  valid: boolean;
  plan?: string;
  cached?: boolean;
  // Present when valid is false, so callers can show the right remedy.
  reason?: 'missing_key' | 'invalid_key' | 'expired' | 'code_tampering_detected' | 'validation_failed';
  detail?: string;
}
```

### Feature Availability

```typescript
// Available features by plan
const FEATURES = {
  'server-actions': ['starter', 'professional', 'business', 'enterprise'],
  'policies': ['professional', 'business', 'enterprise'],
  'sdk-publisher': ['professional', 'business', 'enterprise'],
  'drift-guard': ['professional', 'business', 'enterprise'],
  'postgres-rls-pack': ['professional', 'business', 'enterprise'],
  'performance-pack': ['professional', 'business', 'enterprise'],
  'contract-testing-pack': ['business', 'enterprise'],
  'form-ux': ['starter', 'professional', 'business', 'enterprise'],
  'api-docs-pack': ['business', 'enterprise'],
  'data-factories': ['business', 'enterprise'],
  'multi-tenant-kit': ['enterprise']
};
```

## 🛡️ Policies API {#policies-api}

### Generated files

A model carrying a `/// @policy` annotation gets a policy-aware CRUD wrapper; a
model carrying `/// @pii` gets a redactor. Both get DTO schemas.

```
<output>/policies/
├── safe-crud/<model>.ts    # one per model with @policy
├── redaction/<model>.ts    # one per model with @pii
├── dto/<model>.ts          # schemas + validate helpers
└── index.ts                # barrel + create<Model>SafeOperations factories
```

### Policy-aware CRUD

Instance methods on a per-model class — not static validators. Each method takes
the calling context and applies the model's read policies to the `where` clause
before delegating to Prisma.

```typescript
// Generated: <output>/policies/safe-crud/member.ts
export interface PolicyContext {
  userId?: string;
  role?: string;
  tenantId?: string;
  [key: string]: any;
}

export class MemberSafeCRUD {
  constructor(prisma: any, context?: PolicyContext);

  findMany(context?: PolicyContext, args?: Prisma.MemberFindManyArgs): Promise<Member[]>;
  findUnique(context: PolicyContext, args: Prisma.MemberFindUniqueArgs): Promise<Member | null>;
  create(context: PolicyContext, args: Prisma.MemberCreateArgs): Promise<Member>;
  update(context: PolicyContext, args: Prisma.MemberUpdateArgs): Promise<Member>;
  delete(context: PolicyContext, args: Prisma.MemberDeleteArgs): Promise<Member>;
}
```

The context passed to a method is merged over the one given to the constructor,
so you can set a tenant once and vary the user per call.

### Redaction API

One class per model with `@pii` fields, plus an Express middleware factory.

```typescript
// Generated: <output>/policies/redaction/member.ts
export interface RedactionConfig {
  context?: string;
  preserveLength?: boolean;
}

export class MemberRedactor {
  constructor(config?: RedactionConfig);
  redact(data: Member | Member[], context?: string): any;
}

export function createMemberRedactionMiddleware(config?: RedactionConfig): RequestHandler;
```

### DTO schemas

```typescript
// Generated: <output>/policies/dto/member.ts
export const MemberBaseSchema;
export const MemberCreateInputSchema;   // Base minus generated columns
export const MemberUpdateInputSchema;   // partial()
export const MemberPublicSchema;        // Base minus @pii fields
export const MemberUserSchema;
export const MemberAdminSchema;

export function validateMemberCreate(data: unknown): MemberCreateInput;
export function validateMemberUpdate(data: unknown): MemberUpdateInput;
```

### Usage Example

```typescript
import { createSafeMemberOperations, MemberRedactor } from './generated/pro/policies';

const members = createSafeMemberOperations(prisma, { tenantId: org.id });

// Read policies are folded into the where clause
const visible = await members.findMany({ userId: user.id, role: user.role });

// Redact @pii fields before logging
const redactor = new MemberRedactor();
console.log('member updated:', redactor.redact(member, 'logs'));
```

:::note
`redact()` masks the fields you marked `/// @pii`. The `redactPII()` helper
exported from the barrel is a placeholder that returns its input unchanged —
use the per-model redactor.
:::

## ⚡ Server Actions API {#server-actions-api}

### Generated files

```
<output>/server-actions/
├── actions/<model>.ts      # one module per model, five actions each
├── hooks/use<Model>.ts     # React hooks wrapping those actions
├── types/<model>.ts        # per-model input/result types
├── types/common.ts         # ServerActionResult, UseServerActionOptions
├── utils/validation.ts
├── prisma-client.ts        # the shared client the actions import
├── index.ts
└── USAGE.md
```

### Generated Server Actions

Five actions per model, all returning a result envelope rather than throwing. The
arguments are Prisma's own input types, so anything you can pass to the client
you can pass here.

```typescript
// Generated: <output>/server-actions/actions/member.ts
export async function createMember(
  data: Prisma.MemberCreateInput,
): Promise<ServerActionResult<Member>>;

export async function updateMember(
  id: string,
  data: Prisma.MemberUpdateInput,
): Promise<ServerActionResult<Member>>;

export async function deleteMember(id: string): Promise<ServerActionResult<Member>>;

export async function findManyMembers(
  args?: Prisma.MemberFindManyArgs,
): Promise<ServerActionResult<Member[]>>;

export async function findUniqueMember(id: string): Promise<ServerActionResult<Member | null>>;
```

```typescript
// Generated: <output>/server-actions/types/common.ts
export interface ServerActionResult<T> {
  success: boolean;
  data: T;
  error?: string;
}
```

### Generated React Hooks

One hook per action. Each exposes `execute` — the name does not vary by
operation — plus `isPending` and a `string | null` error.

```typescript
// Generated: <output>/server-actions/hooks/useMember.ts
export function useCreateMember(options?: UseServerActionOptions<Member>): {
  execute: (data: Prisma.MemberCreateInput) => Promise<void>;
  isPending: boolean;
  error: string | null;
  optimisticData: Member[];   // only when enableOptimistic is set
};

export function useUpdateMember(options?: UseServerActionOptions<Member>): { … };
export function useDeleteMember(options?: UseServerActionOptions<void>): { … };
export function useFindManyMembers(options?: UseServerActionOptions<Member[]>): { … , data };
export function useFindUniqueMember(options?: UseServerActionOptions<Member>): { … , data };

export interface UseServerActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  redirect?: string;
  enableOptimistic?: boolean;
  optimisticData?: T[];
}
```

:::note
The emitted files carry no `'use server'` or `'use client'` directive — add them
yourself: `'use server'` at the top of each `actions/<model>.ts`, `'use client'`
at the top of each `hooks/use<Model>.ts`. Without the client directive the hooks
fail a production Next.js build, and without the server directive an action
imported from a Client Component pulls `prisma-client.ts` into the browser
bundle.
:::

## 📦 SDK Publisher API {#sdk-publisher-api}

### Generated SDK Structure

Two single-file clients — one per requested platform. There is no package
scaffold: no `package.json`, no build step, nothing to `npm publish`. Copy the
file into the consumer, or wrap it in a package of your own.

```
<output>/sdk/
├── typescript/index.ts     # interfaces, enums and the APIClient class
└── python/api_client.py    # requests-based equivalent
```

Methods live directly on the client and are named `<verb><Model>`, not grouped
into per-model resource objects.

```typescript
// Generated: <output>/sdk/typescript/index.ts
export class APIClient {
  constructor(baseUrl: string, apiKey?: string);

  listOrganizations(): Promise<any>;
  getOrganization(id: string): Promise<any>;
  createOrganization(data: any): Promise<any>;
  updateOrganization(id: string, data: any): Promise<any>;
  deleteOrganization(id: string): Promise<any>;

  // …the same five per model
}
```

`apiKey` is sent as `Authorization: Bearer <key>`. Model interfaces and enums are
emitted alongside the client, but the CRUD methods take and return `any` — the
interfaces are there for you to annotate call sites with.

### Error Handling

A non-2xx response throws a plain `Error` whose message is the status code:

```typescript
try {
  await client.getOrganization(id);
} catch (err) {
  // err.message === 'HTTP 404'
}
```

No typed error classes are generated. If you need to branch on status, parse the
message or wrap `APIClient` in your own error layer.

:::note
The emitted TypeScript references `Decimal`, `JsonValue` and `Buffer` for
`Decimal`, `Json` and `Bytes` columns without importing them. Add a prelude to
the top of the file — or map those columns to `string` in your API — before
adding it to a `tsc` program. Enums are emitted as numeric TypeScript enums, so
compare against the enum member (`Role.ADMIN`), not the string a JSON payload
carries.
:::

## 🚨 Drift Guard API {#drift-guard-api}

:::note
Drift Guard is driven through the `pzg-pro guard` CLI documented above. There is no supported programmatic entry point — integrate it by shelling out to the CLI and reading `--format json` from stdout.
:::

### Configuration Type

```typescript
interface DriftGuardConfig {
  baseBranch?: string;
  headBranch?: string;
  outputFormat?: 'github' | 'json' | 'text';
  strictMode?: boolean;
  allowedBreaks?: string[];
}
```

The CLI maps `--format` → `outputFormat`, `--strict` → `strictMode`, and repeated `--allowed-break` → `allowedBreaks`. There is no field-exclusion or breaking-change-threshold setting.

### Drift Detection Results

`--format json` emits a summary plus the raw change list:

```typescript
{
  summary: {
    total: number;
    breaking: number;
    nonBreaking: number;
  };
  changes: SchemaChange[];
}

interface SchemaChange {
  type: 'breaking' | 'non-breaking';
  category: 'field' | 'enum' | 'model' | 'type' | 'validation';
  model: string;
  field?: string;
  change: string;          // e.g. 'field_removed'
  description: string;
  severity: 'error' | 'warning' | 'info';
}
```

### Consuming the report

```bash
npx pzg-pro guard --format json --strict > drift-report.json
```

```typescript
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync('drift-report.json', 'utf8'));

console.log(`${report.summary.total} changes detected`);
for (const change of report.changes) {
  if (change.type === 'breaking') {
    console.error(`Breaking: ${change.model}.${change.field ?? ''} — ${change.description}`);
  }
}
```

## 📚 Type Definitions

### Common Types

```typescript
// Plan types
type PlanType = 'starter' | 'professional' | 'business' | 'enterprise';

// Feature types
type FeatureType =
  | 'server-actions'
  | 'policies'
  | 'sdk-publisher'
  | 'drift-guard'
  | 'postgres-rls-pack'
  | 'performance-pack'
  | 'contract-testing-pack'
  | 'form-ux'
  | 'api-docs-pack'
  | 'data-factories'
  | 'multi-tenant-kit';

// Generation options
interface GenerationOptions {
  outputPath?: string;
  schemaPath?: string;
  models?: string[];
  force?: boolean;
  dryRun?: boolean;
}
```

## 🐛 Error Types

```typescript
// License errors
class LicenseError extends Error {
  code: 'INVALID_LICENSE' | 'EXPIRED_LICENSE' | 'FEATURE_NOT_AVAILABLE';
  details?: any;
}

// Generation errors
class GenerationError extends Error {
  code: 'SCHEMA_PARSE_ERROR' | 'FILE_WRITE_ERROR' | 'VALIDATION_ERROR';
  file?: string;
  line?: number;
}

// Configuration errors
class ConfigError extends Error {
  code: 'INVALID_CONFIG' | 'MISSING_CONFIG' | 'CONFIG_PARSE_ERROR';
  field?: string;
}
```

---

**Need more details?** Check the [feature-specific documentation](../features/overview.md) or reach out via DM to [@omardulaimidev on X](https://x.com/omardulaimidev).
