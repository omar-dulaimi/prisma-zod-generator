---
id: flexible-api-validation
title: Flexible API Validation
---

This recipe shows how to configure the generator to allow extra fields in API requests while maintaining strict validation for internal schemas.

## Problem

By default, all generated Zod schemas include `.strict()`, which rejects any extra properties. This can be problematic when:

- Integrating with external APIs that send additional fields
- Building APIs that should ignore unknown fields
- Developing frontend applications that might send extra data

## Solution

Use strict mode configuration to disable `.strict()` for operation schemas while keeping it for internal object schemas:

```json title="zod-generator.config.json"
{
  "strictMode": {
    "enabled": true,      // Keep strict by default
    "operations": false,  // Allow extra fields in API operations
    "objects": true,      // Keep strict for internal validation
    "variants": true      // Keep strict for type variants
  }
}
```

## Result

### Before (Default Strict)

```typescript
// API operation schema - rejects extra fields
export const CreateOneUserArgsSchema = z.object({
  data: UserCreateInputSchema
}).strict(); // ← Rejects extra fields

// Internal object schema - rejects extra fields
export const UserCreateInputSchema = z.object({
  name: z.string(),
  email: z.string()
}).strict(); // ← Rejects extra fields
```

### After (Flexible Operations)

```typescript
// API operation schema - allows extra fields
export const CreateOneUserArgsSchema = z.object({
  data: UserCreateInputSchema
}); // ← No .strict() - allows extra fields

// Internal object schema - still strict
export const UserCreateInputSchema = z.object({
  name: z.string(),
  email: z.string()
}).strict(); // ← Still strict for internal validation
```

## Usage Example

### Client Request (Now Works)

```typescript
// This request now succeeds even with extra fields
const response = await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      // Extra fields from frontend - now ignored instead of rejected
      clientVersion: '1.2.3',
      trackingId: 'abc123',
      timestamp: Date.now()
    }
  })
});
```

### Server Validation

```typescript
import { CreateOneUserArgsSchema } from './generated/schemas';

export async function createUser(req: Request) {
  // Parse and validate - extra fields are ignored
  const parsed = CreateOneUserArgsSchema.parse(req.body);

  // Only the defined fields are present
  console.log(parsed);
  // { data: { name: 'John Doe', email: 'john@example.com' } }

  // Safe to pass to Prisma
  const user = await prisma.user.create(parsed);
  return user;
}
```

## Advanced Configuration

### Per-Model Flexibility

Allow extra fields only for specific models:

```json title="zod-generator.config.json"
{
  "strictMode": {
    "enabled": true,      // Strict by default
    "operations": true    // Operations strict by default
  },
  "models": {
    "User": {
      "strictMode": {
        "operations": false  // Only User operations allow extra fields
      }
    },
    "PublicProfile": {
      "strictMode": {
        "enabled": false     // All PublicProfile schemas allow extra fields
      }
    }
  }
}
```

### Operation-Specific Control

Allow extra fields only for specific operations:

```json title="zod-generator.config.json"
{
  "models": {
    "User": {
      "strictMode": {
        "operations": ["create", "update"],  // Only create/update allow extras
        "exclude": ["findMany"]              // findMany remains strict
      }
    }
  }
}
```

## Environment-Based Configuration

### Development (Permissive)

```json title="zod-generator.config.dev.json"
{
  "strictMode": {
    "enabled": false,     // Allow extra fields everywhere
    "variants": true,     // Keep variants strict for type safety
    "enums": true        // Keep enums strict
  }
}
```

### Production (Strict)

```json title="zod-generator.config.prod.json"
{
  "strictMode": {
    "enabled": true,      // Strict everywhere
    "operations": false   // Except operations (for API flexibility)
  }
}
```

Use different configs based on environment:

```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/schemas"
  config   = env("NODE_ENV") == "production" ? "./zod-generator.config.prod.json" : "./zod-generator.config.dev.json"
}
```

## Best Practices

1. **Start Conservative**: Begin with strict validation and selectively allow flexibility
2. **Validate Boundaries**: Keep internal schemas strict while allowing flexibility at API boundaries
3. **Test Thoroughly**: Ensure your application handles extra fields gracefully
4. **Document Decisions**: Comment why certain models/operations allow extra fields
5. **Monitor Production**: Log when extra fields are received to understand usage patterns

## Related Patterns

- **[Gradual Migration](./gradual-migration)**: Gradually moving from strict to flexible validation
- **[Input Validation](./input-validation)**: Different validation strategies for different schema types
- **[API Integration](./api-integration)**: Working with external APIs that send extra data

## Common Issues

### Still Getting Validation Errors

If you're still getting strict validation errors:

1. Check that you're using operation schemas (e.g., `CreateOneUserArgsSchema`) not object schemas
2. Verify your configuration is properly loaded
3. Ensure you've regenerated schemas after configuration changes

### Performance Considerations

Allowing extra fields has minimal performance impact, but consider:

- Extra fields are parsed but ignored (not passed to Prisma)
- Large payloads with many extra fields use more memory during parsing
- Consider request size limits for APIs that accept extra fields