# Project Migration Safety Guide

This guide helps you migrate existing projects that may have unsafe generator configurations to use the new safety system.

## Common Migration Scenarios

### Scenario 1: Generator Points to Source Directory

**Before (Unsafe)**:
```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./src"  // Dangerous - points to entire src directory
}
```

**Migration Options**:

#### Option A: Move to Dedicated Directory (Recommended)
```prisma title="schema.prisma"  
generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated"  // Safe dedicated directory
}
```

**Steps**:
1. Update schema.prisma
2. Run generator to create new location
3. Update all imports in your code
4. Delete old generated files from src/
5. Test thoroughly

#### Option B: Use Subdirectory in Source
```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator" 
  output   = "./src/generated"  // Safer subdirectory
}
```

#### Option C: Allow Dangerous Path Temporarily
```prisma title="schema.prisma"
generator zod {
  provider                   = "prisma-zod-generator"
  output                     = "./src"
  safetyAllowDangerousPaths = true  // Temporary workaround
  safetyAllowUserFiles      = true  // What actually unblocks an existing src/
}
```

`safetyAllowDangerousPaths` alone will not get you there: the directory-name check only ever warns. A populated `./src` is blocked by the count of files that look like user code, so you need `safetyAllowUserFiles = true` (or `safetyMaxUserFiles` raised above that count), plus `safetyAllowProjectRoots = true` if `./src` happens to contain a `tsconfig.json`, `README.md` or `.gitignore`.

:::warning
Option C is a temporary solution. Plan to migrate to Option A or B.
:::

### Scenario 2: Generator in Project Root

**Before (Very Unsafe)**:
```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  output   = "."  // Extremely dangerous - project root!
}
```

This configuration is now **blocked by default**. You must migrate:

**Migration (Required)**:
```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./prisma/generated"  // Safe location
}
```

### Scenario 3: Mixed Generated and Source Files

**Before**: Generated files mixed with your code in `src/`

**Migration Strategy**:
1. **Identify Generated Files**: Look for files that match typical generated patterns
2. **Create Manifest**: Use the manifest system to track future generations
3. **Separate Gradually**: Move generated files to dedicated directories

```bash title="Identify generated files"
# Look for common patterns
find src/ -name "*.schema.ts"
find src/ -name "*CreateInput.ts" 
find src/ -name "*WhereInput.ts"
```

```prisma title="New configuration"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./src/generated"

  // Report rather than block while hand-written files are still mixed in
  safetyLevel = "permissive"
}
```

`./src/generated` needs no dangerous-path allowance — only the final path segment is checked, and `generated` is not on the list. `permissive` is here to stop the user-file count from blocking while you are still moving hand-written files out of the new output directory; drop it once the directory holds nothing but generated schemas.

## Migration Strategies

### Strategy 1: Big Bang Migration

Move everything at once:

1. **Backup Project**: Commit all changes
2. **Update Configuration**: Change output path
3. **Run Generator**: Generate in new location
4. **Update Imports**: Use find-and-replace for import paths
5. **Clean Up**: Delete old files
6. **Test**: Verify everything works

Commit before running this.

```bash title="Find and replace imports"
# 1. Dry run: see which files would change (never recurse into node_modules)
grep -rln --include='*.ts' --exclude-dir=node_modules 'from "\./[A-Za-z0-9_]*\.schema"' src/

# 2. Rewrite, capturing the module name instead of re-inserting the whole match
find src -name '*.ts' -not -path '*/node_modules/*' \
  -exec sed -i.bak -E 's|from "\./([A-Za-z0-9_]+\.schema)"|from "../generated/\1"|g' {} +

# 3. Review `git diff`, then delete the .bak files
find src -name '*.ts.bak' -delete
```

:::caution
In a `sed` replacement, `&` inserts the entire match, so a naive `from "../generated/&"` produces nested, invalid import statements. Scope the `find` to `src` as well — a bare `find .` walks into `node_modules` and `sed -i` rewrites in place with no backup.
:::

### Strategy 2: Gradual Migration

Migrate module by module:

1. **Dual Configuration**: Run generator in both old and new locations temporarily
2. **Migrate Modules**: Update imports module by module  
3. **Clean Up Gradually**: Remove old files as you migrate imports
4. **Final Switch**: Once all imports updated, switch to new location only

### Strategy 3: Safety-First Migration

Use safety system to guide migration:

1. **Enable Warnings**: Use `warningsOnly: true` to see issues without blocking
2. **Analyze Warnings**: Understand what files would be affected
3. **Create Migration Plan**: Based on warning analysis
4. **Execute Plan**: Make changes guided by safety feedback

:::note Turn on debug logging first
Safety messages are debug-level, so `warningsOnly: true` on its own produces a completely silent run and it is easy to conclude there are no issues. Run `DEBUG_PRISMA_ZOD=1 npx prisma generate` (or `DEBUG=prisma-zod npx prisma generate`) for every step of this strategy.
:::

## Safety Configuration for Migration

### Phase 1: Assessment

`strict` reports the largest set of issues (`maxUserFiles: 0`, so a single file that looks like user code is flagged) while `warningsOnly` keeps generation from aborting. Run it with `DEBUG_PRISMA_ZOD=1` — otherwise nothing is printed. If the directory already holds a `.prisma-zod-generator-manifest.json` from an earlier run, the user-file check is skipped entirely; delete the manifest first to get a full picture.

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "strict",
    "warningsOnly": true
  }
}
```

### Phase 2: Active Migration

`permissive` already implies `allowDangerousPaths: true`, `allowUserFiles: true` and `warningsOnly: true`; the two explicit lines below are there to document the intent, not to change behaviour.

```json title="zod-generator.config.json"  
{
  "safety": {
    "level": "permissive",
    "allowDangerousPaths": true,
    "allowUserFiles": true
  }
}
```

### Phase 3: Post-Migration

Back to normal safety.

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "standard"
  }
}
```

## Handling Specific Error Messages

:::note
The messages below are debug-log lines, not console output. Run `DEBUG_PRISMA_ZOD=1 npx prisma generate` (or `DEBUG=prisma-zod`) to see them. A blocking error is additionally printed to stderr — but it does not change the exit code, so `prisma generate` reports success while writing no schemas.
:::

### Error: "Output directory contains project file"

```text
Output directory contains project file "package.json". This suggests it's a project root
directory that should not be cleaned automatically.
```

**Solutions**:
1. **Change Output**: Use a subdirectory instead
2. **Override Temporarily**: Set `allowProjectRoots: true` 
3. **Environment Override**: `PRISMA_ZOD_SAFETY_ALLOW_PROJECT_ROOTS=true`

### Error: "Too many potentially user-generated files"

```text
Too many potentially user-generated files (15) found. Maximum allowed: 5. For safety,
automatic cleanup is disabled. Please use a dedicated directory for generated schemas.
```

**Solutions**:
1. **Increase Limit**: Set `maxUserFiles: 20`
2. **Allow User Files**: Set `allowUserFiles: true`
3. **Clean Directory**: Remove non-generated files first
4. **Use Manifest**: Let the system learn what's generated

### Warning: "Common source code directory name"

```text
Output directory "src" is a common source code directory name. Consider using a dedicated
subdirectory like "src/generated" instead.
```

**Solutions**:
1. **Use Subdirectory**: Change to `./src/generated` — only the last path segment is checked, so this silences the message outright
2. **Allow Dangerous**: Set `allowDangerousPaths: true`, which appends "(Allowed by configuration)" to the message
3. **Accept Warning**: This check never blocks generation in either state, so ignoring it is safe

## Import Update Strategies

### Automated Import Updates

```javascript title="update-imports.js"
const fs = require('fs');
const path = require('path');

function updateImports(directory, oldPath, newPath) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const filePath = path.join(directory, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Update relative imports
      content = content.replace(
        new RegExp(`from ['"]${oldPath}`, 'g'),
        `from "${newPath}`
      );
      
      fs.writeFileSync(filePath, content);
    }
  });
}

// Usage
updateImports('./src', './schemas/', '../generated/schemas/');
```

### VSCode Find and Replace

1. Open Find and Replace (Ctrl/Cmd + Shift + H)
2. Enable regex mode
3. Find: `from ['"]\.\/schemas\/`
4. Replace: `from "../generated/schemas/`

### TypeScript-Aware Refactoring

If using VSCode or WebStorm:
1. Rename the generated directory
2. Let the IDE update imports automatically
3. Run TypeScript compiler to catch any missed imports

## Validation After Migration

### Check 1: No TypeScript Errors
```bash
npx tsc --noEmit
```

### Check 2: All Imports Resolved
```bash
npm run build
```

### Check 3: Tests Pass
```bash
npm test
```

### Check 4: No Old Generated Files
```bash
# Look for old generated files in dangerous locations
find src/ -name "*.schema.ts" -not -path "*/generated/*"
```

## Rollback Plan

Always have a rollback plan:

1. **Git Branch**: Create a migration branch
2. **Backup Configuration**: Save old generator config
3. **Document Changes**: Keep notes of what imports were changed
4. **Test Rollback**: Verify you can revert changes

```bash title="Rollback commands"
git checkout main
git reset --hard HEAD~1  # If committed
# OR restore specific files
git checkout HEAD~1 -- schema.prisma src/
```

## Team Coordination

For team projects:

1. **Announce Migration**: Warn team about upcoming changes
2. **Create PR**: Use pull requests for review
3. **Document Process**: Share migration steps with team
4. **Coordinate Timing**: Choose low-activity periods
5. **Support Team**: Be available for migration questions

---

:::info
Migration can be complex, but the safety system is designed to help guide you through the process. Start with permissive settings and gradually tighten them as you clean up your project structure.
:::