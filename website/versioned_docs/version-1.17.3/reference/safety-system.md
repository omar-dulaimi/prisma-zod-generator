# Safety System

The prisma-zod-generator includes a comprehensive safety system that protects your source code from accidental deletion when using custom output paths.

:::tip
This safety system was introduced to solve [Issue #71](https://github.com/omar-dulaimi/prisma-zod-generator/issues/71) - a critical bug where the generator could delete entire directories containing user source code.
:::

## Overview

Prior to the safety system, the generator would delete **all contents** of the output directory before generating new schemas. This created a dangerous situation where users could accidentally lose their work by pointing the output to directories containing their source code.

```prisma title="schema.prisma - DANGEROUS (without safety system)"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./src"  // ⚠️ This would delete all files in src/
}
```

## How It Works

The safety system uses a **hybrid manifest-based approach** with multiple layers of protection:

### 1. Path Validation

The system analyzes output paths for common patterns that suggest user source code:

#### ⚠️ Warned Paths (Common Source Directories)
- `src` - Source code directory
- `lib` - Library code
- `components` - React/Vue components  
- `pages` - Next.js pages
- `app` - Application code
- `utils` - Utility functions
- `hooks` - React hooks
- `services` - Service layer code
- `api` - API endpoints

#### ❌ Blocked Paths (Project Directories)
Any directory containing these files is **completely blocked**:
- `package.json` - Node.js project
- `tsconfig.json` - TypeScript project
- `next.config.js` - Next.js project
- `vite.config.js` - Vite project
- `webpack.config.js` - Webpack project
- `rollup.config.js` - Rollup project
- `.gitignore` - Git repository
- `README.md` - Project documentation

### 2. Manifest Tracking

The generator creates and maintains a manifest file (`.prisma-zod-generator-manifest.json`) that tracks exactly which files and directories it creates:

```json title=".prisma-zod-generator-manifest.json"
{
  "version": "1.0",
  "generatorVersion": "1.16.6",
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "outputPath": "/path/to/output",
  "files": [
    "User.schema.ts",
    "Post.schema.ts",
    "enums/Role.ts"
  ],
  "directories": [
    "enums",
    "objects"
  ]
}
```

### 3. Smart Cleanup

#### First Run (No Manifest)
Uses pattern detection to identify likely generated files:
- Analyzes file content for generator signatures
- Only removes files that contain generated code patterns
- Preserves files that don't match generator signatures

#### Subsequent Runs (With Manifest)
Uses precise manifest-based cleanup:
- Only removes files listed in the previous manifest
- Only removes directories that were created by the generator
- Never touches files not tracked in the manifest

### 4. Content Analysis

The system analyzes existing files to determine if they're user-generated:
- Checks file extensions (`.ts`, `.js`, `.tsx`, `.jsx`, etc.)
- Counts suspicious files that look like user code
- Blocks generation if too many user files are found (> 5 files)

## Safety Messages

### Warning Messages

When potentially risky paths are detected, you'll see helpful warnings:

```bash
⚠️  WARNING: Output directory "src" is a common source code directory name. 
Consider using a dedicated subdirectory like "src/generated" instead.

⚠️  WARNING: Output directory contains 3 files that may be user code: 
auth.service.ts, user.model.ts, config.ts. 
No manifest file found from previous generator runs.
```

### Error Messages  

For dangerous configurations, generation is blocked with clear guidance:

```bash
❌ ERROR: Unsafe output path detected: Output directory contains project file "package.json".

To resolve this issue:
1. Use a dedicated directory for generated schemas (e.g., "./generated" or "./src/generated")
2. Or use a subdirectory within your source folder (e.g., "./src/zod-schemas")  
3. Avoid pointing directly to directories containing your source code

This safety check prevents accidental deletion of your work.
```

## Configuration Options

The safety system can be configured to match your project's needs. You can control safety behavior through configuration files, generator options, or environment variables.

### Safety Levels

Quick configuration using preset levels:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "strict"    // strict | standard | permissive | disabled
  }
}
```

```prisma title="schema.prisma"
generator zod {
  provider    = "prisma-zod-generator"
  safetyLevel = "permissive"
}
```

**Available levels:**
- **`strict`** - Maximum protection, blocks even small numbers of user files
- **`standard`** - Balanced protection (default)
- **`permissive`** - Warnings-heavy, minimal blocking
- **`disabled`** - No safety checks (⚠️ dangerous)

### Granular Controls

For fine-tuned control, use individual safety options:

```json title="zod-generator.config.json"
{
  "safety": {
    "enabled": true,
    "allowDangerousPaths": false,
    "allowProjectRoots": false, 
    "allowUserFiles": false,
    "skipManifest": false,
    "warningsOnly": false,
    "maxUserFiles": 5,
    "customDangerousPaths": ["modules", "widgets"],
    "customProjectFiles": ["custom.config.js"]
  }
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for all safety features |
| `allowDangerousPaths` | boolean | `false` | Allow common source directories (src, lib, etc.) |
| `allowProjectRoots` | boolean | `false` | Allow directories with project files (package.json, etc.) |
| `allowUserFiles` | boolean | `false` | Allow directories containing user files |
| `skipManifest` | boolean | `false` | Disable manifest tracking and cleanup |
| `warningsOnly` | boolean | `false` | Convert all errors to warnings (never block) |
| `maxUserFiles` | number | `5` | Maximum user files allowed before blocking |
| `customDangerousPaths` | string[] | `[]` | Additional dangerous directory patterns |
| `customProjectFiles` | string[] | `[]` | Additional project file patterns |

### Configuration Methods

#### Method 1: Config File (Recommended)

```json title="zod-generator.config.json"
{
  "output": "./generated",
  "safety": {
    "level": "standard",
    "allowDangerousPaths": true
  }
}
```

#### Method 2: Generator Block

```prisma title="schema.prisma"
generator zod {
  provider                   = "prisma-zod-generator"
  output                     = "./generated"
  safetyLevel               = "standard"
  safetyAllowDangerousPaths = true
}
```

#### Method 3: Environment Variables

```bash title=".env"
PRISMA_ZOD_SAFETY_LEVEL=permissive
PRISMA_ZOD_SAFETY_ALLOW_DANGEROUS_PATHS=true
PRISMA_ZOD_SAFETY_MAX_USER_FILES=10
```

### Configuration Precedence

Configurations are merged with this precedence (highest to lowest):

1. **Environment variables**
2. **Generator block options**
3. **Config file settings**
4. **Default values**

### Quick Configuration Examples

#### Allow Dangerous Paths
```json
{
  "safety": {
    "allowDangerousPaths": true
  }
}
```

#### Warnings Only Mode
```json  
{
  "safety": {
    "warningsOnly": true
  }
}
```

#### Disable Safety (⚠️ Use with Caution)
```json
{
  "safety": {
    "enabled": false
  }
}
```

## Recommended Usage

### ✅ Safe Configurations

```prisma title="schema.prisma - RECOMMENDED"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated"        // ✅ Dedicated directory
}
```

```prisma title="schema.prisma - ALSO SAFE"
generator zod {
  provider = "prisma-zod-generator"  
  output   = "./src/generated"    // ✅ Subdirectory in src
}
```

```prisma title="schema.prisma - ALSO SAFE"  
generator zod {
  provider = "prisma-zod-generator"
  output   = "./schemas"          // ✅ Schema-specific directory
}
```

### ⚠️ Configurations That Trigger Warnings

These will work but generate warnings encouraging better practices:

```prisma title="schema.prisma - WARNS BUT WORKS"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./src"              // ⚠️ Common source directory
}
```

```prisma title="schema.prisma - WARNS BUT WORKS"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./lib"              // ⚠️ Common library directory  
}
```

### ❌ Configurations That Are Blocked

These will prevent generation with error messages:

```prisma title="schema.prisma - BLOCKED"
generator zod {
  provider = "prisma-zod-generator"
  output   = "."                  // ❌ Project root
}
```

```prisma title="schema.prisma - BLOCKED"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./my-app"           // ❌ If contains package.json
}
```

## Best Practices

### 1. Use Dedicated Directories

Always use directories specifically for generated code:

```
project/
├── src/                    # Your source code (protected)
│   ├── components/
│   ├── services/
│   └── utils/
├── generated/              # Generated schemas (safe to clean)
│   ├── schemas/
│   ├── enums/
│   └── objects/
├── prisma/
│   └── schema.prisma
└── package.json
```

### 2. Use Descriptive Directory Names

Make it obvious that directories contain generated code:

- `./generated` 
- `./schemas`
- `./zod-schemas`
- `./prisma-zod`
- `./src/generated`
- `./lib/schemas`

### 3. Don't Point to Source Directories

Avoid pointing directly to directories containing your source code:

```prisma title="❌ AVOID"
output = "./src"
output = "./lib"  
output = "./components"
```

```prisma title="✅ PREFERRED"
output = "./src/generated"
output = "./lib/schemas"
output = "./generated"
```

## Troubleshooting

### Problem: "Unsafe output path detected" Error

**Cause**: You're trying to use a directory that contains project files or appears to contain user source code.

**Solution**: 
1. Use a dedicated directory: `output = "./generated"`
2. Use a subdirectory: `output = "./src/generated"`  
3. Remove project files from the target directory (if appropriate)

### Problem: Generator Warns About User Files

**Cause**: The output directory contains files that look like user code.

**Solutions**:
1. Use a different, empty directory for generated files
2. If the files are actually old generated files, delete them manually
3. If you're sure it's safe, the generator will still work (with warnings)

### Problem: Old Generated Files Not Cleaned Up

**Cause**: The manifest file might be missing or corrupted.

**Solution**:
1. Delete the `.prisma-zod-generator-manifest.json` file
2. Manually clean the output directory
3. Run the generator again to create a fresh manifest

### Problem: Need to Override Safety Checks

**Note**: There's currently no way to disable safety checks, and this is intentional. The safety system prevents data loss and encourages best practices.

**Alternative**: Use a dedicated subdirectory within your preferred location:
- Instead of `./src`, use `./src/generated`
- Instead of `./lib`, use `./lib/schemas`

## Technical Details

### Manifest File Structure

The manifest file tracks generation metadata:

```typescript
interface GeneratedManifest {
  version: string;              // Manifest format version
  generatorVersion?: string;    // Generator version that created it
  generatedAt: string;          // ISO timestamp
  outputPath: string;           // Absolute path to output directory
  files: string[];             // Relative paths of generated files
  directories: string[];       // Relative paths of generated directories
  singleFileMode?: boolean;    // Whether single-file mode was used
  singleFileName?: string;     // Name of single file (if applicable)
}
```

### Safety Validation Logic

The safety system uses this decision tree:

1. **Path Analysis**: Check directory name against known dangerous patterns
2. **Project Detection**: Look for project configuration files  
3. **Content Analysis**: Count and analyze existing files
4. **Manifest Check**: Look for previous generation manifest
5. **Risk Assessment**: Combine all factors to determine safety level

### File Pattern Recognition

Generated files are identified by these signatures:

```typescript
const generatorSignatures = [
  '// Generated by prisma-zod-generator',
  '/* Generated by prisma-zod-generator',
  'from "@prisma/client"',
  'from "./objects/',
  'from "./enums/',
  'export const',
  'z.object({',
  'z.enum([',
  'PrismaClient',
  'Prisma.'
];
```

Files need multiple signature matches to be considered generated.

## Migration from Pre-Safety Versions

If you're upgrading from a version before the safety system:

### 1. Review Your Configuration

Check your current `output` setting:

```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  output   = "???"  // What's your current setting?
}
```

### 2. If Using a Dangerous Path

If your output points to `./src` or another source directory:

1. **Option A**: Move to a dedicated directory
   ```prisma
   generator zod {
     provider = "prisma-zod-generator"
     output   = "./generated"  // New safe location
   }
   ```

2. **Option B**: Use a subdirectory
   ```prisma
   generator zod {
     provider = "prisma-zod-generator" 
     output   = "./src/generated"  // Subdirectory in src
   }
   ```

3. Update your imports:
   ```typescript
   // Old imports
   import { UserSchema } from './User.schema';
   
   // New imports (Option A)
   import { UserSchema } from '../generated/User.schema';
   
   // New imports (Option B)  
   import { UserSchema } from './generated/User.schema';
   ```

### 3. If Receiving Warnings

If you see warnings but want to keep your current setup:
- The generator will still work
- Consider the suggestions in the warning messages
- Plan to migrate to a safer configuration when convenient

### 4. Clean Up Old Files

After changing your output path:
1. Delete old generated files from the previous location
2. Run the generator to create files in the new location
3. Update your imports to use the new paths

## Backwards Compatibility

The safety system is designed to be **completely backwards compatible**:

- ✅ Existing safe configurations continue to work unchanged
- ✅ No breaking changes to the generation process
- ✅ All existing features and options work as before
- ✅ Generated code format is identical

The only change is the addition of safety checks and the manifest file for tracking.

## Recipe Guides

For practical examples of configuring the safety system, see our recipe guides:

- **[Custom Safety Configuration](../recipes/safety-custom-configuration.md)** - Detailed guide to all configuration options
- **[Force Using Dangerous Paths](../recipes/safety-force-dangerous-path.md)** - How to safely use dangerous paths like `./src`
- **[Project Migration Guide](../recipes/safety-project-migration.md)** - Migrate existing projects to use safety system
- **[Disable Safety Completely](../recipes/safety-disable-completely.md)** - How to disable safety (with warnings about risks)

These recipes provide step-by-step instructions for common safety configuration scenarios.

---

:::info
The safety system represents a major improvement in user experience and data protection. It transforms the generator from a tool that could accidentally destroy your work into a safe, user-friendly utility that protects your code while providing helpful guidance.
:::