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
- ✅ No manifest tracking or cleanup protection
- ❌ **Your files can be deleted without warning**

## Example Output

```bash
# Before (with safety enabled)
❌ ERROR: Unsafe output path detected: Output directory contains project file "package.json"

# After (with safety disabled)  
✅ Generation completed successfully
```

## Alternative: Use Permissive Mode

Instead of completely disabling safety, consider using permissive mode which still provides some protection:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "permissive"  // Warns but doesn't block
  }
}
```

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
    "level": "standard"  // or "strict" for maximum protection
  }
}
```

Or remove the configuration entirely to use defaults.

---

:::tip
Consider using [force dangerous paths](./safety-force-dangerous-path.md) or [custom safety configuration](./safety-custom-configuration.md) instead of completely disabling safety.
:::