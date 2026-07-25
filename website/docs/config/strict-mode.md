---
id: strict-mode
title: Strict Mode Configuration
---

The strict mode feature provides granular control over when `.strict()` is applied to generated Zod schemas. By default, all schemas include `.strict()` for backward compatibility, but you can configure this behavior globally, per-model, per-operation, or per-variant.

**How strictness is rendered.** With the default `zodImportTarget` (`auto` or `v3`), strict schemas are emitted as `z.object({ ... }).strict()`. With `zodImportTarget: "v4"`, operation and object schemas are emitted as `z.strictObject({ ... })` instead — identical strictness semantics, but the shape stays lazy so getter-based recursion and circular references don't break at import time. Variant schemas keep the `.strict()` suffix under both targets. The examples on this page use the `.strict()` form; read them as `z.strictObject(...)` if you target v4.

## Overview

Zod's `.strict()` method prevents unknown properties from being accepted during validation. While this provides type safety, there are scenarios where you might want more flexible validation:

- **API integration**: External APIs might return additional fields
- **Gradual migration**: Transitioning from loose to strict validation
- **Development flexibility**: Allowing extra fields during development

## Global Configuration

Configure strict mode globally for all schemas:

```json
{
  "strictMode": {
    "enabled": true,
    "operations": true,
    "objects": true,
    "variants": true
  }
}
```

:::note
Annotated snippets on this page are tagged `jsonc` and use `//` comments purely to explain each key. Your actual config file is read with `JSON.parse`, so strip the comments before saving it — the un-annotated `json` blocks below are safe to copy as-is.
:::

There is also a `strictMode.enums` key. It is accepted by the config schema (and offered by editor IntelliSense) but it is **inert**: the strict-mode resolver only recognises the `operation`, `object`, and `variant` schema types, so nothing reads `enums`. Enum schemas are inherently strict — `z.enum([...])` has no `.strict()` to apply. Setting the key changes nothing either way.

### Default Behavior

Without any `strictMode` configuration, all schemas include `.strict()` for backward compatibility:

```typescript
// Default behavior
export const UserCreateInputSchema = z.object({
  name: z.string(),
  email: z.string()
}).strict(); // ← Applied by default
```

### Disabling Globally

To disable strict mode for all schemas:

```json
{
  "strictMode": {
    "enabled": false
  }
}
```

```typescript
// Result: no .strict() suffix
export const UserCreateInputSchema = z.object({
  name: z.string(),
  email: z.string()
}); // ← No .strict()
```

## Schema Type Control

Control strict mode for specific schema types:

```json
{
  "strictMode": {
    "enabled": true,
    "operations": true,
    "objects": false,
    "variants": true
  }
}
```

This configuration results in:

```typescript
// Operations: strict (operations: true)
export const FindManyUserArgsSchema = z.object({
  where: UserWhereInputSchema.optional()
}).strict(); // ← Has .strict()

// Objects: not strict (objects: false)
export const UserWhereInputSchema = z.object({
  name: z.string().optional()
}); // ← No .strict()

// Variants: strict (variants: true)
export const UserPureSchema = z.object({
  id: z.number(),
  name: z.string()
}).strict(); // ← Has .strict()

// Enums: always strict (inherently strict, no .strict() method)
export const StatusSchema = z.enum(['ACTIVE', 'INACTIVE']); // ← No .strict() needed
```

## Model-Level Configuration

Override strict mode settings for specific models:

```json
{
  "strictMode": {
    "enabled": true,
    "operations": false,
    "objects": false
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true,
        "operations": true,
        "objects": true
      }
    },
    "Post": {
      "strictMode": {
        "enabled": false
      }
    }
  }
}
```

Result:
- **User**: All schemas get `.strict()` (model override)
- **Post**: No schemas get `.strict()` (model disabled)
- **Other models**: Follow global settings (operations and objects disabled)

## Operation-Level Control

Control strict mode for specific operations within a model:

```json
{
  "models": {
    "User": {
      "strictMode": {
        "operations": ["findMany", "create"],
        "exclude": ["update"]
      }
    }
  }
}
```

```typescript
// Gets .strict() (in operations list)
export const FindManyUserArgsSchema = z.object({...}).strict();

// Gets .strict() (in operations list)
export const CreateOneUserArgsSchema = z.object({...}).strict();

// No .strict() (not in operations list)
export const UpdateOneUserArgsSchema = z.object({...});

// No .strict() (in exclude list)
export const UpdateManyUserArgsSchema = z.object({...});
```

### Operation Names

Valid operation names include:
- `findUnique`, `findUniqueOrThrow`
- `findFirst`, `findFirstOrThrow`
- `findMany`
- `create`, `createMany`, `createManyAndReturn`
- `update`, `updateMany`, `updateManyAndReturn`
- `delete`, `deleteMany`
- `upsert`
- `aggregate`, `groupBy`, `count`

## Variant-Level Control

Configure strict mode for specific variants:

### Global Variant Settings

```json
{
  "strictMode": {
    "variants": false
  },
  "variants": {
    "pure": {
      "enabled": true,
      "strictMode": true
    },
    "input": {
      "enabled": true,
      "strictMode": false
    },
    "result": {
      "enabled": true

    }
  }
}
```

### Model-Specific Variant Settings

```json
{
  "models": {
    "User": {
      "strictMode": {
        "variants": {
          "pure": true,
          "input": false,
          "result": null
        }
      }
    }
  }
}
```

## Configuration Hierarchy

Strict mode is resolved from the following keys, highest priority first:

1. **Model + variant** (`models.ModelName.variants.<variant>.strictMode`) — variant schemas only
2. **Global variant** (`variants.<variant>.strictMode`) — variant schemas only
3. **Operation-level** (`models.ModelName.strictMode.operations` / `.exclude`) — operation schemas only
4. **Model-level** (`models.ModelName.strictMode.*`, including `strictMode.variants.<variant>`)
5. **Global schema type** (`strictMode.operations`, `strictMode.objects`, `strictMode.variants`)
6. **Global default** (`strictMode.enabled`)

:::caution
**Ordering quirk for variants.** This is not a pure "most specific wins" chain. The resolver applies the model-level settings first and *then* the variant settings, so `variants.<variant>.strictMode` overrides `models.<Model>.strictMode.variants.<variant>` — the less specific key wins.

If you need a per-model variant override, either leave `variants.<variant>.strictMode` unset (or set it to `null`) so the model-level value survives, or use `models.<Model>.variants.<variant>.strictMode`, which does take priority.
:::

### Example Hierarchy

```json
{
  "strictMode": {
    "enabled": false,
    "operations": true
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true,
        "operations": ["findMany"]
      }
    }
  }
}
```

Result for User model:
- `findMany`: **strict** (operation-level wins)
- `create`: **not strict** (not in operation list)
- `objects`: **strict** (inherits from model-level enabled)

## Common Patterns

### API-Friendly Configuration

Disable strict mode for operations but keep it for internal schemas:

```json
{
  "strictMode": {
    "enabled": true,
    "operations": false,
    "objects": true,
    "variants": true
  }
}
```

### Development vs Production

Development configuration (more permissive):

```json
{
  "strictMode": {
    "enabled": false,
    "operations": false,
    "objects": false,
    "variants": true
  }
}
```

Production configuration (strict validation):

```json
{
  "strictMode": {
    "enabled": true,
    "operations": true,
    "objects": true,
    "variants": true
  }
}
```

### Gradual Migration

Start with loose validation and gradually enable strict mode:

```json
{
  "strictMode": {
    "enabled": false
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true
      }
    }
  }
}
```

## Backward Compatibility

The strict mode feature maintains full backward compatibility:

- **No configuration**: All schemas get `.strict()` (existing behavior)
- **Existing projects**: Continue working without changes
- **New projects**: Can opt into flexible validation

## Examples

### Basic Usage

Disable strict mode for all operations but keep it for objects:

```json
{
  "strictMode": {
    "enabled": true,
    "operations": false,
    "objects": true
  }
}
```

### Advanced Model Configuration

Different strict mode settings per model:

```json
{
  "strictMode": {
    "enabled": false,
    "operations": false,
    "objects": false
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true,
        "operations": ["findMany", "create"],
        "objects": true,
        "variants": {
          "pure": true,
          "input": false
        }
      }
    },
    "Post": {
      "strictMode": {
        "operations": true,
        "exclude": ["update", "delete"]
      }
    }
  }
}
```

### Variant-Specific Configuration

```json
{
  "strictMode": {
    "enabled": true,
    "variants": false
  },
  "variants": {
    "pure": {
      "enabled": true,
      "strictMode": true
    },
    "input": {
      "enabled": true,
      "strictMode": false
    }
  },
  "models": {
    "User": {
      "strictMode": {
        "variants": {
          "result": true
        }
      }
    }
  }
}
```

## Migration Guide

### From Always Strict (Default)

If you're upgrading and want to maintain existing behavior, no changes are needed. All schemas will continue to include `.strict()`.

### To Flexible Validation

To allow extra fields in API requests:

```json
{
  "strictMode": {
    "operations": false,
    "objects": true
  }
}
```

### Per-Model Migration

Migrate models gradually:

```json
{
  "strictMode": {
    "enabled": true
  },
  "models": {
    "NewModel": {
      "strictMode": {
        "operations": false
      }
    }
  }
}
```

## Best Practices

1. **Start Conservative**: Begin with strict mode enabled and selectively disable where needed
2. **Test Thoroughly**: Validate that your application handles extra fields correctly when strict mode is disabled
3. **Document Decisions**: Comment your configuration to explain why certain models/operations have different strict mode settings
4. **Environment-Specific**: Consider different configurations for development vs production
5. **Gradual Migration**: When changing existing projects, migrate model by model rather than all at once

## Troubleshooting

### Schemas Still Have .strict()

Check the [configuration hierarchy](#configuration-hierarchy) — a model-level setting overrides the global one:

```json
{
  "strictMode": {
    "enabled": false
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true
      }
    }
  }
}
```

For variant schemas, also check the reverse case: a global `variants.<variant>.strictMode` overrides your per-model `models.<Model>.strictMode.variants.<variant>`.

### Configuration Not Applied

1. Ensure your configuration file is properly referenced in the Prisma schema
2. Check for JSON syntax errors
3. Verify the configuration file path is correct
4. Run generation again after configuration changes

### Unexpected Behavior

- **Model not found**: Ensure model names match exactly (case-sensitive)
- **Operation not working**: Check operation names against the valid list above
- **Variant issues**: Verify variant is enabled before configuring strict mode