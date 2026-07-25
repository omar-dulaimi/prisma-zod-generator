# Custom Safety Configuration

This recipe demonstrates how to create custom safety configurations tailored to your specific project needs.

## Overview

The safety system offers granular control over different types of protections. You can mix and match settings to create a configuration that works for your project structure.

:::note Safety messages are debug-level
Every warning the safety system produces — and the resolved configuration itself — is written through the debug logger. A normal `prisma generate` prints nothing at all about safety. To see any of the output described on this page, run:

```bash
DEBUG_PRISMA_ZOD=1 npx prisma generate
```
:::

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

Choose a base level (`strict`, `standard`, `permissive` or `disabled`), then override individual settings on top of it. Here `strict` supplies the base and `allowUserFiles` overrides one of its values:

```json title="zod-generator.config.json"
{
  "safety": {
    "level": "strict",
    "allowUserFiles": true
  }
}
```

**Available levels**, with the values each one carries:

- `strict` - `maxUserFiles: 0`, so a single file that looks like user code blocks generation
- `standard` (default) - `maxUserFiles: 5`; project roots and excess user files block
- `permissive` - never blocks, because it implies `warningsOnly: true`; also sets `allowDangerousPaths: true`, `allowUserFiles: true` and `maxUserFiles: 50`
- `disabled` - no safety checks at all; also forces `skipManifest: true`, so no manifest is written and no cleanup runs

`maxUserFiles` is the number that actually decides whether generation is blocked, so it is worth setting explicitly rather than inheriting it from a preset. It is only consulted when the output directory has no manifest from a previous run — once a manifest exists, the count is skipped entirely.

### Individual Controls

#### allowDangerousPaths
Acknowledges a common source directory name. The directory-name check is warn-only in both states, so this flag does not unblock anything on its own — it only appends "(Allowed by configuration)" to the message:

```json title="zod-generator.config.json"
{
  "safety": {
    "allowDangerousPaths": true
  }
}
```

**Default dangerous paths**: `src`, `lib`, `components`, `pages`, `app`, `utils`, `hooks`, `services`, `api`

What actually blocks generation into a directory like `./src` is the project-file check and the user-file count — see `allowProjectRoots` and `allowUserFiles` below.

#### allowProjectRoots
Controls whether a directory containing project files is allowed. This check does block by default:

```json title="zod-generator.config.json"
{
  "safety": {
    "allowProjectRoots": true
  }
}
```

**Default project files**: `package.json`, `tsconfig.json`, `next.config.js`, `vite.config.js`, `webpack.config.js`, `rollup.config.js`, `.gitignore`, `README.md`

#### allowUserFiles
Controls whether a directory holding files that look like user code is allowed. `maxUserFiles` is only consulted when `allowUserFiles` is `false`, and the whole check only runs when the directory has no manifest from a previous run:

```json title="zod-generator.config.json"
{
  "safety": {
    "allowUserFiles": true,
    "maxUserFiles": 20
  }
}
```

#### skipManifest
Disables manifest tracking **and** cleanup entirely — both manifest-based and smart cleanup are skipped, and no manifest is written:

```json title="zod-generator.config.json"
{
  "safety": {
    "skipManifest": true
  }
}
```

Because nothing in the output directory is ever deleted, schemas for models you later remove or rename stay behind forever. That suits ephemeral CI checkouts, but for local development the accumulating stale files usually cost more than the saved manifest.

#### warningsOnly
Downgrades every blocking safety error to a warning, so generation is never aborted:

```json title="zod-generator.config.json"
{
  "safety": {
    "warningsOnly": true
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
    "skipManifest": true,
    "allowDangerousPaths": false,
    "warningsOnly": true
  }
}
```

`skipManifest` keeps no state between runs, which is what you want on a fresh checkout, and `warningsOnly` makes sure a safety error never aborts generation.

:::caution A blocked run does not fail the build
Neither warnings nor blocking errors change the exit code. A blocking safety error is printed to stderr, but `prisma generate` still exits `0` — it simply writes no schemas. In CI, assert that the expected schema files exist rather than relying on the exit code.
:::

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
mkdir -p test-safety/src test-safety/components
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

:::caution Safety options are not validated
A misspelled `level` raises no error. It resolves to a configuration with no preset applied, which leaves `enabled` unset — and an unset `enabled` switches the entire safety system off silently. A typo therefore gives you *less* protection, not an error message.

Check spelling against `strict`, `standard`, `permissive` and `disabled`, and confirm what was actually resolved using the debug output below.
:::

## Debugging Safety Issues

Enable debug logging to understand safety decisions:

```bash
DEBUG_PRISMA_ZOD=1 npx prisma generate
# or
DEBUG=prisma-zod npx prisma generate
```

Look for the `resolvedSafetyConfig = { … }` line to see exactly which safety settings were resolved, followed by any `WARNING:` lines from the output-path check.

Or check the generated manifest file:

```json title=".prisma-zod-generator-manifest.json"
{
  "version": "1.0",
  "generatorVersion": "unknown",
  "generatedAt": "2026-01-15T10:30:00.000Z",
  "outputPath": "/abs/path/to/generated",
  "files": [
    "schemas/objects/UserWhereInput.schema.ts",
    "schemas/enums/Role.schema.ts"
  ],
  "directories": ["schemas/objects", "schemas/enums"],
  "singleFileMode": false
}
```

Entries in `files` and `directories` are paths relative to the resolved output directory, not bare filenames. On the next run, only the files listed here are deleted. `generatorVersion` is read from `npm_package_version` when the generator runs under a package script and is `"unknown"` otherwise, so treat it as a hint rather than a guarantee.

## Best Practices

1. **Start Strict**: Begin with `"level": "strict"` and relax as needed
2. **Test Configurations**: Use a copy of your project to test safety settings
3. **Document Choices**: Record why each setting was chosen — `zod-generator.config.json` is read with `JSON.parse`, so it cannot hold comments; put the rationale in your repo docs or alongside the generator block in `schema.prisma`, which does support `//` comments
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