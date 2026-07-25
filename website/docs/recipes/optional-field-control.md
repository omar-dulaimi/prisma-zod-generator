---
id: optional-field-control
title: Optional Field Control
---

Configure how optional Prisma fields are validated using different Zod patterns.

This recipe walks through the three behaviours from the request/response angle — pick one by the shape of payload you want to accept. For the option reference, the generated-output examples and the object-schema carve-out, see [Optional Field Behavior](../config/optional-fields.md).

:::info Scope
`optionalFieldBehavior` applies to **pure model schemas** (`generated/schemas/models/<Model>.schema.ts`) and to array-based custom variants. The `objects/` input schemas and the object-based `variants/` files use their own fixed policies and do not read this setting — see [Object Schemas: Optional vs Nullable](../config/optional-fields.md#object-schemas-optional-vs-nullable-behavior-note).

Every example below therefore assumes pure models are being emitted, which is set in the JSON config (`"pureModels": true`) — there is no generator-block flag for it.
:::

## Use Cases

### API with Null Values

When your API accepts explicit null values alongside undefined/omitted fields:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "nullish" // default
}

model User {
  id   Int     @id
  name String?
  bio  String?
}
```

The generated `UserSchema` accepts all these patterns:

```typescript
// All valid
{ id: 1, name: "John", bio: "Developer" }
{ id: 1, name: null, bio: undefined }
{ id: 1 } // name and bio omitted
```

### Strict No-Null API

When you want to reject explicit null values:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "optional"
}
```

Generated validation:

```typescript
// Valid
{ id: 1, name: "John" }
{ id: 1 } // name omitted

// Invalid - null rejected
{ id: 1, name: null } // ❌ Validation error
```

### Always-Present Fields

When optional fields must always be included in requests:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "nullable"
}
```

Generated validation:

```typescript
// Valid
{ id: 1, name: "John", bio: "Developer" }
{ id: 1, name: null, bio: null }

// Invalid - fields must be present
{ id: 1 } // ❌ Missing name and bio
```

## Configuration Options

### Generator Block

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "nullish" // or "optional" | "nullable"
}
```

### JSON Config

```json title="zod-generator.config.json"
{
  "optionalFieldBehavior": "nullish"
}
```

## Comparison Table

| Behavior   | Zod Output    | Accepts `undefined` | Accepts `null` | Allows Omitted |
| ---------- | ------------- | ------------------- | -------------- | -------------- |
| `nullish`  | `.nullish()`  | ✅                  | ✅             | ✅             |
| `optional` | `.optional()` | ✅                  | ❌             | ✅             |
| `nullable` | `.nullable()` | ❌                  | ✅             | ❌             |

## Migration Example

Changing from the legacy `.optional().nullable()` pattern:

**Before:**

```typescript
// Legacy behavior (equivalent to nullish)
name: z.string().optional().nullable();
```

**After with explicit configuration:**

```typescript
// With optionalFieldBehavior = "nullish"
name: z.string().nullish();

// With optionalFieldBehavior = "optional"
name: z.string().optional();

// With optionalFieldBehavior = "nullable"
name: z.string().nullable();
```

## Choosing a behaviour for Prisma-shaped payloads

Prisma's own input types allow `null` for optional fields, so a payload that carries an explicit `null` only round-trips through the pure model schema under `nullish` or `nullable`:

```typescript
import { UserSchema } from './generated/schemas/models/User.schema';

// With optionalFieldBehavior = "nullish" or "nullable"
UserSchema.parse({ id: 1, name: null }); // ✅

// With optionalFieldBehavior = "optional"
UserSchema.parse({ id: 1, name: null }); // ❌ null is rejected — omit the key instead
UserSchema.parse({ id: 1 }); // ✅
```

Pick `optional` only when your clients omit fields rather than sending `null`. The `objects/` input schemas are unaffected either way: `UserCreateInputObjectSchema` and friends always emit `.optional().nullable()` for optional non-relation fields, so they keep accepting both.

## Related: Variant Partial Flag

The `optionalFieldBehavior` setting controls how **Prisma optional fields** (like `String?`) are handled. For making **all fields optional** in specific variants, use the [partial flag in variants configuration](../config/variants.md#partial-flag):

```json title="zod-generator.config.json"
{
  "optionalFieldBehavior": "optional",
  "variants": {
    "input": {
      "enabled": true,
      "partial": true
    }
  }
}
```

Key differences:

- **`optionalFieldBehavior`**: Controls only Prisma optional fields (`String?`), in pure model schemas
- **`partial` flag**: Makes ALL fields optional in the variant it is set on
