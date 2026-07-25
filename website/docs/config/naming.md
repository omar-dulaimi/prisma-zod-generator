---
id: naming
title: Naming & Presets
---

## Pure Model Naming

Pure model naming resolved by `resolvePureModelNaming`:

### Presets:

- `default`: `{Model}.schema.ts`, export `{Model}Schema` / type `{Model}Type`.
- `zod-prisma`: same as default + legacy aliases.
- `zod-prisma-types`: file `{Model}.schema.ts`, export `{Model}` (no suffixes), legacy aliases.
- `legacy-model-suffix`: `{Model}.model.ts`, export `{Model}Model`.

### Overrides via `naming.pureModel`:

- `filePattern` (`{Model}.schema.ts`, supports tokens `{Model}{SchemaSuffix}` etc.)
- `schemaSuffix`, `typeSuffix`, `exportNamePattern`, `legacyAliases`.

Relation import rewriting adapts when using `.model` pattern.

## Schema Naming (CRUD Operations)

Schema naming resolved by `resolveSchemaNaming`:

### Default Patterns:
- `filePattern`: `{operation}{Model}.schema.ts`
- `exportNamePattern`: `{Model}{Operation}Schema`

### Examples:
- `findManyUser.schema.ts` with export `UserFindManySchema`
- `createOnePost.schema.ts` with export `PostCreateOneSchema`

### Overrides via `naming.schema`:
```json
{
  "naming": {
    "schema": {
      "filePattern": "{kebab}-{operation}-{model}.schema.ts",
      "exportNamePattern": "{Model}{Operation}ValidationSchema"
    }
  }
}
```

### ⚠️ Important Pattern Requirements

**Operation Token Required**: Your `filePattern` MUST include an operation token (`{operation}` or `{Operation}`) to avoid file collisions. Without it, all CRUD operations for the same model will overwrite each other, resulting in only the last operation being generated.

**Examples**:
- ✅ `{kebab}-{operation}-schema.ts` → `user-findMany-schema.ts`, `user-createOne-schema.ts`
- ✅ `{operation}{Model}.schema.ts` → `findManyUser.schema.ts`, `createOneUser.schema.ts`
- ❌ `{kebab}-schema.ts` → `user-schema.ts` (all operations overwrite each other!)

**Collision Detection**: The generator will detect filename collisions and throw an error during generation. Always include `{operation}` or `{Operation}` in your pattern.

### Available Tokens:
- `{Model}`: PascalCase model name (e.g., `User`, `BlogPost`)
- `{model}`: camelCase model name (e.g., `user`, `blogPost`)
- `{kebab}`: kebab-case model name (e.g., `user`, `blog-post`)
- `{Operation}`: PascalCase operation (e.g., `FindMany`, `CreateOne`)
- `{operation}`: camelCase operation (e.g., `findMany`, `createOne`)

## Input Object Naming

Input object naming resolved by `resolveInputNaming`:

### Default Patterns:
- `filePattern`: `{InputType}.schema.ts`
- `exportNamePattern`: `{Model}{InputType}ObjectSchema`

`filePattern` is resolved **relative to the generated `objects/` directory**, so a pattern containing directory segments nests inside it: `inputs/{InputType}.schema.ts` writes to `objects/inputs/UserWhereInput.schema.ts`, not `inputs/UserWhereInput.schema.ts`.

### Examples:
- `UserWhereInput.schema.ts` with export `UserWhereInputObjectSchema` (written to `objects/UserWhereInput.schema.ts`)
- `PostCreateInput.schema.ts` with export `PostCreateInputObjectSchema`

### Overrides via `naming.input`:
```json
{
  "naming": {
    "input": {
      "filePattern": "{kebab}-{InputType}-input.ts",
      "exportNamePattern": "{Model}{InputType}"
    }
  }
}
```

### Available Tokens:
- `{Model}`: PascalCase model name extracted from input type
- `{model}`: camelCase model name
- `{kebab}`: kebab-case model name (e.g., `user`, `blog-post`)
- `{InputType}`: Full input type name (e.g., `UserWhereInput`, `PostCreateInput`)

### ⚠️ Important Pattern Requirements

**File Pattern Must Include Unique Identifiers**: Your `filePattern` must include tokens that make each input type unique. Without proper uniqueness, multiple input types for the same model will generate identical filenames and overwrite each other.

**Recommended Patterns** (paths shown relative to the generated `objects/` directory):
- ✅ `{kebab}-{InputType}-input.ts` → `book-BookCreateInput-input.ts`
- ✅ `{InputType}.schema.ts` → `BookCreateInput.schema.ts`
- ✅ `inputs/{Model}/{InputType}.ts` → `inputs/Book/CreateInput.ts` (nested under `objects/`; the duplicate `Book` prefix is stripped — see the note below)
- ❌ `{kebab}-input.ts` → `book-input.ts` (all Book inputs collide!)

:::caution
**No collision detection for input objects.** Unlike CRUD operation schemas, input object filenames are **not** checked for collisions. Colliding files are silently overwritten and you simply end up missing schemas — no error is raised. Make sure your pattern is unique per input type (keep `{InputType}` in it).
:::

**Note**: When your pattern includes a model token (`{Model}` or `{model}`) together with `{InputType}`, duplicate model prefixes are automatically stripped for both export names and file names to avoid results like `UserUserWhereInput*`.

## Enum Naming

Enum naming resolved by `resolveEnumNaming`:

### Default Patterns:
- `filePattern`: `{Enum}.schema.ts`
- `exportNamePattern`: `{Enum}Schema`

`filePattern` is resolved **relative to the generated `enums/` directory** — do not prefix it with `enums/`. A pattern of `enums/{Enum}.enum.ts` produces `enums/enums/Role.enum.ts` (with imports pointing at the doubled path), which is almost never what you want.

### Examples:
- `Role.schema.ts` with export `RoleSchema` (written to `enums/Role.schema.ts`)
- `UserStatus.schema.ts` with export `UserStatusSchema`

### Overrides via `naming.enum`:
```json
{
  "naming": {
    "enum": {
      "filePattern": "{Enum}Validator.schema.ts",
      "exportNamePattern": "{Enum}ValidatorSchema"
    }
  }
}
```

### Available Tokens:
- `{Enum}`: PascalCase enum name (e.g., `Role`, `UserStatus`)
- `{enum}`: camelCase enum name (e.g., `role`, `userStatus`)
- `{camel}`: camelCase alias for `{enum}` — **in `filePattern` only**. Export-name patterns do not substitute `{camel}`, so it would survive literally in `exportNamePattern`; use `{enum}` there.

## Complete Configuration Example

```json
{
  "naming": {
    "preset": "default",
    "pureModel": {
      "filePattern": "{Model}.model.ts",
      "exportNamePattern": "{Model}Model"
    },
    "schema": {
      "filePattern": "{operation}-{kebab}.schema.ts",
      "exportNamePattern": "{Model}{Operation}ValidationSchema"
    },
    "input": {
      "filePattern": "inputs/{InputType}.schema.ts",
      "exportNamePattern": "{InputType}Schema"
    },
    "enum": {
      "filePattern": "{Enum}.enum.ts",
      "exportNamePattern": "{Enum}EnumSchema"
    }
  }
}
```

This would generate:
- Pure models: `models/User.model.ts` → `UserModel`
- Schemas: `findMany-user.schema.ts` → `UserFindManyValidationSchema`
- Inputs: `objects/inputs/UserWhereInput.schema.ts` → `UserWhereInputSchema`
- Enums: `enums/Role.enum.ts` → `RoleEnumSchema`

Remember that `input.filePattern` is relative to `objects/` and `enum.filePattern` is relative to `enums/` — the extra `inputs/` segment above is deliberate, whereas an `enums/` prefix would be doubled.
