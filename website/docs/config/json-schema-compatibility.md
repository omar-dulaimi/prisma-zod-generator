# JSON Schema Compatibility

Generate schemas that are fully compatible with [Zod's JSON Schema conversion](https://zod.dev/json-schema) (`z.toJSONSchema()`), enabling seamless integration with OpenAPI documentation tools, API validators, and JSON Schema-based systems.

## Overview

By default, Prisma Zod Generator creates schemas using Zod types that cannot be represented in JSON Schema:
- `z.date()` for DateTime fields
- `z.bigint()` for BigInt fields  
- `z.instanceof(Uint8Array)` for Bytes fields
- `z.unknown()` for relations and JSON fields

When `jsonSchemaCompatible` is enabled, these types are automatically converted to JSON Schema-compatible alternatives while preserving validation logic.

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
  "jsonSchemaOptions": {
    "dateTimeFormat": "isoString",
    "bigIntFormat": "string", 
    "bytesFormat": "base64String",
    "conversionOptions": {
      "unrepresentable": "any",
      "cycles": "throw",
      "reused": "inline"
    }
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

### Relations and JSON Fields

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
  UserCreateInputSchema,
  UserUpdateInputSchema,
  UserModelSchema 
} from './generated/schemas';

// Generate OpenAPI schemas
const schemas = {
  UserCreateRequest: z.toJSONSchema(UserCreateInputSchema),
  UserUpdateRequest: z.toJSONSchema(UserUpdateInputSchema),
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
  target: 'openApi3',
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
import { UserCreateInputSchema } from './generated/schemas/variants/input/User.input';
const createUserJsonSchema = z.toJSONSchema(UserCreateInputSchema);
```

### Result Schemas
```typescript
import { UserFindManyResultSchema } from './generated/schemas/variants/result/User.result';
const findManyJsonSchema = z.toJSONSchema(UserFindManyResultSchema);
```

## Conversion Options

Configure how `z.toJSONSchema()` handles edge cases:

```json
{
  "jsonSchemaCompatible": true,
  "jsonSchemaOptions": {
    "conversionOptions": {
      "unrepresentable": "any",
      "cycles": "throw", 
      "reused": "inline"
    }
  }
}
```

### Options Reference

- **`unrepresentable`**: How to handle unrepresentable types
  - `"any"` - Convert to `any` type (default)
  - `"throw"` - Throw error on unrepresentable types

- **`cycles`**: How to handle circular references
  - `"throw"` - Throw error on cycles (default)
  - `"ref"` - Use JSON Schema references

- **`reused`**: How to handle reused schemas
  - `"inline"` - Inline repeated schemas (default)
  - `"ref"` - Use JSON Schema references

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
```
Solution: Ensure jsonSchemaCompatible is enabled in configuration
```

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

- [DateTime Strategy](/config/datetime-strategy) - Configure DateTime handling
- [Variants](/config/variants) - Schema variant configuration  
- [Zod JSON Schema Documentation](https://zod.dev/json-schema) - Official Zod JSON Schema docs