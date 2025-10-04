---
id: strict-mode
title: Strict Mode Configuration
---

The strict mode feature provides granular control over when `.strict()` is applied to generated Zod schemas. By default, all schemas include `.strict()` for backward compatibility, but you can now configure this behavior globally, per-model, per-operation, or per-variant.

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
    "enabled": true,        // Global default for all schemas
    "operations": true,     // CRUD operation schemas (findMany, create, etc.)
    "objects": true,        // Input object schemas (WhereInput, CreateInput, etc.)
    "variants": true        // Variant schemas (pure, input, result)
  }
}
```

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
    "operations": true,    // findMany, create, update operations
    "objects": false,      // WhereInput, CreateInput objects
    "variants": true       // Pure, input, result variants
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
        "enabled": true,      // Enable for User model
        "operations": true,   // Override: User operations get .strict()
        "objects": true      // Override: User objects get .strict()
      }
    },
    "Post": {
      "strictMode": {
        "enabled": false     // Disable all strict mode for Post
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
        "operations": ["findMany", "create"],  // Only these operations get .strict()
        "exclude": ["update"]                  // Exclude update operations
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
    "variants": false  // Disable for all variants globally
  },
  "variants": {
    "pure": {
      "enabled": true,
      "strictMode": true    // Override: pure variants get .strict()
    },
    "input": {
      "enabled": true,
      "strictMode": false   // Explicit: input variants don't get .strict()
    },
    "result": {
      "enabled": true
      // Uses global variants setting (false)
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
          "pure": true,     // User pure variant gets .strict()
          "input": false,   // User input variant doesn't get .strict()
          "result": null    // Uses global/parent setting
        }
      }
    }
  }
}
```

## Configuration Hierarchy

Strict mode settings follow a hierarchy (most specific wins):

1. **Operation-level** (`models.ModelName.strictMode.operations` array)
2. **Model-level** (`models.ModelName.strictMode.*`)
3. **Global schema type** (`strictMode.operations`, `strictMode.objects`, etc.)
4. **Global default** (`strictMode.enabled`)

### Example Hierarchy

```json
{
  "strictMode": {
    "enabled": false,      // 4. Global default: disabled
    "operations": true     // 3. Global operations: enabled
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true,         // 2. Model-level: enabled
        "operations": ["findMany"] // 1. Operation-level: only findMany
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
    "operations": false,  // Allow extra fields in API requests
    "objects": true,      // Keep strict for internal validation
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
    "variants": true     // Keep variants strict for type safety
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
    "enabled": false  // Start permissive
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true  // Migrate User model first
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
    "operations": false,  // Allow extra fields in operation inputs
    "objects": true       // Keep strict for internal objects
  }
}
```

### Per-Model Migration

Migrate models gradually:

```json
{
  "strictMode": {
    "enabled": true  // Keep existing strict behavior
  },
  "models": {
    "NewModel": {
      "strictMode": {
        "operations": false  // New model allows extra fields
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

Check the configuration hierarchy. More specific settings override general ones:

```json
{
  "strictMode": {
    "enabled": false  // This might be overridden
  },
  "models": {
    "User": {
      "strictMode": {
        "enabled": true  // This overrides the global setting
      }
    }
  }
}
```

### Configuration Not Applied

1. Ensure your configuration file is properly referenced in the Prisma schema
2. Check for JSON syntax errors
3. Verify the configuration file path is correct
4. Run generation again after configuration changes

### Unexpected Behavior

- **Model not found**: Ensure model names match exactly (case-sensitive)
- **Operation not working**: Check operation names against the valid list above
- **Variant issues**: Verify variant is enabled before configuring strict mode