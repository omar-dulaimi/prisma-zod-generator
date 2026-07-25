# Force Using Dangerous Paths

This recipe shows how to configure the generator to allow potentially dangerous output paths while keeping basic safety protections.

:::warning
How much protection you keep depends on which method you pick below. Only Method 1 leaves project roots and excessive user files blocking; Methods 2 and 3 turn every check into a report. Use with caution.
:::

## When to Use

- You need to output directly to source directories (e.g., `./src`, `./lib`)
- You have existing projects with schemas in source folders
- You want warnings but not blocking behavior
- You understand the risks but need flexibility

## Configuration Options

### Method 1: Allow Dangerous Paths Only

```json title="zod-generator.config.json"
{
  "safety": {
    "allowDangerousPaths": true
  }
}
```

```prisma title="schema.prisma"
generator zod {
  provider                    = "prisma-zod-generator"
  output                      = "./src"
  safetyAllowDangerousPaths  = true
}
```

`allowDangerousPaths` on its own is rarely enough. To actually generate into an existing `./src` you also need `allowUserFiles: true` (or `maxUserFiles` raised above the number of non-generated files already sitting there), because the user-file count — not the directory name — is what blocks. Add `allowProjectRoots: true` as well if that directory contains any of `package.json`, `tsconfig.json`, `next.config.js`, `vite.config.js`, `webpack.config.js`, `rollup.config.js`, `.gitignore` or `README.md`.

### Method 2: Permissive Mode (Recommended)

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "permissive"
  }
}
```

```prisma title="schema.prisma"
generator zod {
  provider    = "prisma-zod-generator"
  output      = "./src"
  safetyLevel = "permissive"
}
```

### Method 3: Warnings Only

```json title="zod-generator.config.json"
{
  "safety": {
    "warningsOnly": true
  }
}
```

## What Each Approach Does

:::note These messages are debug-level
Every warning below is written through the debug logger, so a plain `prisma generate` shows none of them. Run `DEBUG_PRISMA_ZOD=1 npx prisma generate` (or `DEBUG=prisma-zod npx prisma generate`) to see them.
:::

### Allow Dangerous Paths Only
- ⚠️  Only downgrades the "common source code directory name" message to "(Allowed by configuration)" — that check was always warn-only, so this flag does not unblock anything by itself
- ⚠️  Still warns about user files if no manifest exists
- ❌ Still blocks when the user-file count exceeds `maxUserFiles` (5 at the `standard` preset)
- ❌ Still blocks project root directories (with `package.json`)
- ✅ Maintains manifest tracking and smart cleanup

### Permissive Mode
- ✅ Allows dangerous paths with warnings
- ✅ Allows user files (with warnings)
- ⚠️  Project roots (directories containing `package.json`, `tsconfig.json`, …) are reported but **not** blocked — `permissive` implies `warningsOnly: true`, so nothing blocks
- ✅ Only shows warnings, never blocks generation
- ✅ Full manifest tracking

If you want dangerous paths allowed while project roots still hard-block, use `level: "standard"` with `allowDangerousPaths: true` and `allowUserFiles: true` rather than `permissive`.

### Warnings Only
- ⚠️  Shows warnings for all safety issues
- ✅ Never blocks generation
- ✅ Maintains all safety checks — they just report instead of blocking
- ✅ Full manifest tracking

## Example Scenarios

### Scenario 1: Existing Project with Schemas in src/

```prisma title="schema.prisma"
generator zod {
  provider                   = "prisma-zod-generator"
  output                     = "./src/schemas"
  safetyAllowDangerousPaths = true
}
```

**Result**: 
- ✅ Generates to `src/schemas/` 
- ✅ No dangerous-path message at all — only the last path segment is checked, and `schemas` is not on the list, so the flag is redundant here
- ✅ Manifest tracking keeps cleanup to the files this generator wrote inside `src/schemas/`

### Scenario 2: Component-Colocated Schemas

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "permissive",
    "customDangerousPaths": ["components"]
  }
}
```

```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./components/schemas"
}
```

**Result**:
- ✅ Generates to `components/schemas/`
- ✅ Nothing blocks — and because only the last path segment is checked, adding `components` to `customDangerousPaths` has no effect on a `components/schemas` output either
- ✅ Your existing components remain safe

## Still Protected Against

With `allowDangerousPaths: true` on top of the default `standard` level, you're still protected from:

- **Project root directories** - Directories with `package.json`, `tsconfig.json` etc.
- **Too many user files** - If the manifest is missing and more than `maxUserFiles` user files exist

Neither of those protections survives `level: "permissive"` or `warningsOnly: true`, both of which turn every blocking check into a report.

## Environment Variable Override

You can temporarily allow dangerous paths via environment variables:

```bash
PRISMA_ZOD_SAFETY_ALLOW_DANGEROUS_PATHS=true npx prisma generate
```

## Safety Progression

Here's a recommended progression from safest to most permissive:

### 1. Default (Safest)

This is the default, so an empty `safety` block behaves identically.

```json
{
  "safety": {
    "level": "standard"
  }
}
```

### 2. Allow Your Specific Dangerous Path
```json
{
  "safety": {
    "allowDangerousPaths": true
  }
}
```

### 3. Permissive Mode
```json
{
  "safety": {
    "level": "permissive"
  }
}
```

### 4. Warnings Only
```json
{
  "safety": {
    "warningsOnly": true
  }
}
```

### 5. Disabled (Most Dangerous)
```json
{
  "safety": {
    "enabled": false
  }
}
```

## Best Practices

1. **Start Conservative**: Begin with `allowDangerousPaths: true` rather than disabling safety entirely

2. **Use Specific Paths**: Instead of outputting to `./src`, use `./src/generated` or `./src/schemas`

3. **Monitor Warnings**: Warnings guide you toward safer configurations, but they are debug-level — run `DEBUG_PRISMA_ZOD=1 npx prisma generate` (or `DEBUG=prisma-zod`) or you will see nothing

4. **Backup First**: Always commit your changes before running generation with relaxed safety

5. **Review Manifest**: Check the `.prisma-zod-generator-manifest.json` file to understand what will be cleaned up — its `files` entries are paths relative to the output directory, and it is not written at all when `skipManifest` is set

## Migration Strategy

If you're migrating from a setup that pointed to dangerous paths:

```prisma title="Before (dangerous)"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./src"
}
```

```prisma title="After (safer, but compatible)"
generator zod {
  provider                   = "prisma-zod-generator"
  output                     = "./src/generated"  // Dedicated subdirectory
  safetyAllowDangerousPaths = false              // Can remove this line
}
```

Then update your imports:
```typescript
// Before
import { UserSchema } from './User.schema';

// After  
import { UserSchema } from './generated/User.schema';
```

---

:::info
A dedicated subdirectory plus `level: "standard"` gives the best balance: you can live inside a source tree while project roots and stray user files still hard-block. Reach for `permissive` or `warningsOnly` only when you accept that nothing will block.
:::