# Custom Safety Configuration

This recipe demonstrates how to create custom safety configurations tailored to your specific project needs.

## Overview

The safety system offers granular control over different types of protections. You can mix and match settings to create a configuration that works for your project structure.

## Complete Configuration Example

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "standard",
    "allowDangerousPaths": false,
    "allowProjectRoots": false,
    "allowUserFiles": false,
    "skipManifest": false,
    "warningsOnly": false,
    "maxUserFiles": 10,
    "customDangerousPaths": ["modules", "widgets"],
    "customProjectFiles": ["project.config.js", "build.config.js"]
  }
}
```

## Configuration Options

### Safety Levels (Presets)

Choose a base level, then override specific settings:

```json
{
  "safety": {
    "level": "strict",        // strict | standard | permissive | disabled
    "allowUserFiles": true    // Override the preset
  }
}
```

**Available levels**:
- `strict` - Maximum protection, blocks even small numbers of user files
- `standard` - Balanced protection (default)
- `permissive` - Warnings-heavy, minimal blocking
- `disabled` - No safety checks

### Individual Controls

#### allowDangerousPaths
Controls whether common source directory names are allowed:

```json
{
  "safety": {
    "allowDangerousPaths": true  // Allow src, lib, components, etc.
  }
}
```

**Default dangerous paths**: `src`, `lib`, `components`, `pages`, `app`, `utils`, `hooks`, `services`, `api`

#### allowProjectRoots
Controls whether directories containing project files are allowed:

```json
{
  "safety": {
    "allowProjectRoots": true  // Allow dirs with package.json, tsconfig.json, etc.
  }
}
```

#### allowUserFiles
Controls whether directories with user files are allowed:

```json
{
  "safety": {
    "allowUserFiles": true,
    "maxUserFiles": 20  // Only relevant when allowUserFiles is false
  }
}
```

#### skipManifest
Disables manifest tracking and smart cleanup:

```json
{
  "safety": {
    "skipManifest": true  // No manifest file, no selective cleanup
  }
}
```

#### warningsOnly
Converts all safety errors to warnings:

```json
{
  "safety": {
    "warningsOnly": true  // Never block generation, only warn
  }
}
```

### Custom Patterns

#### customDangerousPaths
Add your own dangerous directory patterns:

```json
{
  "safety": {
    "customDangerousPaths": ["modules", "widgets", "core"]
  }
}
```

#### customProjectFiles
Add your own project file patterns:

```json
{
  "safety": {
    "customProjectFiles": [
      "nuxt.config.js",
      "svelte.config.js", 
      "astro.config.mjs"
    ]
  }
}
```

## Common Scenarios

### Scenario 1: Strict Enterprise Environment

Maximum safety for large teams:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "strict",
    "maxUserFiles": 0,
    "customProjectFiles": [
      ".eslintrc.js",
      "jest.config.js",
      "docker-compose.yml"
    ]
  }
}
```

### Scenario 2: Flexible Development Environment

Balanced approach for active development:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "standard",
    "allowDangerousPaths": true,
    "maxUserFiles": 15,
    "warningsOnly": false
  }
}
```

### Scenario 3: Legacy Project Migration

Permissive settings for migrating existing projects:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "permissive", 
    "allowUserFiles": true,
    "customDangerousPaths": ["legacy", "old-modules"]
  }
}
```

### Scenario 4: CI/CD Environment

Automated environments with controlled paths:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "standard",
    "skipManifest": true,      // No state between runs
    "allowDangerousPaths": false,
    "warningsOnly": true       // Don't fail builds on warnings
  }
}
```

## Multiple Configuration Sources

Configurations are merged with this precedence:

1. **Environment variables** (highest priority)
2. **Generator block options** 
3. **Config file settings**
4. **Default values** (lowest priority)

### Environment Variables

```bash title=".env"
PRISMA_ZOD_SAFETY_LEVEL=permissive
PRISMA_ZOD_SAFETY_ALLOW_DANGEROUS_PATHS=true
PRISMA_ZOD_SAFETY_MAX_USER_FILES=25
PRISMA_ZOD_SAFETY_CUSTOM_DANGEROUS_PATHS=modules,widgets
```

### Generator Block

```prisma title="schema.prisma"
generator zod {
  provider                      = "prisma-zod-generator"
  output                        = "./src/generated"
  safetyLevel                  = "standard"
  safetyAllowDangerousPaths    = false
  safetyMaxUserFiles           = "10"
  safetyCustomDangerousPaths   = "modules,widgets"
}
```

### Config File

```json title="zod-generator.config.json"
{
  "output": "./generated",
  "safety": {
    "level": "strict",
    "customDangerousPaths": ["legacy"]
  }
}
```

## Testing Your Configuration

Create a test directory structure to verify your safety configuration:

```bash
mkdir -p test-safety/{src,components,package.json}
echo '{"name":"test"}' > test-safety/package.json
echo 'const x = 1;' > test-safety/src/test.ts
```

Then test with different configurations:

```prisma title="test-schema.prisma"
generator zod {
  provider    = "prisma-zod-generator" 
  output      = "./test-safety/src"
  safetyLevel = "standard"  // Try different levels
}

model User {
  id String @id
}
```

## Configuration Validation

The system validates your configuration and provides helpful error messages:

```json title="Invalid configuration"
{
  "safety": {
    "level": "invalid-level",     // ❌ Error: Invalid safety level
    "maxUserFiles": -5            // ❌ Error: Must be non-negative
  }
}
```

## Debugging Safety Issues

Enable debug logging to understand safety decisions:

```bash
DEBUG=prisma-zod-generator* npx prisma generate
```

Or check the generated manifest file:

```json title=".prisma-zod-generator-manifest.json"
{
  "version": "1.0",
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "files": ["User.schema.ts", "Post.schema.ts"],
  "directories": ["enums"]
}
```

## Best Practices

1. **Start Strict**: Begin with `"level": "strict"` and relax as needed
2. **Test Configurations**: Use a copy of your project to test safety settings
3. **Document Choices**: Comment your configuration choices for team members
4. **Review Regularly**: Periodically review if you can tighten safety settings
5. **Use Version Control**: Always commit before changing safety configurations

## Migration Path

When changing safety configurations:

1. **Commit Current State**: Save your work
2. **Test New Configuration**: Try on a project copy first  
3. **Update Gradually**: Make incremental changes
4. **Monitor Warnings**: Watch for new warning patterns
5. **Update Team**: Inform team members of configuration changes

---

:::tip Pro Tip
Use environment variables for temporary safety overrides during debugging, but keep your permanent configuration in the config file or generator block for consistency.
:::