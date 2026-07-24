---
id: special-types
title: Special Type Mapping
---

| Prisma   | Zod (I/O)                          | Pure Models Default             | Notes                                                     |
| -------- | ---------------------------------- | ------------------------------- | --------------------------------------------------------- |
| String   | z.string()                         | same                            | optional + .nullable() when optional string input variant |
| Int      | z.number().int()                   | same                            |                                                           |
| Float    | z.number()                         | same                            |                                                           |
| Boolean  | z.boolean()                        | same                            |                                                           |
| DateTime | z.date()                           | same                            | (strategy: date)                                          |
| Json     | z.unknown() + optional refinements | same                            | Optional depth/length validations                         |
| Bytes    | z.instanceof(Uint8Array)           | z.string() (base64)             | Override to Uint8Array by `useBase64:false`               |
| BigInt   | z.bigint()                         | same                            |                                                           |
| Decimal  | z.custom(Prisma.Decimal.isDecimal) | same                            | Full Decimal.js support (configurable via `decimalMode`)  |
| Enums    | \<Enum\>Schema                     | \<Enum\>Schema                  | Generated enum schemas                                    |

**Bytes**: adds size constraints & base64 regex or length refinements depending on representation.

**JSON**: Can enforce serializability, depth, and length; adds descriptive comments in generated file.

## Decimal Type Support

The `Decimal` type in Prisma is mapped to Zod schemas based on the `decimalMode` configuration option. This feature provides full compatibility with `zod-prisma-types` for seamless migration.

### Configuration Options

Configure decimal handling via the `decimalMode` option in your config file:

```json
{
  "decimalMode": "decimal" // "decimal" | "number" | "string"
}
```

### Modes

#### `decimal` (Default, Recommended)

Full `Decimal.js` support matching `zod-prisma-types` implementation:

- **Pure Models**: `z.custom<InstanceType<typeof Prisma.Decimal>>((v) => Prisma.Decimal.isDecimal(v))` with descriptive error messages
- **Input Types**: Union of `number | string | Prisma.Decimal | Decimal` (if decimal.js installed) with runtime validation
- **Imports**: Automatically imports `Prisma` (non-type import: `Decimal.isDecimal` checks and defaults need the runtime value). With the legacy `prisma-client-js` generator this is `@prisma/client`; with the new `prisma-client` generator and a custom output the import targets the generated client's **browser-safe entrypoint** (`<output>/browser`), so generated schemas can be bundled for the browser without pulling in `node:` builtins from the server entry.

**Example Output:**

```typescript
// Pure model schema
export const ProductSchema = z.object({
  id: z.number().int(),
  price: z.custom<InstanceType<typeof Prisma.Decimal>>((v) => Prisma.Decimal.isDecimal(v), {
    message: "Field 'price' must be a Decimal. Location: ['Models', 'Product']",
  }),
});
```

`Prisma.Decimal.isDecimal(v)` is used instead of `instanceof` because the browser and server
Prisma runtimes bundle separate copies of the Decimal class: an `instanceof` check would reject
perfectly valid Decimal instances created by the other runtime copy (for example values revived
on the client or produced by the schema's own `.default(...)`), while `Decimal.isDecimal` is
cross-copy safe.

#### `number`

Legacy mode for backward compatibility:

- Maps `Decimal` fields to `z.number()`
- **Warning**: May lose precision for large decimal values
- Use when you don't need exact decimal precision

#### `string`

String-based validation with regex patterns:

- Maps `Decimal` fields to `z.string()` with decimal format validation
- Includes precision-aware regex patterns
- Preserves decimal precision as string representation

### Migration from zod-prisma-types

If you're migrating from `zod-prisma-types`, use `decimalMode: "decimal"` (the default) for drop-in compatibility. The generator will:

1. Generate `z.custom<InstanceType<typeof Prisma.Decimal>>((v) => Prisma.Decimal.isDecimal(v))` for model schemas
2. Create proper import statements for `Prisma`
3. Match the validation patterns from `zod-prisma-types` (with a cross-runtime-safe `isDecimal` check instead of `instanceof`)

### Decimal.js Installation

While `decimal.js` is not required, installing it provides enhanced type safety:

```bash
pnpm add decimal.js
```

When `decimal.js` is installed, input schemas will also accept `Decimal` instances in the validation union.
