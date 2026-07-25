# Disable Safety System Completely

This recipe shows how to completely disable the safety system that protects against dangerous output paths.

:::danger
Only disable safety checks if you fully understand the risks. The safety system prevents accidental deletion of your source code. Use this configuration with extreme caution.
:::

## When to Use

- You're an experienced user who fully understands the implications
- You have robust backup and version control practices
- You're using the generator in automated environments with careful path management
- You need to temporarily bypass safety for migration purposes

## Configuration

### Method 1: Config File

```json title="zod-generator.config.json"
{
  "safety": {
    "enabled": false
  }
}
```

### Method 2: Prisma Generator Block

```prisma title="schema.prisma"
generator zod {
  provider      = "prisma-zod-generator"
  output        = "./src"  // Now allowed (dangerous!)
  safetyEnabled = false
}
```

### Method 3: Environment Variable

```bash title=".env"
PRISMA_ZOD_SAFETY_ENABLED=false
```

```bash title="Command line"
PRISMA_ZOD_SAFETY_ENABLED=false npx prisma generate
```

## What This Does

With safety disabled:

- ✅ All output paths are allowed, including dangerous ones
- ✅ No warnings or errors about path safety
- ✅ No manifest tracking — `enabled: false` also forces `skipManifest`, so no cleanup runs at all and schemas for models you later remove are left behind
- ❌ **Your files can be overwritten without warning** — generated files are written straight over anything of the same name, and in single-file mode the post-flush pass still empties the bundle's directory regardless of safety settings

## Example Output

```text
# Before (with safety enabled) — printed to stderr; prisma generate still exits 0, but no schemas are written
Error: Unsafe output path detected: Output directory contains project file "package.json". This
suggests it's a project root directory that should not be cleaned automatically.

To resolve this issue:
1. Use a dedicated directory for generated schemas (e.g., "./generated" or "./src/generated")
...

# After (with safety disabled) — no safety output at all; schemas are written
```

## Alternative: Use Permissive Mode

Instead of completely disabling safety, consider using permissive mode. It keeps the manifest and cleanup working — which `enabled: false` does not — and still reports every problem it finds, though it blocks nothing:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "permissive"
  }
}
```

If you want some checks to keep blocking, stay on `level: "standard"` and relax only what you need: `allowDangerousPaths: true` leaves both the project-root and user-file blocks intact, and `allowUserFiles: true` drops the user-file block while project roots still hard-block.

## Safety Recommendations

If you disable safety:

1. **Always use version control** - Commit your changes before running the generator
2. **Use specific paths** - Point to dedicated directories, not source roots
3. **Test carefully** - Run on a copy of your project first
4. **Re-enable when possible** - Turn safety back on once you've restructured

## Re-enabling Safety

To re-enable safety later:

```json title="zod-generator.config.json"
{
  "safety": {
    "enabled": true,
    "level": "standard"
  }
}
```

Use `"strict"` instead of `"standard"` for maximum protection, or remove the configuration entirely to use defaults.

---

:::tip
Consider using [force dangerous paths](./safety-force-dangerous-path.md) or [custom safety configuration](./safety-custom-configuration.md) instead of completely disabling safety.
:::