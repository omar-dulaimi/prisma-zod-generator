# JSON Schema Compatibility

Generate schemas that are fully compatible with [Zod's JSON Schema conversion](https://zod.dev/json-schema) (`z.toJSONSchema()`), enabling seamless integration with OpenAPI documentation tools, API validators, and JSON Schema-based systems.

## Overview

By default, Prisma Zod Generator creates schemas using Zod types that cannot be represented in JSON Schema:
- `z.date()` for DateTime fields
- `z.bigint()` for BigInt fields  
- `z.instanceof(Uint8Array)` for Bytes fields
- `z.unknown()` for relations and JSON fields
- `z.custom<Prisma.Decimal>(…)` for Decimal fields

When `jsonSchemaCompatible` is enabled, the first four are automatically converted to JSON Schema-compatible alternatives while preserving validation logic.

:::caution
Decimal is the exception — `jsonSchemaCompatible` does not touch it. Decimal fields are controlled solely by [`decimalMode`](../pipeline/special-types.md), so set `"decimalMode": "string"` (or `"number"`) alongside `jsonSchemaCompatible` if your models have Decimal fields. See [Decimal Fields](#decimal-fields) below.
:::

## Configuration

### Basic Setup

```json
{
  "jsonSchemaCompatible": true
}
```

### Advanced Options

```json
{
  "jsonSchemaCompatible": true,
  "decimalMode": "string",
  "jsonSchemaOptions": {
    "dateTimeFormat": "isoString",
    "bigIntFormat": "string",
    "bytesFormat": "base64String"
  }
}
```

## Type Conversions

### DateTime Fields

**Default Behavior:**
```typescript
// Generated schema (not JSON Schema compatible)
z.date()
```

**JSON Schema Compatible:**
```typescript
// ISO String format (default)
z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "Invalid ISO datetime")

// ISO Date format
z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date")
```

**Configuration:**
- `dateTimeFormat: "isoString"` - Full ISO 8601 datetime (default)
- `dateTimeFormat: "isoDate"` - ISO date only (YYYY-MM-DD)

### BigInt Fields

**Default Behavior:**
```typescript
// Generated schema (not JSON Schema compatible)
z.bigint()
```

**JSON Schema Compatible:**
```typescript
// String format (default)
z.string().regex(/^\d+$/, "Invalid bigint string")

// Number format (may lose precision for very large numbers)
z.number().int()
```

**Configuration:**
- `bigIntFormat: "string"` - Represents as string (default, preserves precision)
- `bigIntFormat: "number"` - Represents as number (potential precision loss)

### Bytes Fields

**Default Behavior:**
```typescript
// Generated schema (not JSON Schema compatible)
z.instanceof(Uint8Array)
```

**JSON Schema Compatible:**
```typescript
// Base64 string format (default)
z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, "Invalid base64 string")

// Hexadecimal string format
z.string().regex(/^[0-9a-fA-F]*$/, "Invalid hex string")
```

**Configuration:**
- `bytesFormat: "base64String"` - Base64 encoded string (default)
- `bytesFormat: "hexString"` - Hexadecimal encoded string

### Decimal Fields

Decimal is **not** rewritten by `jsonSchemaCompatible`. It is governed only by `decimalMode`:

```typescript
// decimalMode: "decimal" (the default) — NOT JSON Schema compatible
z.custom<InstanceType<typeof Prisma.Decimal>>((v) => Prisma.Decimal.isDecimal(v))

// decimalMode: "string" — JSON Schema compatible
z.string()

// decimalMode: "number" — JSON Schema compatible (may lose precision)
z.number()
```

Because the default is `"decimal"`, a model with a Decimal field still produces an unrepresentable schema even with `jsonSchemaCompatible: true` — the most common cause of the "Cannot be represented in JSON Schema" error below. Set `decimalMode` explicitly:

```json
{
  "jsonSchemaCompatible": true,
  "decimalMode": "string"
}
```

See [Special Types](../pipeline/special-types.md) for the full `decimalMode` reference.

### JSON Fields

**Default Behavior:**
```typescript
// Generated schema (not JSON Schema compatible)
z.unknown()
```

**JSON Schema Compatible:**
```typescript
// Allows any value (JSON Schema compatible)
z.any()
```

:::note
This substitution applies to pure models, variant files and result schemas. Input object schemas under `objects/` instead reference the shared recursive `jsonSchema` helper for `Json` fields, and that helper is left in place under `jsonSchemaCompatible`. Convert from a pure model or variant schema when you need JSON Schema output for a `Json` field.
:::

### Relation Fields

Relation fields are shaped by which schemas are available, not by `jsonSchemaCompatible`.

In record-shaped result schemas (since v2.3.2, issue #376), a relation field references the related model's pure schema when pure models are emitted:

```typescript
// pureModels enabled — imported from ../models/
posts: z.array(PostSchema).optional()
author: UserSchema.optional()
```

When the related pure schema is unavailable — pure models disabled, a self-relation, or single-file mode — the field falls back to `z.unknown()` (or `z.any()` under `jsonSchemaCompatible`):

```typescript
posts: z.array(z.unknown()).optional()
author: z.unknown().optional()
```

Relation fields are always `.optional()`, because relations are only present when the query `include`s them.

### Pattern Accuracy Across Emitters

The regex patterns shown above are what the pure-model, variant and `results/` emitters produce. The input/CRUD object schemas under `objects/` use materially different equivalents, so do not copy the patterns above into fixtures or client-side mirrors for those files:

- **DateTime** — `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/` with the message `"Invalid RFC3339 date-time"`. Laxer: timezone offsets are accepted and the fractional part is optional and variable-precision.
- **BigInt** — `/^-?\d+$/`. Laxer: a leading minus is allowed.
- **Bytes, base64** — `/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=)?$/`. Stricter: enforces 4-character blocks and valid terminal padding.
- **Bytes, hex** — `/^(?:[0-9a-fA-F]{2})+$/`. Stricter: requires whole byte pairs.

## Usage Examples

### Basic Usage

```typescript
import { z } from 'zod';
import { UserModelSchema } from './generated/schemas/variants/pure/User.pure';

// Convert to JSON Schema
const jsonSchema = z.toJSONSchema(UserModelSchema);

// Use with OpenAPI
const openApiSpec = {
  components: {
    schemas: {
      User: jsonSchema
    }
  }
};
```

### OpenAPI Integration

```typescript
import { z } from 'zod';
import { 
  UserCreateInputObjectSchema,
  UserUpdateInputObjectSchema,
  UserModelSchema 
} from './generated/schemas';

// Generate OpenAPI schemas
const schemas = {
  UserCreateRequest: z.toJSONSchema(UserCreateInputObjectSchema),
  UserUpdateRequest: z.toJSONSchema(UserUpdateInputObjectSchema),
  UserResponse: z.toJSONSchema(UserModelSchema)
};

// Use in OpenAPI spec
const openApiSpec = {
  openapi: '3.0.0',
  components: { schemas },
  paths: {
    '/users': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCreateRequest' }
            }
          }
        },
        responses: {
          '201': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' }
              }
            }
          }
        }
      }
    }
  }
};
```

### API Documentation Generation

```typescript
import { z } from 'zod';

// Import any generated schema
import { PostModelSchema } from './generated/schemas/variants/pure/Post.pure';

// Generate documentation-friendly JSON Schema
const postSchema = z.toJSONSchema(PostModelSchema, {
  target: 'openapi-3.0',
  unrepresentable: 'any'
});

// Use with documentation generators like @apidevtools/swagger-jsdoc
const swaggerSpec = {
  openapi: '3.0.0',
  info: { title: 'API', version: '1.0.0' },
  components: {
    schemas: {
      Post: postSchema
    }
  }
};
```

## Schema Variants Support

JSON Schema compatibility works across all schema variants:

### Pure Models
```typescript
import { UserModelSchema } from './generated/schemas/variants/pure/User.pure';
const userJsonSchema = z.toJSONSchema(UserModelSchema);
```

### Input Schemas
```typescript
// The input variant file exports one schema per model: `${Model}${Suffix}Schema`,
// where the suffix comes from variants.input.suffix (default ".input" -> "Input").
import { UserInputSchema } from './generated/schemas/variants/input/User.input';
const inputJsonSchema = z.toJSONSchema(UserInputSchema);

// The Prisma CreateInput/UpdateInput object schemas live under objects/ and
// carry the ObjectSchema suffix:
import { UserCreateInputObjectSchema } from './generated/schemas/objects/UserCreateInput.schema';
const createUserJsonSchema = z.toJSONSchema(UserCreateInputObjectSchema);
```

### Result Schemas
```typescript
// Per-operation result schemas live under results/:
import { UserFindManyResultSchema } from './generated/schemas/results/UserFindManyResult.schema';
const findManyJsonSchema = z.toJSONSchema(UserFindManyResultSchema);

// The per-model result variant is a single schema per model, not per operation:
import { UserResultSchema } from './generated/schemas/variants/result/User.result';
const resultJsonSchema = z.toJSONSchema(UserResultSchema);
```

## Conversion Options

Configure how `z.toJSONSchema()` handles edge cases **at your call site**. The generator emits schema *files* and never calls `z.toJSONSchema()` itself, so pass these options directly to the function:

```ts
const jsonSchema = z.toJSONSchema(UserModelSchema, {
  target: 'draft-2020-12',
  unrepresentable: 'any',
  cycles: 'ref',
  reused: 'inline'
});
```

:::caution
`jsonSchemaOptions.conversionOptions` is accepted by the config parser but is not read by any generator code. Putting it in your config file has no effect — use the call-site form above.
:::

### Options Reference

These are Zod v4's own options and defaults:

- **`target`**: JSON Schema dialect to emit
  - `"draft-2020-12"` - JSON Schema Draft 2020-12 (default)
  - `"draft-7"`, `"draft-4"`, `"openapi-3.0"`

- **`unrepresentable`**: How to handle unrepresentable types
  - `"throw"` - Throw error on unrepresentable types (default)
  - `"any"` - Unrepresentable types become `{}`

- **`cycles`**: How to handle circular references
  - `"ref"` - Break cycles using `$defs` (default)
  - `"throw"` - Throw error on cycles

- **`reused`**: How to handle reused schemas
  - `"inline"` - Inline repeated schemas (default)
  - `"ref"` - Use JSON Schema references

:::note
`unrepresentable` defaults to `"throw"`, so pass `unrepresentable: 'any'` explicitly if you do not want conversion to throw on a type the generator could not make representable (a Decimal field under `decimalMode: "decimal"`, for example).
:::

## Validation Behavior

JSON Schema compatible schemas maintain validation while changing representation:

```typescript
// DateTime validation
const dateString = "2023-12-25T10:30:00.000Z";
const result = UserModelSchema.parse({ createdAt: dateString });
// ✅ Validates against ISO datetime regex

// BigInt validation  
const bigIntString = "12345678901234567890";
const result2 = PostModelSchema.parse({ likes: bigIntString });
// ✅ Validates against numeric string regex

// Bytes validation
const base64String = "SGVsbG8gV29ybGQ=";
const result3 = PostModelSchema.parse({ data: base64String });
// ✅ Validates against base64 regex
```

## Performance Considerations

- **Regex Validation**: JSON Schema compatible mode uses regex validation which may be slightly slower than native type checking
- **String Conversion**: Applications need to handle string-to-type conversion in business logic
- **Memory Usage**: Regex patterns add minimal memory overhead

## Migration Guide

### From Regular Schemas

1. **Enable compatibility mode:**
```json
{
  "jsonSchemaCompatible": true
}
```

2. **Update application code:**
```typescript
// Before: Date objects
const user = { createdAt: new Date() };

// After: ISO strings  
const user = { createdAt: new Date().toISOString() };
```

3. **Update validation:**
```typescript
// Before: Direct usage
const result = UserModelSchema.parse(userData);

// After: Convert types as needed
const result = UserModelSchema.parse({
  ...userData,
  createdAt: userData.createdAt.toISOString(),
  likes: userData.likes.toString()
});
```

## Troubleshooting

### Common Issues

**Error: "Cannot be represented in JSON Schema"**

1. Ensure `jsonSchemaCompatible` is enabled in configuration.
2. If the model has a Decimal field, set `"decimalMode": "string"` (or `"number"`) — `jsonSchemaCompatible` does not convert Decimal, and the default `"decimal"` mode emits an unrepresentable `z.custom(...)`.
3. If the model has a `Json` field and you are converting an `objects/` input schema, convert the pure model or variant schema instead; the `objects/` files keep the recursive `jsonSchema` helper.
4. As a last resort, pass `unrepresentable: 'any'` to `z.toJSONSchema()` to degrade the offending field to `{}` instead of throwing.

**Validation failing with valid data**
```typescript
// Check that data matches expected string formats
const validDateTime = "2023-12-25T10:30:00.000Z"; // ✅
const invalidDateTime = "Dec 25, 2023";           // ❌
```

**Precision loss with BigInt**
```typescript
// Use string format for large numbers
{
  "jsonSchemaOptions": {
    "bigIntFormat": "string"  // Preserves precision
  }
}
```

### Debugging

Enable debug logging to see conversion details:
```bash
DEBUG_PRISMA_ZOD=1 prisma generate
```

## Related

- [DateTime Strategy](./datetime-strategy) - Configure DateTime handling
- [Variants](./variants) - Schema variant configuration  
- [Zod JSON Schema Documentation](https://zod.dev/json-schema) - Official Zod JSON Schema docs