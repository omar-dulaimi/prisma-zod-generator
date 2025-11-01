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

#### `pzg-pro license-check`
Validate and display license information.

```bash
npx pzg-pro license-check [options]
```

**Options:**
- `--verbose, -v`: Show detailed license information
- `--json`: Output in JSON format
- `--features`: Show available features for your plan

**Examples:**
```bash
# Basic license check
npx pzg-pro license-check

# Detailed output
npx pzg-pro license-check --verbose

# JSON output for scripts
npx pzg-pro license-check --json | jq '.plan'

# Show available features
npx pzg-pro license-check --features
```

**Output:**
```
✅ Valid PZG Pro License
📋 Plan: professional (Professional)
👥 Max Seats: 5
📅 Valid Until: 2025-12-31
```

#### `pzg-pro config`
Manage configuration files.

```bash
npx pzg-pro config <command> [options]
```

**Commands:**
- `show`: Display current configuration
- `validate`: Validate configuration file
- `init`: Create default configuration file

**Examples:**
```bash
# Show effective configuration
npx pzg-pro config show

# Validate config file
npx pzg-pro config validate

# Create default config
npx pzg-pro config init
```

### Generation Commands

#### `pzg-pro generate policies`
Generate policy enforcement code and redaction middleware.

```bash
npx pzg-pro generate policies [options]
```

**Options:**
- `--output, -o <path>`: Output directory (default: `./generated/pzg/policies`)
- `--schema, -s <path>`: Prisma schema file (default: `./prisma/schema.prisma`)
- `--models, -m <models>`: Comma-separated list of models to include
- `--force`: Overwrite existing files
- `--dry-run`: Preview generated files without writing

**Examples:**
```bash
# Generate all policies
npx pzg-pro generate policies

# Specific models only
npx pzg-pro generate policies --models User,Post,Comment

# Custom output directory
npx pzg-pro generate policies --output ./src/generated/policies

# Preview without writing files
npx pzg-pro generate policies --dry-run
```

#### `pzg-pro generate server-actions`
Generate Next.js Server Actions and React hooks.

```bash
npx pzg-pro generate server-actions [options]
```

**Options:**
- `--output, -o <path>`: Output directory (default: `./src/server`)
- `--schema, -s <path>`: Prisma schema file
- `--models, -m <models>`: Models to generate actions for
- `--actions, -a <actions>`: Actions to generate (create,update,delete,findMany)
- `--hooks`: Generate React hooks (default: true)
- `--force`: Overwrite existing files

**Examples:**
```bash
# Generate all server actions
npx pzg-pro generate server-actions

# Specific models and actions
npx pzg-pro generate server-actions --models User,Post --actions create,update

# Custom output path
npx pzg-pro generate server-actions --output ./src/lib/server
```

#### `pzg-pro generate sdk`
Generate and publish TypeScript SDK.

```bash
npx pzg-pro generate sdk [options]
```

**Options:**
- `--package, -p <name>`: Package name (e.g., @acme/api-sdk)
- `--version, -v <version>`: Package version (default: 1.0.0)
- `--output, -o <path>`: Output directory (default: `./packages/sdk`)
- `--publish`: Publish to npm registry
- `--registry <url>`: Custom npm registry URL

**Examples:**
```bash
# Generate SDK package
npx pzg-pro generate sdk --package @acme/api-sdk --version 1.0.0

# Generate and publish
npx pzg-pro generate sdk --package @acme/api-sdk --publish

# Custom registry
npx pzg-pro generate sdk --package @acme/api-sdk --registry https://npm.example.com
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
- `--strict`: Treat warnings as breaking changes
- `--allowed-break <identifier>`: Whitelist a specific change (repeatable, see identifiers in the CLI output such as `model.User.field_removed`)
- `--help`: Show usage

**Examples:**
```bash
# Compare current branch to main (GitHub-style output)
npx pzg-pro guard --schema ./prisma/schema.prisma --base origin/main --format github

# Produce machine-readable JSON
npx pzg-pro guard --format json > drift-report.json

# Allow a known breaking change by identifier
npx pzg-pro guard --allowed-break model.User.field_removed
```

## ⚙️ Configuration API

### Configuration File Schema

The `pzg.config.json` file supports the following structure:

```typescript
interface PZGProConfig {
  pro: {
    // Global settings
    licenseKey?: string; // Not recommended, use environment variable

    // Feature-specific configuration
    policies?: PolicyConfig;
    serverActions?: ServerActionsConfig;
    sdk?: SDKConfig;
    driftGuard?: DriftGuardConfig;

    // Environment-specific overrides
    development?: Partial<PZGProConfig['pro']>;
    staging?: Partial<PZGProConfig['pro']>;
    production?: Partial<PZGProConfig['pro']>;
  };
}
```

### Policy Configuration

```typescript
interface PolicyConfig {
  outputPath?: string;           // Default: './generated/pzg/policies'
  enableRedaction?: boolean;     // Default: true
  enableRLS?: boolean;          // Default: false
  roles?: string[];             // Default: ['user', 'admin']
  piiFields?: string[];         // Default: ['email', 'phone', 'ssn']
  redactionRules?: {
    [field: string]: {
      type: 'mask' | 'hash' | 'remove';
      pattern?: string;
    };
  };
}
```

### Server Actions Configuration

```typescript
interface ServerActionsConfig {
  outputPath?: string;                    // Default: './src/server'
  enableOptimisticUpdates?: boolean;      // Default: true
  enableCacheRevalidation?: boolean;      // Default: true
  enableErrorBoundaries?: boolean;        // Default: true
  actions?: ('create' | 'update' | 'delete' | 'findMany')[];
  hooks?: {
    enabled?: boolean;                    // Default: true
    queryClient?: 'react-query' | 'swr'; // Default: 'react-query'
  };
}
```

### SDK Configuration

```typescript
interface SDKConfig {
  packageName: string;
  outputPath?: string;          // Default: './packages/sdk'
  version?: string;             // Default: '1.0.0'
  authHeader?: string;          // Default: 'Authorization'
  retryConfig?: {
    maxRetries: number;         // Default: 3
    retryDelay: number;         // Default: 1000
  };
  endpoints?: {
    baseUrl: string;
    version?: string;           // Default: 'v1'
  };
}
```

### Drift Guard Configuration

```typescript
interface DriftGuardConfig {
  enabled?: boolean;                    // Default: true
  breakingChangeThreshold?: 'patch' | 'minor' | 'major'; // Default: 'major'
  outputFormat?: 'console' | 'json' | 'github' | 'gitlab'; // Default: 'console'
  excludeFields?: string[];            // Default: ['createdAt', 'updatedAt']
  customRules?: {
    [ruleName: string]: {
      pattern: string;
      severity: 'warning' | 'error';
    };
  };
}
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

### Drift Detection Results

```typescript
interface DriftReport {
  summary: {
    safeChanges: number;
    breakingChanges: number;
    recommendations: string[];
  };
  changes: SchemaChange[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface SchemaChange {
  type: 'field_added' | 'field_removed' | 'field_modified' | 'enum_modified';
  model: string;
  field?: string;
  before?: any;
  after?: any;
  breaking: boolean;
  description: string;
}
```

### Programmatic Usage

```typescript
import { analyzeSchemaDrift } from 'prisma-zod-generator/lib/drift-guard';

const report = await analyzeSchemaDrift({
  baseSchema: './prisma/schema.prisma',
  headSchema: './prisma/schema-new.prisma',
  config: {
    excludeFields: ['createdAt', 'updatedAt'],
    breakingThreshold: 'major'
  }
});

console.log(`${report.changes.length} changes detected`);
report.changes.forEach(change => {
  if (change.breaking) {
    console.error(`Breaking: ${change.description}`);
  }
});
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
