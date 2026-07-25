---
id: troubleshooting
title: Troubleshooting
---

# Troubleshooting

Common issues, solutions, and debugging tips. The first section covers the free generator; everything after it is specific to PZG Pro features.

## 🧩 Core Generator Issues

Most symptoms below were fixed in a released version — check your installed version first (`npm ls prisma-zod-generator`) and upgrade before filing a report.

### `TS2835: Relative import paths need explicit file extensions in ECMAScript imports`

**Cause**: `moduleResolution: "nodenext"` — or Node's native TypeScript type-stripping — requires explicit extensions on relative ESM imports.

**Fix**: no zod-generator option is needed. Set `moduleFormat = "esm"` and `importFileExtension = "js"` (or `"ts"`) on your `prisma-client` generator block, and every relative import the zod generator emits inherits the extension. See [NodeNext / Native TypeScript Imports](../recipes/nodenext-imports.md).

### Smart cleanup deleted my Prisma client output

**Symptom**: pointing the `prisma-client` generator and the zod generator at the same `output` directory, then running `prisma generate`, removed `client.ts` / `models.ts` / `enums.ts`.

**Fix**: upgrade to **2.1.5+**. Smart cleanup now skips Prisma's own client generator files unconditionally ([#365](https://github.com/omar-dulaimi/prisma-zod-generator/issues/365)). See [Shared Output Directories](./safety-system.md#shared-output-directories). On older versions, give each generator its own `output` directory.

### `@zod` annotations rejected or dropped

**Symptoms**: object-form error messages such as `.min(1, { message: "x" })` are filtered out, or a leading base-type token like `.string()` errors.

**Fix**: upgrade to **2.1.6+** ([#374](https://github.com/omar-dulaimi/prisma-zod-generator/issues/374)). Note that any annotation that still fails validation is reported as `Some @zod annotations were invalid and filtered out:` — see [Logging & Debug Output](./logging-debug.md#warning-categories).

### Generated schemas crash at import time under Zod v4

**Symptom**: importing the generated index throws immediately when a getter-based recursive schema is combined with an optional field.

**Fix**: upgrade to **2.1.6+** ([#377](https://github.com/omar-dulaimi/prisma-zod-generator/issues/377)).

### Decimal schemas fail to bundle for the browser

**Symptom**: bundling generated schemas into client-side code pulls in a server-only Prisma entry point.

**Fix**: upgrade to **2.1.6+** — Decimal schemas now import the browser-safe `prisma-client` entry ([#367](https://github.com/omar-dulaimi/prisma-zod-generator/issues/367)).

### A model whose name ends in `Raw` generates the wrong operations

**Symptom**: a model such as `AuditRaw` is treated as a MongoDB raw operation and its CRUD schemas are missing or malformed.

**Fix**: upgrade to **2.1.6+** ([#382](https://github.com/omar-dulaimi/prisma-zod-generator/issues/382)).

### `noUnusedLocals` errors on generated files

**Symptom**: `'Prisma' is declared but its value is never read` in generated schema files.

**Fix**: upgrade to **2.1.6+** — unused `Prisma` type imports are no longer emitted ([#378](https://github.com/omar-dulaimi/prisma-zod-generator/issues/378)).

### `dateTimeStrategy` ignored in variant files

**Symptom**: the configured DateTime strategy applies to the main schemas but not to split or array-based variant files.

**Fix**: upgrade to **2.1.6+** ([#368](https://github.com/omar-dulaimi/prisma-zod-generator/issues/368)).

### `AggregateArgs` type name has the wrong casing

**Symptom**: TypeScript cannot resolve the aggregate args type for models with lowercase or snake_case names.

**Fix**: upgrade to **2.1.6+** ([#391](https://github.com/omar-dulaimi/prisma-zod-generator/issues/391)).

### `@zod.import` modules missing in single-file mode

**Symptom**: with `useMultipleFiles: false`, external imports declared via `@zod.import([...])` are stripped and the bundled file does not compile.

**Fix**: upgrade to **2.3.3+** — custom imports are hoisted into the bundle ([#335](https://github.com/omar-dulaimi/prisma-zod-generator/issues/335)).

### Field `@default` values look wrong in pure models

**Symptoms**: a `BigInt` default emitted as a bare number, a `DateTime` default as a string, a `Decimal` default unwrapped, or a Bytes default swallowed by the base64 validation chain.

**Fix**: upgrade to **2.1.5+** for `new Prisma.Decimal(...)` wrapping ([#372](https://github.com/omar-dulaimi/prisma-zod-generator/issues/372)), **2.1.6+** for `BigInt("...")` / `new Date("...")` constructors and parsed Json defaults ([#373](https://github.com/omar-dulaimi/prisma-zod-generator/issues/373)), and **2.1.7+** for Bytes defaults appended after the validation chain ([#394](https://github.com/omar-dulaimi/prisma-zod-generator/issues/394)). See [Bytes & JSON Details](./bytes-json.md).

## 🔑 License Issues

:::note
License validation is fully offline — an Ed25519 signature check over a self-contained license payload. No network request is made. A successful check is cached at `~/.cache/pzg/license.json` for 30 days, on every plan.
:::

### Invalid License Key Error
```
❌ Invalid PZG Pro license key. Please check your license key.
```

**Causes & Solutions:**
1. **Expired License**: Check expiration date with `npx prisma-zod-generator license-check`
2. **Wrong Environment Variable**: Ensure `PZG_LICENSE_KEY` is set correctly
3. **Corrupted Key**: Re-copy your license key from the purchase email
4. **Public Key Mismatch**: Verification uses `PZG_LICENSE_PUBLIC_KEY` when it is set, otherwise a built-in default key. If you were issued a non-default key and the variable is unset or malformed, the signature check fails and the license reads as invalid.

**Debugging Steps:**
```bash
# Check if license key is set
echo $PZG_LICENSE_KEY

# Validate license
npx prisma-zod-generator license-check

# Test with verbose output
DEBUG_PRISMA_ZOD=1 npx prisma-zod-generator license-check
```

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
DEBUG_PRISMA_ZOD=1 pnpm exec prisma generate

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
1. **Whitelist the change**: pass the identifier from the report — repeatable:
   ```bash
   npx pzg-pro guard --allowed-break User.email:field_removed --allowed-break Post.slug:field_removed
   ```
   Identifiers are `<Model>.<field>:<change>` for field-level changes and `<Model>:<change>` otherwise.
2. **Inspect the raw diff**: `npx pzg-pro guard --format json` and check each change's `type` (`breaking` / `non-breaking`), `category`, and `severity`.
3. **Adjust gating**: `--strict` is what makes the command fail on remaining breaking changes; without it the report is printed and the command exits 0.

Drift Guard has no field-exclusion or threshold configuration — `--allowed-break` is the supported override. See [Pro CLI & API](./pro-cli.md#pzg-pro-guard).

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
2. **Filter Models**: Disable the models you don't need in your JSON config. Models are enabled by default, so listing some does **not** exclude the rest:
   ```json
   { "models": { "AuditLog": { "enabled": false } } }
   ```
3. **Warm Node Modules**: Run `pnpm exec prisma generate` after dependencies are installed to avoid repeated cold starts.

See [Performance & Build Tips](../performance.md) for the full list.

### TypeScript Compilation Errors
**Common Issues:**
1. **Missing Types**: Install `@types/*` packages
2. **Version Conflicts**: Check TypeScript version compatibility
3. **Module Resolution**: Configure `tsconfig.json`

**Recommended tsconfig.json settings (bundler-style resolution):**
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

`nodenext` and Node's native TypeScript support are equally supported — see [`TS2835`](#ts2835-relative-import-paths-need-explicit-file-extensions-in-ecmascript-imports) above.

## 🐛 Debug Mode

### Enable Verbose Logging
```bash
# Verbose generator logging
DEBUG_PRISMA_ZOD=1 pnpm exec prisma generate

# Equivalent
DEBUG=prisma-zod pnpm exec prisma generate

# Capture to a file
DEBUG_PRISMA_ZOD=1 pnpm exec prisma generate 2> debug.log

# License validation
DEBUG_PRISMA_ZOD=1 npx prisma-zod-generator license-check
```

:::note
There are no module-scoped debug namespaces — `DEBUG_PRISMA_ZOD=1` enables all generator debug output, and any other `DEBUG` value leaves it off. See [Logging & Debug Output](./logging-debug.md).
:::

## 📞 Getting Help

### Before Reaching Out
1. **Check License Status**: `npx prisma-zod-generator license-check`
2. **Update to Latest**: `npm install -D prisma-zod-generator@latest`
3. **Clear License Cache**: `rm -rf ~/.cache/pzg` (the cache is `~/.cache/pzg/license.json`, valid for 30 days)
4. **Review Logs**: Enable debug mode and check output

### Support Channels
- **GitHub Issues**: [Bug reports and feature requests](https://github.com/omar-dulaimi/prisma-zod-generator/issues)
- **Direct Support**: DM [@omardulaimidev on X](https://x.com/omardulaimidev) (Professional+ customers)

### Issue Template
When reporting issues, include:

````markdown
**PZG Version**: (output of `npm ls prisma-zod-generator`, e.g. 2.3.3)
**Prisma Version**: (e.g. 7.x)
**Zod Version**: (e.g. 4.x)
**Node Version**: (e.g. 20.19.0)
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
DEBUG_PRISMA_ZOD=1 pnpm exec prisma generate
[paste output]
```

**Configuration**:
```
[paste generator pzgPro block or the JSON referenced by configPath]
```
````

---

**Need immediate help?** Reach out via the direct support channel above for Professional+ customers.
