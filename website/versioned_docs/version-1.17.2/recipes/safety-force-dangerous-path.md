# Force Using Dangerous Paths

This recipe shows how to configure the generator to allow potentially dangerous output paths while keeping basic safety protections.

:::warning
This configuration allows dangerous paths but still protects against the worst scenarios like project root directories. Use with caution.
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

### Allow Dangerous Paths Only
- ✅ Allows `src`, `lib`, `components` etc. directories
- ⚠️  Still warns about user files if no manifest exists
- ❌ Still blocks project root directories (with `package.json`)
- ✅ Maintains manifest tracking and smart cleanup

### Permissive Mode
- ✅ Allows dangerous paths with warnings
- ✅ Allows user files (with warnings)
- ❌ Still blocks project roots (safer)
- ✅ Only shows warnings, never blocks generation
- ✅ Full manifest tracking

### Warnings Only
- ⚠️  Shows warnings for all safety issues
- ✅ Never blocks generation
- ✅ Maintains all safety protections except blocking
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
- ⚠️  Warning about "src" being dangerous
- ✅ Manifest tracking prevents deleting your other `src/` files

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
- ⚠️  Warnings but no blocking
- ✅ Your existing components remain safe

## Still Protected Against

Even with dangerous paths allowed, you're still protected from:

- **Project root directories** - Directories with `package.json`, `tsconfig.json` etc.
- **Too many user files** - If manifest is missing and many user files exist
- **Complete chaos** - Basic sanity checks remain active

## Environment Variable Override

You can temporarily allow dangerous paths via environment variables:

```bash
PRISMA_ZOD_SAFETY_ALLOW_DANGEROUS_PATHS=true npx prisma generate
```

## Safety Progression

Here's a recommended progression from safest to most permissive:

### 1. Default (Safest)
```json
{
  "safety": {
    "level": "standard"  // Default
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

3. **Monitor Warnings**: Pay attention to warning messages - they guide you toward safer configurations

4. **Backup First**: Always commit your changes before running generation with relaxed safety

5. **Review Manifest**: Check the `.prisma-zod-generator-manifest.json` file to understand what will be cleaned up

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
This approach provides a good balance between safety and flexibility. You get protection against the worst scenarios while still being able to use source directories when necessary.
:::