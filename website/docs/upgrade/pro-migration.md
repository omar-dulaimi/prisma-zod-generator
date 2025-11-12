---
title: Upgrade from Free to Pro
sidebar_label: Free → Pro Migration
---

# Migration Guide: Free to Pro

Complete step-by-step guide to upgrade from the free version of Prisma Zod Generator to PZG Pro.

## 📋 Overview

This guide will help you:
- Understand the differences between free and Pro versions
- Plan your migration strategy
- Execute the upgrade with minimal disruption
- Take advantage of new Pro features

**Estimated Time**: 30-60 minutes depending on your codebase size

## 🔍 Pre-Migration Assessment

### 1. Current Setup Analysis
First, understand your current setup:

```bash
# Check your current version
npm list prisma-zod-generator

# Review your Prisma schema
cat prisma/schema.prisma | grep -E "^model|^enum"

# Check generated files
ls -la prisma/generated/ # or wherever your schemas are generated
```

### 2. Compatibility Check
Ensure your environment meets Pro requirements:

- **Node.js**: 18+ (same as free version)
- **Prisma**: 5.0+ (same as free version)
- **TypeScript**: 4.9+ (recommended)
- **Zod**: 3.22+ (same as free version)

### 3. Feature Planning
Decide which Pro features you want to use:

- ✅ **Server Actions**: Generate Next.js server actions
- ✅ **Policies & Redaction**: Field-level security and PII protection
- ✅ **SDK Publisher**: Generate client SDKs
- ✅ **Drift Guard**: Schema change detection in CI

## 🛒 Getting Your License

### 1. Choose Your Plan
Visit [the pricing page](/pricing) and select:

- **Starter ($69/year)** – 1 developer, Server Actions + Forms (CLI plan slug `starter`)
- **Professional ($199/year)** – up to 5 developers, security & governance suite (`professional`)
- **Business ($599/year)** – unlimited developers, platform toolkits (`business`)
- **Enterprise (Custom)** – unlimited developers, multi-tenant kit, roadmap partnership (`enterprise`)

### 2. Purchase & Download
After purchase, you'll receive:
- License key via email
- Access to Pro features
- Priority response targets (Business/Enterprise) and roadmap reviews (Enterprise)

### 3. Verify License
```bash
# Set your license key
export PZG_LICENSE_KEY=pzg_v2_your_license_key_here
export PZG_LICENSE_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAwRNEnFQJgBdNnwvnTTAPySp223shjXfioII2qMkqBFQ=\n-----END PUBLIC KEY-----'  # replace with the public key provided to you

# Verify it works
npx prisma-zod-generator license-check
```

## 🔧 Installation & Setup

### 1. Update Package
The Pro features are included in the same package:

```bash
# Update to latest version
npm update prisma-zod-generator

# Or with pnpm
pnpm update prisma-zod-generator

# Or with yarn
yarn upgrade prisma-zod-generator
```

### 2. Environment Configuration
Add your license key to environment variables:

```bash
# Option 1: Shell profile (.bashrc, .zshrc)
cat <<'EOF' >> ~/.bashrc
export PZG_LICENSE_KEY=pzg_v2_your_license_key_here
export PZG_LICENSE_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAwRNEnFQJgBdNnwvnTTAPySp223shjXfioII2qMkqBFQ=
-----END PUBLIC KEY-----'
EOF

# Option 2: Project .env file
cat <<'EOF' >> .env
PZG_LICENSE_KEY=pzg_v2_your_license_key_here
PZG_LICENSE_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAwRNEnFQJgBdNnwvnTTAPySp223shjXfioII2qMkqBFQ=
-----END PUBLIC KEY-----'
EOF
```

## 🏗️ Migration Strategy

### Strategy 1: Gradual Migration (Recommended)
Migrate one feature at a time to minimize risk:

1. **Week 1**: Set up license and basic configuration
2. **Week 2**: Add Server Actions to one model
3. **Week 3**: Add Policies to sensitive fields
4. **Week 4**: Set up Drift Guard in CI
5. **Week 5**: Generate SDK for external consumers

### Strategy 2: Full Migration
Migrate all features at once (for smaller projects):

1. Set up license and configuration
2. Generate all Pro features
3. Update application code
4. Test thoroughly
5. Deploy

### Strategy 3: Feature-by-Feature
Migrate based on business priorities:

1. **Security First**: Start with Policies & Redaction
2. **Developer Experience**: Add Server Actions
3. **API Stability**: Implement Drift Guard
4. **External Integrations**: Generate SDK

## 🔒 Adding Policies & Redaction

### 1. Identify Sensitive Fields
Review your Prisma schema for:
- **PII Data**: email, phone, ssn, address
- **Sensitive Data**: salary, medical info, financial data
- **Access-Controlled Data**: admin-only fields

### 2. Add Policy Comments
Update your Prisma schema with policy annotations:

```prisma
model User {
  id        String   @id @default(cuid())

  /// @pii email redact:logs mask:partial
  email     String   @unique

  /// @policy read:role in ["admin"]
  /// @pii sensitive hash:sha256
  salary    Int?

  /// @policy write:role in ["admin"]
  role      Role     @default(USER)

  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(cuid())

  /// @policy write:userId eq context.userId
  title     String

  /// @policy read:published eq true OR role in ["admin"]
  content   String

  published Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
```

### 3. Generate Policies
Ensure `enablePolicies = true` in your `generator pzgPro` block, then run:
```bash
pnpm exec prisma generate
ls prisma/generated/pro/policies/
```

### 4. Integrate in Application
```typescript
// Example: API route with policy enforcement
import { UserPolicies } from '@/generated/pzg/policies';
import { PIIRedactor } from '@/generated/pzg/redaction';

export async function GET(request: Request) {
  const users = await prisma.user.findMany();

  // Apply read policies
  const filteredUsers = users.map(user => {
    const result = UserPolicies.validateRead(user, {
      userId: getCurrentUserId(),
      roles: getUserRoles()
    });
    return result.allowed ? result.data : null;
  }).filter(Boolean);

  // Redact for logs
  console.log('Users fetched:', PIIRedactor.redactForLogs(filteredUsers));

  return Response.json(filteredUsers);
}
```

## ⚡ Adding Server Actions

### 1. Generate Server Actions
Set `enableServerActions = true` in `schema.prisma`, then:
```bash
pnpm exec prisma generate
ls prisma/generated/pro/server-actions/
```

> Need only a subset of models? Use Prisma's generator filtering (`model` / `exclude`) so the Pro generator only processes the models you care about.

### 2. Review Generated Code
```bash
# Check generated server actions
ls src/server/actions/
ls src/server/hooks/
```

### 3. Update Your Components
Replace manual API calls with generated hooks:

**Before (Free Version):**
```tsx
// Manual API call
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const createUser = async (data) => {
  setLoading(true);
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const user = await response.json();
    // Handle success
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};
```

**After (Pro Version):**
```tsx
// Generated hook with validation
import { useCreateUser } from '@/server/hooks/useUser';

const { create, isPending, error } = useCreateUser();

const handleSubmit = async (data) => {
  try {
    await create(data); // Automatic validation + policies
    // Success handled by hook
  } catch (err) {
    // Error handled by hook
  }
};
```

### 4. Add Required Dependencies
```bash
# Install React Query (for hooks)
npm install @tanstack/react-query

# Add to your app root
```

```tsx
// app/layout.tsx or pages/_app.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## 📦 Generating SDK

### 1. Configure SDK Settings
Add the flag and JSON config to `generator pzgPro`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output   = "./generated/pro"
  enableSDK = true
  sdk = "{ \"packageName\": \"@your-org/api-sdk\", \"version\": \"1.0.0\", \"outputPath\": \"./packages/sdk\", \"authHeader\": \"Authorization\", \"endpoints\": { \"baseUrl\": \"https://api.yourapp.com\", \"version\": \"v1\" } }"
}
```

### 2. Generate SDK
```bash
pnpm exec prisma generate
ls packages/sdk/
```

### 3. Publish SDK (Optional)
```bash
cd packages/sdk
npm run build
npm publish
```

### 4. Use SDK in Client Applications
```typescript
// Install in client projects
npm install @your-org/api-sdk

// Use in application
import { APIClient } from '@your-org/api-sdk';

const client = new APIClient({
  baseUrl: 'https://api.yourapp.com',
  authToken: 'your-auth-token'
});

const users = await client.users.findMany();
const newUser = await client.users.create({
  email: 'user@example.com',
  name: 'John Doe'
});
```

## 🚨 Setting Up Drift Guard

### 1. Create GitHub Workflow
```yaml
# .github/workflows/pzg-drift-guard.yml
name: PZG Drift Guard

on:
  pull_request:
    branches: [main]

jobs:
  schema-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Drift Guard
        env:
          PZG_LICENSE_KEY: ${{ secrets.PZG_LICENSE_KEY }}
          PZG_LICENSE_PUBLIC_KEY: ${{ secrets.PZG_LICENSE_PUBLIC_KEY }}
        run: npx pzg-pro guard --schema=./prisma/schema.prisma --base origin/main --head HEAD --format github
```

### 2. Add GitHub Secret
1. Go to your repository Settings > Secrets and variables > Actions
2. Add `PZG_LICENSE_KEY` with your license key value and `PZG_LICENSE_PUBLIC_KEY` with the PEM public key provided to you
3. Make sure it's marked as a secret (masked in logs)

### 3. Test Drift Guard
```bash
# Test locally against main
npx pzg-pro guard --schema=./prisma/schema.prisma --base main --head HEAD --format github

# Produce JSON output for scripts
npx pzg-pro guard --format json
```

## 🧪 Testing Your Migration

### 1. Validation Tests
Create tests to ensure your migration works:

```typescript
// tests/migration.test.ts
import { validateLicense } from 'prisma-zod-generator/lib/license';
import { UserPolicies } from '@/generated/pzg/policies';

describe('PZG Pro Migration', () => {
  test('license is valid', async () => {
    const license = await validateLicense(false);
    expect(license).toBeTruthy();
    expect(license.plan).toBeDefined();
  });

  test('policies are generated', () => {
    expect(UserPolicies.validateRead).toBeDefined();
    expect(UserPolicies.validateWrite).toBeDefined();
  });

  test('server actions exist', async () => {
    const { createUser } = await import('@/server/actions/user/create');
    expect(createUser).toBeDefined();
  });
});
```

### 2. Integration Tests
Test the full flow with real data:

```typescript
// tests/integration.test.ts
import { createUser } from '@/server/actions/user/create';
import { UserPolicies } from '@/generated/pzg/policies';

describe('Pro Features Integration', () => {
  test('server action with policies', async () => {
    // Test that server actions respect policies
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN' // Should be blocked by policy
    };

    const context = { userId: 'regular-user', roles: ['user'] };
    const policyResult = UserPolicies.validateWrite(userData, context);

    expect(policyResult.allowed).toBe(false);
    expect(policyResult.reason).toContain('role');
  });
});
```

### 3. End-to-End Tests
Test the complete user journey:

```typescript
// e2e/pro-features.spec.ts
import { test, expect } from '@playwright/test';

test('user creation with validation', async ({ page }) => {
  await page.goto('/users/new');

  // Fill invalid data
  await page.fill('[name="email"]', 'invalid-email');
  await page.click('button[type="submit"]');

  // Should show validation error from Zod schema
  await expect(page.locator('.error')).toContainText('Invalid email');

  // Fill valid data
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="name"]', 'John Doe');
  await page.click('button[type="submit"]');

  // Should redirect to users list
  await expect(page).toHaveURL('/users');
});
```

## 📊 Monitoring Your Migration

### 1. Performance Metrics
Monitor the impact of Pro features:

```typescript
// utils/monitoring.ts
export function trackPolicyPerformance() {
  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`Policy validation took ${duration}ms`);

      // Send to analytics
      if (typeof window !== 'undefined') {
        // Client-side tracking
      }
    }
  };
}
```

### 2. Error Tracking
Set up error monitoring for Pro features:

```typescript
// utils/error-tracking.ts
export function trackProError(error: Error, feature: string) {
  console.error(`PZG Pro ${feature} error:`, error);

  // Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Sentry, Bugsnag, etc.
  }
}
```

### 3. Usage Analytics
Track Pro feature adoption:

```typescript
// utils/analytics.ts
export function trackProFeatureUsage(feature: string, action: string) {
  // Track feature usage
  console.log(`PZG Pro feature used: ${feature}.${action}`);

  // Send to analytics service
}
```

## 🚀 Deployment Considerations

### 1. Environment Variables
Ensure license keys are properly set in all environments:

```bash
# Development
export PZG_LICENSE_KEY=pzg_v2_dev_key
export PZG_LICENSE_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAwRNEnFQJgBdNnwvnTTAPySp223shjXfioII2qMkqBFQ=\n-----END PUBLIC KEY-----'

# Staging
export PZG_LICENSE_KEY=pzg_v2_staging_key
export PZG_LICENSE_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAwRNEnFQJgBdNnwvnTTAPySp223shjXfioII2qMkqBFQ=\n-----END PUBLIC KEY-----'

# Production
export PZG_LICENSE_KEY=pzg_v2_prod_key
export PZG_LICENSE_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAwRNEnFQJgBdNnwvnTTAPySp223shjXfioII2qMkqBFQ=\n-----END PUBLIC KEY-----'
```

### 2. Build Process
Update your build scripts to generate Pro features:

```json
{
  "scripts": {
    "build": "pnpm exec prisma generate && next build",
    "generate:pro": "pnpm exec prisma generate",
    "prebuild": "pnpm exec prisma generate"
  }
}
```

### 3. CI/CD Pipeline
Update your deployment pipeline:

```yaml
# Deploy workflow
- name: Generate Pro Features
  env:
    PZG_LICENSE_KEY: ${{ secrets.PZG_LICENSE_KEY }}
    PZG_LICENSE_PUBLIC_KEY: ${{ secrets.PZG_LICENSE_PUBLIC_KEY }}
  run: |
    npm run generate:pro

- name: Build Application
  run: npm run build

- name: Run Tests
  run: npm test
```

## ✅ Post-Migration Checklist

### Immediate (Day 1)
- [ ] License validation works in all environments
- [ ] Generated code compiles without errors
- [ ] Basic functionality works (create, read, update, delete)
- [ ] CI/CD pipeline passes
- [ ] No breaking changes in existing functionality

### Short-term (Week 1)
- [ ] All team members can use Pro features
- [ ] Policies are enforcing correctly
- [ ] Server Actions work in production
- [ ] Drift Guard detects schema changes
- [ ] Error monitoring is set up

### Medium-term (Month 1)
- [ ] Performance is acceptable
- [ ] SDK is being used by external clients
- [ ] Policy violations are logged and monitored
- [ ] Business customers are comfortable with new features
- [ ] Documentation is updated

### Long-term (Quarter 1)
- [ ] ROI is positive (time saved, security improved)
- [ ] Advanced features are being utilized
- [ ] Integration with other tools is working
- [ ] Business plan adopters report productivity gains

## 🐛 Common Migration Issues

### Issue: "Invalid license key"
**Solution**:
- Check license key format and validity
- Ensure environment variable is set correctly
- Verify network connectivity for validation

### Issue: Generated files have import errors
**Solution**:
- Check output paths in configuration
- Ensure TypeScript can resolve imports
- Update tsconfig.json include paths

### Issue: Policies not enforcing
**Solution**:
- Verify policy syntax in schema comments
- Check that policies are being called in code
- Ensure policy context is provided correctly

### Issue: Server Actions not working
**Solution**:
- Install required dependencies (@tanstack/react-query)
- Set up QueryClient provider
- Check Next.js version compatibility

### Issue: CI/CD failures
**Solution**:
- Add license key to CI environment secrets
- Ensure full git history is available (fetch-depth: 0)
- Install all dependencies in CI

## 📞 Getting Help

### Documentation Resources
- [Pro Features Documentation](../features/overview.md)
- [API Reference](../reference/pro-cli.md)
- [Troubleshooting Guide](../reference/troubleshooting.md)

### Community Support
- [GitHub Issues](https://github.com/omar-dulaimi/prisma-zod-generator/issues)
- [Examples Repository](https://github.com/omar-dulaimi/pzg-examples)

### Premium Support
- **Direct Support**: DM [@omardulaimidev on X](https://x.com/omardulaimidev) (Professional, Business, Enterprise)
- **Direct Support**: Available for Business and Enterprise plans
- **Migration Assistance**: Custom migration help available

---

## 🎉 Welcome to PZG Pro!

Congratulations on successfully migrating to PZG Pro! You now have access to:

- **Enhanced Security**: Field-level policies and PII redaction
- **Better DX**: Generated Server Actions and React hooks
- **API Stability**: Schema drift detection and prevention
- **External Integration**: Auto-generated client SDKs
- **Priority Support**: Direct help when you need it

**Next Steps:**
1. Explore advanced Pro features
2. Join our Discord community
3. Share your success story
4. Consider upgrading as your team grows

Happy coding with PZG Pro! 🚀
