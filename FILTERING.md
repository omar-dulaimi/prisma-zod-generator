# Granular Generation Control

This document provides comprehensive guidance on using the granular generation control features in prisma-zod-generator.

## Overview

The granular generation control system allows you to precisely control which models, operations, and fields are included in your generated Zod schemas. This feature helps reduce bundle size, improve performance, and maintain cleaner generated code by only including what you actually use.

## Configuration Modes

### Full Mode (Default)
Generates schemas for all models and operations.

```typescript
// prisma-zod-generator.config.ts
export default {
  mode: 'full' // Generate everything (default behavior)
}
```

### Minimal Mode
Only generates schemas when explicitly enabled.

```typescript
export default {
  mode: 'minimal',
  models: {
    User: { enabled: true }, // Only User schemas will be generated
    // Post and other models are disabled by default in minimal mode
  }
}
```

### Custom Mode
Mix of enabled and disabled models with fine-grained control.

```typescript
export default {
  mode: 'custom',
  models: {
    User: { enabled: true },
    Post: { enabled: false }, // Explicitly disabled
    Profile: { enabled: true }
  }
  // Models not listed inherit default behavior (enabled in custom mode)
}
```

## Model-Level Configuration

### Basic Model Control

```typescript
export default {
  mode: 'custom',
  models: {
    // Enable all operations for User
    User: {
      enabled: true
    },
    
    // Disable Post model entirely
    Post: {
      enabled: false
    },
    
    // Enable Profile with default operations
    Profile: {
      enabled: true
    }
  }
}
```

### Operation-Level Control

Control which CRUD operations are generated for each model:

```typescript
export default {
  mode: 'custom',
  models: {
    User: {
      enabled: true,
      operations: ['findMany', 'findUnique', 'create'] // Only these operations
    },
    
    Post: {
      enabled: true,
      operations: ['findMany'] // Read-only model
    },
    
    AdminLog: {
      enabled: true,
      operations: [] // No operations (useful for type-only schemas)
    }
  }
}
```

**Available Operations:**
- `findUnique` - Find single record by unique identifier
- `findFirst` - Find first matching record
- `findMany` - Find multiple records
- `create` / `createOne` - Create single record
- `createMany` - Create multiple records
- `update` / `updateOne` - Update single record
- `updateMany` - Update multiple records
- `delete` / `deleteOne` - Delete single record
- `deleteMany` - Delete multiple records
- `upsert` / `upsertOne` - Upsert single record
- `aggregate` - Aggregate operations
- `groupBy` - Group by operations

## Field-Level Configuration

### Global Field Exclusions

Exclude fields across all models for specific schema variants:

```typescript
export default {
  globalExclusions: {
    input: ['createdAt', 'updatedAt'], // Exclude from input schemas
    result: ['password', 'internalId'], // Exclude from result schemas
    pure: ['tempField'] // Exclude from pure model schemas
  }
}
```

### Model-Specific Field Exclusions

Fine-grained field control per model and variant:

```typescript
export default {
  models: {
    User: {
      enabled: true,
      variants: {
        input: {
          excludeFields: ['id', 'createdAt'] // Auto-generated fields
        },
        result: {
          excludeFields: ['password', 'hashedPassword'] // Sensitive fields
        },
        pure: {
          excludeFields: ['tempData'] // Temporary fields
        }
      }
    },
    
    AdminUser: {
      enabled: true,
      variants: {
        input: {
          excludeFields: ['adminLevel'] // Prevent setting admin level via input
        }
      }
    }
  }
}
```

### Schema Variants Explained

- **`input`** - Fields used in create/update operations (e.g., `UserCreateInput`, `UserUpdateInput`)
- **`result`** - Fields returned from find operations (e.g., result of `findMany`)
- **`pure`** - Base model schema without operation-specific modifications

## Advanced Examples

### API Security Configuration

```typescript
export default {
  mode: 'custom',
  
  // Global security exclusions
  globalExclusions: {
    input: ['id', 'createdAt', 'updatedAt'], // Prevent client from setting these
    result: [], // Allow all fields in results by default
    pure: []
  },
  
  models: {
    User: {
      enabled: true,
      operations: ['findMany', 'findUnique', 'create', 'update'],
      variants: {
        input: {
          excludeFields: ['isAdmin', 'lastLoginAt'] // Security-sensitive fields
        },
        result: {
          excludeFields: ['password', 'hashedPassword', 'resetToken'] // Never expose
        }
      }
    },
    
    AdminLog: {
      enabled: true,
      operations: ['findMany'], // Read-only for admins
      variants: {
        result: {
          excludeFields: ['sensitiveData']
        }
      }
    },
    
    InternalMetrics: {
      enabled: false // Never expose internal metrics
    }
  }
}
```

### Performance Optimization

```typescript
export default {
  mode: 'minimal', // Start with nothing
  
  models: {
    // Only include models actually used in your application
    User: {
      enabled: true,
      operations: ['findUnique', 'create', 'update'], // Only needed operations
      variants: {
        input: {
          excludeFields: ['id', 'createdAt', 'updatedAt', 'version']
        },
        result: {
          excludeFields: ['internalNotes', 'debugInfo']
        }
      }
    },
    
    Post: {
      enabled: true,
      operations: ['findMany', 'findUnique'], // Read-only posts
      variants: {
        result: {
          excludeFields: ['draftContent', 'editorNotes']
        }
      }
    }
    
    // All other models are disabled by default in minimal mode
  }
}
```

### Multi-Tenant Application

```typescript
export default {
  mode: 'custom',
  
  globalExclusions: {
    input: ['tenantId'], // Prevent tenant switching via input
    result: [], // Allow tenantId in results for verification
    pure: []
  },
  
  models: {
    User: {
      enabled: true,
      operations: ['findMany', 'findUnique', 'create', 'update'],
      variants: {
        input: {
          excludeFields: ['role', 'permissions'] // Managed separately
        }
      }
    },
    
    TenantConfig: {
      enabled: true,
      operations: ['findUnique'], // Read-only tenant configuration
      variants: {
        result: {
          excludeFields: ['internalSettings', 'billingInfo']
        }
      }
    },
    
    SystemConfig: {
      enabled: false // Never expose system configuration
    }
  }
}
```

## Configuration File Setup

### Using Configuration File

Create `prisma-zod-generator.config.ts` in your project root:

```typescript
import type { GeneratorConfig } from 'prisma-zod-generator'

const config: GeneratorConfig = {
  mode: 'custom',
  models: {
    User: {
      enabled: true,
      operations: ['findMany', 'create'],
      variants: {
        input: {
          excludeFields: ['id', 'createdAt']
        },
        result: {
          excludeFields: ['password']
        }
      }
    }
  },
  globalExclusions: {
    input: ['updatedAt'],
    result: [],
    pure: []
  }
}

export default config
```

### Using Generator Options

Configure directly in your Prisma schema:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  config = "./prisma-zod-generator.config.ts"
  
  // Or inline configuration (for simple cases)
  mode = "minimal"
  enabledModels = "User,Post"
}
```

## Validation and Feedback

The generator provides comprehensive validation and feedback:

### Error Messages
- Invalid model names
- Circular dependencies
- Missing required models
- Configuration conflicts

### Warnings
- Relations to disabled models
- Required fields being excluded
- Operations without dependencies

### Suggestions
- Performance optimizations
- Alternative configurations
- Best practices

## Generated Output

### With Filtering Applied

When filtering is active, you'll see generation summaries like:

```
📊 Generation Summary:
   Models: 3/5 enabled
   Disabled models: InternalLog, SystemConfig
   Mode: custom
   Global exclusions:
     input: createdAt, updatedAt
     result: password
   Custom configurations: 2 models
✅ Zod schemas generated successfully with filtering applied
```

### File Structure

The generator creates schemas only for enabled models and operations:

```
generated/schemas/
├── enums/
│   └── UserRole.schema.ts
├── objects/
│   ├── UserWhereInput.schema.ts      # Only if User is enabled
│   └── UserCreateInput.schema.ts     # Only if create operation enabled
├── UserFindMany.schema.ts            # Only if findMany enabled
├── UserCreate.schema.ts              # Only if create enabled
└── index.ts                          # Updated exports
```

## Best Practices

### 1. Start with Minimal Mode for New Projects
```typescript
export default {
  mode: 'minimal',
  models: {
    // Add models as you need them
    User: { enabled: true }
  }
}
```

### 2. Use Global Exclusions for Common Patterns
```typescript
export default {
  globalExclusions: {
    input: ['id', 'createdAt', 'updatedAt'], // Common auto-generated fields
    result: ['password', 'hashedPassword'], // Common sensitive fields
  }
}
```

### 3. Security-First Field Exclusions
```typescript
// Always exclude sensitive fields from input
variants: {
  input: {
    excludeFields: ['isAdmin', 'permissions', 'internalNotes']
  },
  result: {
    excludeFields: ['password', 'resetToken', 'apiKeys']
  }
}
```

### 4. Operation-Based Optimization
```typescript
// Only enable operations you actually use
operations: ['findUnique', 'create', 'update'] // Skip findMany if not needed
```

### 5. Use Validation Feedback
- Review warnings for potential issues
- Follow suggestions for optimization
- Fix errors before deployment

## Migration Guide

### From No Filtering to Filtering

1. **Assess Current Usage**
   ```bash
   # Find which schemas you actually import
   grep -r "from.*generated/schemas" src/
   ```

2. **Start with Full Mode**
   ```typescript
   export default {
     mode: 'full' // Keep existing behavior
   }
   ```

3. **Gradually Optimize**
   ```typescript
   export default {
     mode: 'custom',
     models: {
       // Start by disabling obviously unused models
       InternalLog: { enabled: false }
     }
   }
   ```

### Bundle Size Impact

Typical reductions with filtering:
- **Minimal mode**: 60-80% reduction
- **Custom mode**: 20-50% reduction
- **Field exclusions**: 5-15% reduction

## Troubleshooting

### Common Issues

**Error: "Model 'X' not found"**
- Check model name spelling
- Ensure model exists in Prisma schema

**Warning: "Relations to disabled models"**
- Enable related models or remove relation fields
- Use field exclusions to hide relation fields

**Error: "Required field excluded"**
- Don't exclude required fields from input schemas
- Use optional fields or provide defaults

### Debugging

Enable verbose logging:
```typescript
export default {
  mode: 'custom',
  // ... your config ...
  debug: true // Shows detailed filtering decisions
}
```

## TypeScript Integration

The generated schemas maintain full TypeScript compatibility:

```typescript
import { UserCreateInputSchema, UserFindManySchema } from './generated/schemas'

// Type-safe with filtering applied
const createData = UserCreateInputSchema.parse({
  email: 'user@example.com'
  // id, createdAt automatically excluded from input
})

const queryParams = UserFindManySchema.parse({
  where: { email: 'user@example.com' },
  select: { id: true, email: true }
  // password automatically excluded from selectable fields
})
```

## Conclusion

Granular generation control provides powerful capabilities for optimizing your Zod schema generation. Start simple and gradually add more sophisticated filtering as your application grows. The validation system will guide you toward optimal configurations while maintaining type safety and preventing common mistakes.