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
  safetyAllowDangerousPaths = true  # Temporary workaround
}
```

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
  
  # Allow the dangerous src path temporarily during migration
  safetyLevel = "permissive"
}
```

## Migration Strategies

### Strategy 1: Big Bang Migration

Move everything at once:

1. **Backup Project**: Commit all changes
2. **Update Configuration**: Change output path
3. **Run Generator**: Generate in new location
4. **Update Imports**: Use find-and-replace for import paths
5. **Clean Up**: Delete old files
6. **Test**: Verify everything works

```bash title="Find and replace imports"
# Example: Update imports from src/ to generated/
find . -name "*.ts" -exec sed -i 's|from "\.\/.*\.schema"|from "../generated/&"|g' {} \;
```

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

## Safety Configuration for Migration

### Phase 1: Assessment
```json title="zod-generator.config.json"
{
  "safety": {
    "level": "strict",
    "warningsOnly": true  // See all issues without blocking
  }
}
```

### Phase 2: Active Migration
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
```json title="zod-generator.config.json"
{
  "safety": {
    "level": "standard"  // Return to normal safety
  }
}
```

## Handling Specific Error Messages

### Error: "Output directory contains project file"

```
❌ Output directory contains project file "package.json"
```

**Solutions**:
1. **Change Output**: Use a subdirectory instead
2. **Override Temporarily**: Set `allowProjectRoots: true` 
3. **Environment Override**: `PRISMA_ZOD_SAFETY_ALLOW_PROJECT_ROOTS=true`

### Error: "Too many potentially user-generated files"

```
❌ Too many potentially user-generated files (15) found. Maximum allowed: 5.
```

**Solutions**:
1. **Increase Limit**: Set `maxUserFiles: 20`
2. **Allow User Files**: Set `allowUserFiles: true`
3. **Clean Directory**: Remove non-generated files first
4. **Use Manifest**: Let the system learn what's generated

### Warning: "Common source code directory name"

```  
⚠️ Output directory "src" is a common source code directory name
```

**Solutions**:
1. **Use Subdirectory**: Change to `./src/generated`
2. **Allow Dangerous**: Set `allowDangerousPaths: true`
3. **Accept Warning**: Warnings don't block generation

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