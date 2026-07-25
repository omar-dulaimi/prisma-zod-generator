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
    "enabled": true,
    "operations": false,
    "objects": true,
    "variants": true
  }
}
```

- `enabled: true` keeps schemas strict by default.
- `operations: false` allows extra fields in the CRUD operation schemas.
- `objects: true` keeps the `objects/` input schemas strict for internal validation.
- `variants: true` keeps the pure/input/result variant schemas strict.

## Result

### Before (Default Strict)

```typescript
// API operation schema - rejects extra fields
export const UserCreateOneSchema = z.object({
  data: z.union([UserCreateInputObjectSchema, UserUncheckedCreateInputObjectSchema])
}).strict(); // ← Rejects extra fields

// Internal object schema - rejects extra fields
export const UserCreateInputObjectSchema = z.object({
  name: z.string(),
  email: z.string()
}).strict(); // ← Rejects extra fields
```

### After (Flexible Operations)

```typescript
// API operation schema - allows extra fields
export const UserCreateOneSchema = z.object({
  data: z.union([UserCreateInputObjectSchema, UserUncheckedCreateInputObjectSchema])
}); // ← No .strict() - allows extra fields

// Internal object schema - still strict
export const UserCreateInputObjectSchema = z.object({
  name: z.string(),
  email: z.string()
}).strict(); // ← Still strict for internal validation
```

## Usage Example

### Client Request (Now Works)

`operations: false` relaxes the outer operation schema, so the extra fields belong at the top level — the contents of `data` are still validated by the strict object schema:

```typescript
// This request now succeeds even with extra fields
const response = await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({
    data: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    // Extra fields from frontend - ignored by the non-strict operation schema
    clientVersion: '1.2.3',
    trackingId: 'abc123',
    timestamp: Date.now()
  })
});
```

:::caution
Extra keys placed *inside* `data` are still rejected while `strictMode.objects` is `true`. Set `"objects": false` as well if your clients send unknown fields inside `data`.
:::

### Server Validation

```typescript
import { UserCreateOneSchema } from './generated/schemas';

export async function createUser(req: Request) {
  // Parse and validate - extra fields are ignored
  const parsed = UserCreateOneSchema.parse(req.body);

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

Allow extra fields only for specific models — `strictMode` is strict by default, and only `User` operations and every `PublicProfile` schema opt out:

```json title="zod-generator.config.json"
{
  "strictMode": {
    "enabled": true,
    "operations": true
  },
  "models": {
    "User": {
      "strictMode": {
        "operations": false
      }
    },
    "PublicProfile": {
      "strictMode": {
        "enabled": false
      }
    }
  }
}
```

### Operation-Specific Control

Narrow strict mode down to individual operations:

```json title="zod-generator.config.json"
{
  "models": {
    "User": {
      "strictMode": {
        "operations": ["create", "update"],
        "exclude": ["findMany"]
      }
    }
  }
}
```

- `operations` as an array is an **allow-list for strict mode**: only `create` and `update` get `.strict()`. Every other `User` operation drops it and therefore accepts extra fields.
- `exclude` removes operations **from** strict mode and wins over `operations`, so `findMany` accepts extra fields.

Both short names (`create`, `update`) and full operation names (`createOne`, `updateOne`) are accepted.

## Environment-Based Configuration

### Development (Permissive)

```json title="zod-generator.config.dev.json"
{
  "strictMode": {
    "enabled": false,
    "variants": true
  }
}
```

`enabled: false` relaxes operation and object schemas, while `variants: true` keeps the pure/input/result variant schemas strict for type safety. Enum schemas are plain `z.enum([...])` and are not affected by `strictMode` at all.

### Production (Strict)

```json title="zod-generator.config.prod.json"
{
  "strictMode": {
    "enabled": true,
    "operations": false
  }
}
```

Strict everywhere except operations, for API flexibility.

### Selecting a config per environment

The Prisma schema language has no conditionals, so the `config` attribute cannot branch on an environment variable. Instead, omit `config` and let the generator auto-discover `zod-generator.config.json` next to your schema:

```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/schemas"
}
```

Then put the right file in place before generating:

```bash
# development
cp zod-generator.config.dev.json zod-generator.config.json
npx prisma generate

# production
cp zod-generator.config.prod.json zod-generator.config.json
npx prisma generate
```

## Best Practices

1. **Start Conservative**: Begin with strict validation and selectively allow flexibility
2. **Validate Boundaries**: Keep internal schemas strict while allowing flexibility at API boundaries
3. **Test Thoroughly**: Ensure your application handles extra fields gracefully
4. **Document Decisions**: Comment why certain models/operations allow extra fields
5. **Monitor Production**: Log when extra fields are received to understand usage patterns

## Related Patterns

- **Gradual Migration**: Gradually moving from strict to flexible validation
- **Input Validation**: Different validation strategies for different schema types
- **API Integration**: Working with external APIs that send extra data

## Common Issues

### Still Getting Validation Errors

If you're still getting strict validation errors:

1. Check that you're validating with an operation schema (e.g. `UserCreateOneSchema`), not an object schema (e.g. `UserCreateInputObjectSchema`) — `strictMode.operations` only affects the former
2. Verify your configuration is properly loaded
3. Ensure you've regenerated schemas after configuration changes

### Performance Considerations

Allowing extra fields has minimal performance impact, but consider:

- Extra fields are parsed but ignored (not passed to Prisma)
- Large payloads with many extra fields use more memory during parsing
- Consider request size limits for APIs that accept extra fields
