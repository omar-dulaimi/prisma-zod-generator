# DateTime Strategy

Configure how Prisma `DateTime` fields are validated in your generated Zod schemas.

## Overview

The generator supports two complementary controls for DateTime behavior:
- dateTimeSplitStrategy (boolean, default: true) controls the default behavior when no explicit dateTimeStrategy is set.
- dateTimeStrategy ('date' | 'coerce' | 'isoString', default: 'date') forces a specific mapping across all variants.

Both can be set in the JSON config file or directly in the Prisma generator block.

When dateTimeSplitStrategy is true and dateTimeStrategy is NOT set:
- Input schemas default to z.coerce.date() (JSON-friendly — accepts ISO strings and coerces to Date)
- Pure model and result schemas default to z.date()

When dateTimeStrategy is set to `coerce` or `isoString` it takes precedence and applies to all variants. Setting it to `"date"` has no effect on its own — `"date"` is also the internal default, so the split strategy still applies and input schemas keep `z.coerce.date()`. To get `z.date()` everywhere, set `"dateTimeSplitStrategy": false` (optionally alongside `"dateTimeStrategy": "date"`).

[`jsonSchemaCompatible`](./json-schema-compatibility.md) overrides everything on this page. When it is enabled, every emitter checks it first and emits string schemas with no Date transform, regardless of `dateTimeStrategy` or `dateTimeSplitStrategy`.

## Split Strategy (Default)

With split enabled (default):
- Inputs: z.coerce.date() (accepts ISO strings)
- Pure/Results: z.date()
This provides a JSON-first default for APIs while keeping strict Date objects in read models.

Disable split by setting "dateTimeSplitStrategy": false to revert to a single global default (see strategies below).

## Available Strategies

### `date` (default for pure and result schemas)

Generates strict `z.date()` validation that only accepts JavaScript Date objects.

```json
{
  "dateTimeStrategy": "date",
  "dateTimeSplitStrategy": false
}
```

:::note
`dateTimeSplitStrategy` defaults to `true`, and `"date"` is the internal default for `dateTimeStrategy`. Without `"dateTimeSplitStrategy": false`, input and CRUD schemas still emit `z.coerce.date()` and accept ISO strings; only pure model and result schemas get `z.date()`.
:::

**Generated schema:**
```typescript
// For a createdAt: DateTime field
createdAt: z.date()
```

**Usage** (with `dateTimeSplitStrategy: false`, so this holds for input schemas too):
```typescript
// ✅ Valid
const data = { createdAt: new Date() };

// ❌ Invalid - string not accepted
const data = { createdAt: "2023-01-01T00:00:00Z" };
```

### `coerce`

Generates `z.coerce.date()` validation that automatically converts valid date strings to Date objects.

```json
{
  "dateTimeStrategy": "coerce"
}
```

**Generated schema:**
```typescript
// For a createdAt: DateTime field
createdAt: z.coerce.date()
```

**Usage:**
```typescript
// ✅ Both valid - string automatically converted
const data1 = { createdAt: new Date() };
const data2 = { createdAt: "2023-01-01T00:00:00Z" };
```

### `isoString`

Generates string validation with ISO 8601 regex pattern and transform to Date object.

```json
{
  "dateTimeStrategy": "isoString"
}
```

**Generated schema:**
```typescript
// For a createdAt: DateTime field
createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "Invalid ISO datetime").transform(v => new Date(v))

// With zodImportTarget: "v4", the generator emits the modern form instead:
createdAt: z.iso.datetime().transform(v => new Date(v))
```

:::caution
Milliseconds are **required** by the regex form: `"2023-01-01T00:00:00.000Z"` passes, `"2023-01-01T00:00:00Z"` does not.
:::

**Usage:**
```typescript
// ✅ Valid - ISO string accepted and transformed
const data = { createdAt: "2023-01-01T00:00:00.000Z" };

// ❌ Invalid - must be valid ISO string
const data = { createdAt: "invalid-date" };

// ❌ Invalid - milliseconds missing
const data = { createdAt: "2023-01-01T00:00:00Z" };
```

## Configuration Examples

### Schema Generator Block

```prisma
generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/zod"
  config   = "./zod-generator.config.json"
}
```

### JSON Configuration File

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "dateTimeStrategy": "coerce",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true, "suffix": ".model" },
    "input": { "enabled": true, "suffix": ".input" },
    "result": { "enabled": true, "suffix": ".result" }
  }
}
```

### Direct Generator Options

```prisma
generator zod {
  provider         = "prisma-zod-generator"
  output           = "./generated/zod"
  dateTimeStrategy = "isoString"
}
```

## Use Cases

### `date` Strategy
- **Best for:** Type-safe applications where you work with Date objects
- **API validation:** When your frontend sends Date objects directly
- **Internal validation:** Component props, function parameters

### `coerce` Strategy
- **Best for:** API endpoints accepting flexible date input
- **Form handling:** User input from date pickers or text fields
- **Data migration:** Converting between different date formats

### `isoString` Strategy
- **Best for:** Strict API contracts requiring ISO 8601 format
- **Database consistency:** Ensuring standardized date string format
- **Logging/serialization:** When you need predictable string representation

## Impact on Generated Schemas

The `dateTimeStrategy` affects all DateTime fields across:

- **Pure models** (when `pureModels: true`)
- **Input variants** (create, update operations)
- **Result variants** — `variants/result/<Model>.result.ts` (honored since v2.1.6; before that these files always emitted `z.date()`, see issue #368)
- **CRUD operation schemas**

:::caution
The operation result schemas under `schemas/results/` (for example `UserFindManyResult.schema.ts`) currently always emit `z.date()` for DateTime fields and do not follow `dateTimeStrategy`.
:::

### Example Model

```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Generated Output Comparison

```typescript
// dateTimeStrategy: "date"
export const PostModel = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// dateTimeStrategy: "coerce"  
export const PostModel = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// dateTimeStrategy: "isoString"
export const PostModel = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "Invalid ISO datetime").transform(v => new Date(v)),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "Invalid ISO datetime").transform(v => new Date(v)),
});
```

The exact regex text varies slightly between emitters — the pure-model emitter under `models/` writes an unanchored pattern, and `zodImportTarget: "v4"` swaps the regex for `z.iso.datetime()` in the `objects/`, CRUD and `variants/` files. The accepted format is the same in every case: a full ISO 8601 UTC timestamp with three-digit milliseconds.

## Migration Guide

When changing `dateTimeStrategy`, regenerate your schemas and update consuming code:

### From `date` to `coerce`
- No breaking changes for existing Date object usage
- New: string inputs now accepted and converted

### From `date` to `isoString`
- **Breaking:** Only ISO strings accepted, Date objects rejected
- Update client code to send ISO string format

### From `coerce` to `isoString`
- **Breaking:** More restrictive validation
- Non-ISO date strings will be rejected

## Related Configuration

- [`jsonSchemaCompatible`](./json-schema-compatibility.md): Overrides `dateTimeStrategy` entirely and emits string schemas without a Date transform
- [`pureModels`](./modes.md): When enabled, affects pure model DateTime fields
- [`variants`](./variants.md): Controls which schema variants include DateTime strategy
- [`optionalFieldBehavior`](./optional-fields.md): May affect nullable DateTime fields

## Troubleshooting

### Date Validation Errors
```typescript
// If using "date" strategy but sending strings
const result = PostModel.safeParse({
  title: "Hello",
  createdAt: "2023-01-01" // ❌ String not accepted
});

// Solution: Convert to Date or use "coerce" strategy
const result = PostModel.safeParse({
  title: "Hello", 
  createdAt: new Date("2023-01-01") // ✅ Date object
});
```

### ISO String Format Issues
```typescript
// If using "isoString" strategy
const result = PostModel.safeParse({
  title: "Hello",
  createdAt: "2023-1-1" // ❌ Invalid ISO format
});

// Solution: Use proper ISO 8601 format
const result = PostModel.safeParse({
  title: "Hello",
  createdAt: "2023-01-01T00:00:00.000Z" // ✅ Valid ISO
});
```