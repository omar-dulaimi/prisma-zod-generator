---
title: PZG Pro CLI & API Reference
sidebar_label: Pro CLI & API
---

# PZG Pro API Reference

Complete API documentation for all PZG Pro features and CLI commands.

## 📋 Table of Contents

- [CLI Commands](#cli-commands)
- [Configuration API](#configuration-api)
- [License API](#license-api)
- [Policies API](#policies-api)
- [Server Actions API](#server-actions-api)
- [SDK Publisher API](#sdk-publisher-api)
- [Drift Guard API](#drift-guard-api)

## 🖥️ CLI Commands

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

## 🔑 License API

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

> Set both `PZG_LICENSE_KEY` and `PZG_LICENSE_PUBLIC_KEY` in your environment before invoking the CLI so offline verification succeeds.

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

## 🛡️ Policies API

### Generated Policy Classes

Each model generates a policy class with validation methods:

```typescript
// Generated: ./generated/pzg/policies/user.ts
export class UserPolicies {
  static validateRead(data: any, context: PolicyContext): PolicyResult;
  static validateWrite(data: any, context: PolicyContext): PolicyResult;
  static validateDelete(context: PolicyContext): PolicyResult;
}

interface PolicyContext {
  userId?: string;
  role?: string;
  roles?: string[];
  tenantId?: string;
  sessionId?: string;
  [key: string]: any;
}

interface PolicyResult {
  allowed: boolean;
  data?: any;          // Filtered/modified data
  reason?: string;     // Reason for denial
}
```

### Redaction API

```typescript
// Generated: ./generated/pzg/redaction/index.ts
export class PIIRedactor {
  static redactForLogs(data: any, context?: PolicyContext): any;
  static maskField(value: string, type: 'email' | 'phone' | 'partial'): string;
  static hashField(value: string): string;
}
```

### Usage Example

```typescript
import { UserPolicies } from '@/generated/pzg/policies';
import { PIIRedactor } from '@/generated/pzg/redaction';

// Policy enforcement
const userData = { email: 'user@example.com', salary: 100000 };
const context = { userId: 'current-user', roles: ['user'] };

const readResult = UserPolicies.validateRead(userData, context);
if (readResult.allowed) {
  // Use readResult.data (salary may be filtered out)
  const safeData = readResult.data;
}

// PII redaction for logging
const logSafeData = PIIRedactor.redactForLogs(userData);
console.log('User updated:', logSafeData); // { email: 'u***@example.com', salary: 100000 }
```

## ⚡ Server Actions API

### Generated Server Actions

Each model generates CRUD actions:

```typescript
// Generated: ./src/server/actions/user/create.ts
export async function createUser(input: CreateUserInput): Promise<User>;
export async function updateUser(id: string, input: UpdateUserInput): Promise<User>;
export async function deleteUser(id: string): Promise<void>;
export async function findUsers(input?: FindUsersInput): Promise<User[]>;
```

### Generated React Hooks

```typescript
// Generated: ./src/server/hooks/useUser.ts
export function useCreateUser(): {
  create: (data: CreateUserInput) => Promise<User>;
  isPending: boolean;
  error: Error | null;
};

export function useUpdateUser(): {
  update: (id: string, data: UpdateUserInput) => Promise<User>;
  isPending: boolean;
  error: Error | null;
};

export function useUsers(input?: FindUsersInput): {
  data: User[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};
```

### Schema Types

```typescript
// Input schemas for validation
type CreateUserInput = z.infer<typeof CreateUserSchema>;
type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
type FindUsersInput = z.infer<typeof FindUsersSchema>;
```

## 📦 SDK Publisher API

### Generated SDK Structure

```typescript
// Generated: ./packages/sdk/src/client.ts
export class APIClient {
  constructor(config: ClientConfig);

  // Model methods
  users: UserResource;
  posts: PostResource;
  // ... other models
}

interface ClientConfig {
  baseUrl: string;
  authToken?: string;
  timeout?: number;
  retries?: number;
}

class UserResource {
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
  findMany(query?: FindUsersInput): Promise<User[]>;
  findUnique(id: string): Promise<User | null>;
}
```

### Error Handling

```typescript
// Generated error classes
export class APIError extends Error {
  status: number;
  code?: string;
  details?: any;
}

export class ValidationError extends APIError {
  field: string;
  message: string;
}

export class AuthenticationError extends APIError {}
export class AuthorizationError extends APIError {}
export class NotFoundError extends APIError {}
export class RateLimitError extends APIError {}
```

## 🚨 Drift Guard API

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
