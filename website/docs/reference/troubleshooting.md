---
id: troubleshooting
title: Troubleshooting
---

# PZG Pro Troubleshooting Guide

Common issues, solutions, and debugging tips for PZG Pro features.

## 🔑 License Issues

### Invalid License Key Error
```
❌ Invalid PZG Pro license key. Please check your license key.
```

**Causes & Solutions:**
1. **Expired License**: Check expiration date with `npx prisma-zod-generator license-check`
2. **Wrong Environment Variable**: Ensure `PZG_LICENSE_KEY` is set correctly
3. **Corrupted Key**: Re-copy your license key from the purchase email
4. **Network Issues**: License validation requires internet connection

**Debugging Steps:**
```bash
# Check if license key is set
echo $PZG_LICENSE_KEY

# Validate license
npx prisma-zod-generator license-check

# Test with verbose output
DEBUG=pzg-pro:license npx prisma-zod-generator license-check
```

### License Validation Timeout
```
❌ License validation failed: Network timeout
```

**Solutions:**
1. Check internet connection
2. Configure corporate proxy if needed
3. Use offline cache mode (Enterprise feature)

### Code Tampering Warning
```
❌ PZG Pro code tampering detected. Pro features have been modified.
```

**Why it happens:** Integrity checks detected edits to the obfuscated Pro bundle (or the `src/pro` submodule).

**Fix:** Reinstall the published package (`pnpm install prisma-zod-generator@latest`) or reset the `src/pro` submodule to its shipped commit. Extend functionality via documented APIs instead of modifying bundled code.

## 🛡️ Policies & Redaction

### Policy Comments Not Recognized
**Symptom**: Policy annotations in schema comments are ignored

**Common Causes:**
1. **Wrong Comment Format**: Must use `/// @policy` or `/// @pii`
2. **Inline Comments**: Use separate comment lines, not inline with field
3. **Syntax Errors**: Check policy expression syntax

**Examples:**
```prisma
// ❌ Wrong: inline comment
model User {
  email String /// @pii email redact:logs  // This won't work
}

// ✅ Correct: separate line
model User {
  /// @pii email redact:logs
  email String
}

// ✅ Also correct: above field
model User {
  /// @policy read:role in ["admin"]
  /// @pii email mask:partial
  email String
}
```

### Policy Validation Errors
**Symptom**: Runtime errors when policies are applied

**Debugging:**
```bash
# Generate with debug output
DEBUG=pzg-pro:policies pnpm exec prisma generate

# Check generated policy files
ls prisma/generated/pro/policies/
cat prisma/generated/pro/policies/user.ts
```

### PII Redaction Not Working
**Check Configuration:** Add these keys to the `policies` JSON config (either inline in `schema.prisma` or the file referenced via `configPath`):
```json
{
  "enableRedaction": true,
  "piiFields": ["email", "phone", "ssn"]
}
```

## ⚡ Server Actions

### Server Action Import Errors
**Symptom**: Cannot resolve imports in generated actions

**Common Issues:**
1. **Wrong Output Path**: Check `serverActions.outputPath` in config
2. **Missing Dependencies**: Install required packages
3. **TypeScript Errors**: Run type check

**Solutions:**
```bash
# Install missing dependencies
npm install @tanstack/react-query next zod

# Check TypeScript errors
npx tsc --noEmit

# Regenerate after updating generator config
# serverActions = "{ \"outputPath\": \"./src/server\" }"
pnpm exec prisma generate
```

### React Hook Errors
**Symptom**: Hooks not working in components

**Requirements:**
```tsx
// ❌ Missing providers
function App() {
  return <CreateUserForm />;  // Hook will fail
}

// ✅ With providers
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CreateUserForm />
    </QueryClientProvider>
  );
}
```

### "use server" Directive Missing
**Solution**: Regenerate server actions with latest version
```bash
rm -rf prisma/generated/pro/server-actions
pnpm exec prisma generate
```

## 📦 SDK Publisher

### SDK Build Failures
**Common Issues:**
1. **Missing TypeScript**: SDK requires TypeScript in target project
2. **Zod Version Mismatch**: Ensure compatible Zod versions
3. **Module Resolution**: Check package.json module settings

**Debug Steps:**
```bash
# Check generated SDK structure
ls packages/sdk/
cat packages/sdk/package.json

# Build manually
cd packages/sdk
npm run build

# Check for TypeScript errors
npm run type-check
```

### SDK Import Errors
**Symptom**: Cannot import generated SDK in client code

**Solutions:**
```bash
# Link for local development
cd packages/sdk
npm link

# In your client project
npm link @your-org/api-sdk

# Or publish to registry
cd packages/sdk
npm publish
```

## 🚨 Drift Guard

### CI Integration Issues
**Symptom**: Drift Guard workflow fails in GitHub Actions

**Common Issues:**
1. **Missing License**: Add `PZG_LICENSE_KEY` to GitHub Secrets
2. **Git Depth**: Need full git history for comparison
3. **Missing Dependencies**: Install PZG Pro in CI

**Working Workflow:**
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Important: full history

- name: Install dependencies
  run: npm ci

- name: Run Drift Guard
  env:
    PZG_LICENSE_KEY: ${{ secrets.PZG_LICENSE_KEY }}
  run: npx pzg-pro guard --schema=./prisma/schema.prisma --base origin/main --head HEAD --format github
```

### False Positive Breaking Changes
**Symptom**: Safe changes reported as breaking

**Solutions:**
1. **Update Config**: Exclude non-breaking fields
2. **Custom Rules**: Configure breaking change detection
3. **Manual Override**: Use repeated `--allowed-break <identifier>` flags for known migrations

```json
{
  "pro": {
    "driftGuard": {
      "excludeFields": ["createdAt", "updatedAt", "version"],
      "breakingChangeThreshold": "minor"
    }
  }
}
```

## 🏗️ General Issues

### Drift Guard Fails to Read Base Schema
**Symptom**: `fatal: path 'prisma/schema.prisma' does not exist in 'origin/main'`

- Ensure the workflow fetches full history (`fetch-depth: 0`).
- Confirm the `--base` ref contains the schema file.
- If the file moved, point Drift Guard at the new path via `--schema`.

### Out of Memory Errors
**Symptom**: Node.js heap out of memory during generation

**Solutions:**
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm exec prisma generate
```

### Slow Generation Performance
**Optimization Tips:**
1. **Limit Enabled Packs**: Disable `enable*` flags you don't need for the current run.
2. **Filter Models**: Use your existing generator filtering (e.g., `models = ["User","Post"]`) to skip unused models.
3. **Warm Node Modules**: Run `pnpm exec prisma generate` after dependencies are installed to avoid repeated cold starts.

### TypeScript Compilation Errors
**Common Issues:**
1. **Missing Types**: Install `@types/*` packages
2. **Version Conflicts**: Check TypeScript version compatibility
3. **Module Resolution**: Configure `tsconfig.json`

**Required tsconfig.json settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "generated/**/*",
    "src/**/*"
  ]
}
```

## 🐛 Debug Mode

### Enable Verbose Logging
```bash
# Global debug
DEBUG=pzg-pro:* pnpm exec prisma generate

# Specific modules
DEBUG=pzg-pro:license,pzg-pro:policies pnpm exec prisma generate

# File output
DEBUG=pzg-pro:* pnpm exec prisma generate 2> debug.log
```

### Common Debug Patterns
```bash
# License validation
DEBUG=pzg-pro:license npx prisma-zod-generator license-check

# Comment parsing
DEBUG=pzg-pro:parser pnpm exec prisma generate

# Code generation
DEBUG=pzg-pro:codegen pnpm exec prisma generate
```

## 📞 Getting Help

### Before Reaching Out
1. **Check License Status**: `npx prisma-zod-generator license-check`
2. **Update to Latest**: `npm install -D prisma-zod-generator@latest`
3. **Clear Cache**: `rm -rf node_modules/.cache/pzg`
4. **Review Logs**: Enable debug mode and check output

### Support Channels
- **GitHub Issues**: [Bug reports and feature requests](https://github.com/omar-dulaimi/prisma-zod-generator/issues)
- **Direct Support**: DM [@omardulaimidev on X](https://x.com/omardulaimidev) (Professional+ customers)

### Issue Template
When reporting issues, include:

```
**PZG Version**: 1.21.8
**Node Version**: 20.10.0
**License Plan**: Pro
**Feature**: Policies & Redaction

**Issue Description**:
[Describe the problem]

**Steps to Reproduce**:
1. Set up schema with...
2. Run command...
3. See error...

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Debug Output**:
```
DEBUG=pzg-pro:* pnpm exec prisma generate
[paste output]
```

**Configuration**:
```json
[paste generator pzgPro block or the JSON referenced by configPath]
```
```

---

**Need immediate help?** Reach out via the direct support channel above for Professional+ customers.
