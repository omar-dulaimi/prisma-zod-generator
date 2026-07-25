---
id: special-types
title: Special Type Mapping
---

| Prisma   | Zod (I/O)                                   | Pure Models Default            | Notes                                                     |
| -------- | ------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| String   | z.string()                                  | same                           | optional + .nullable() when optional string input variant |
| Int      | z.number().int()                            | same                           |                                                           |
| Float    | z.number()                                  | same                           |                                                           |
| Boolean  | z.boolean()                                 | same                           |                                                           |
| DateTime | z.coerce.date() (Create/Update/Where)       | z.date()                       | Variant-aware by default — see **DateTime** below         |
| Json     | `jsonSchema` unioned with the Json-null arm | z.unknown() + depth .refine()  | See **JSON** below                                        |
| Bytes    | z.instanceof(Uint8Array)                    | z.string() (base64 + .max())   | Representation is not user-configurable — see **Bytes**   |
| BigInt   | z.bigint()                                  | same                           | Literal defaults emit `BigInt("0")`                       |
| Decimal  | z.custom(Prisma.Decimal.isDecimal)          | same                           | Full Decimal.js support (configurable via `decimalMode`)  |
| Enums    | \<Enum\>Schema                              | \<Enum\>Schema                 | Generated enum schemas                                    |

**DateTime**: with the shipped defaults (`dateTimeStrategy: "date"` plus `dateTimeSplitStrategy: true`) the emitted form is variant-aware — `Create*`, `Update*` and `Where*` schemas get `z.coerce.date()`, while pure models and result schemas get `z.date()`. Set `dateTimeStrategy` to `"coerce"` or `"isoString"` to force a single form in every generated file; variant files honor the same setting.

**JSON**: object and CRUD schemas reference `jsonSchema` — the recursive `JsonValueSchema` helper generated into `helpers/json-helpers.ts` — and union it with the Json-null enum arm. Pure models use a `z.unknown()` base plus a nesting-depth `.refine(...)` that is always applied (maximum depth 10). `jsonSchemaCompatible: true` switches both bases to `z.any()`. A single `Json` field can be given a real schema with `@zod.import([...]).custom.use(...)`; see [Typed JSON fields](./zod-comments.md#typed-json-fields-with-a-referenced-schema).

**Bytes**: pure models emit a base64 `z.string()` with a base64 regex and a `.max()` derived from the internal 16 MB size cap; input and object schemas use `z.instanceof(Uint8Array)`. The only supported way to change the representation is `jsonSchemaCompatible: true` together with `jsonSchemaOptions.bytesFormat` (`base64String` or `hexString`).

:::note
The type-mapping details behind the JSON and Bytes representations — the base64 toggle, minimum/maximum byte size, the JSON depth limit, JSON string length, allowed MIME types — are internal defaults, not configuration keys. `complexTypes.*` is not a recognised config property and has no effect if you put it in a config file. The knobs that do exist are `jsonSchemaCompatible` and `jsonSchemaOptions.bytesFormat` for JSON/Bytes, and `decimalMode` for `Decimal` (below).
:::

## Literal Defaults

A Prisma `@default(...)` with a literal value becomes a `.default(...)` on the **pure model** field. CRUD input schemas never carry `.default(...)` — a field with a database default is made `.optional()` there instead.

The literal is emitted in the base schema's own runtime type, so the default validates against the field it is attached to:

| Prisma type              | `@default(...)`                    | Emitted                                          |
| ------------------------ | ---------------------------------- | ------------------------------------------------ |
| Int / Float / String / Boolean | `@default(1)`                | `.default(1)`                                    |
| BigInt                   | `@default(0)`                      | `.default(BigInt("0"))`                          |
| DateTime                 | a literal timestamp                | `.default(new Date("..."))`                      |
| DateTime                 | `@default(now())`                  | no `.default(...)` — see below                   |
| Json                     | `@default("[]")`                   | `.default([])`                                   |
| Decimal                  | `@default(1)`                      | `.default(new Prisma.Decimal(1))`                |

Function defaults are **not** turned into Zod defaults: `@default(now())`, `@default(uuid())`, `@default(cuid())` and
`@default(autoincrement())` are produced by the database or the Prisma Client, so the field is emitted as its plain base
type in pure models (`createdAt: z.date()`) and as `.optional()` in CRUD inputs (`createdAt: z.coerce.date().optional()`).
Emitting a client-side generator there would let a parsed value disagree with what the database actually stores.

`BigInt` uses the string-argument constructor rather than a `0n` literal so the generated file compiles below an ES2020 TypeScript target. A `Json` default is inlined raw whenever its text parses as JSON; otherwise the quoted form is kept. Under `jsonSchemaCompatible: true` the `BigInt` and `Bytes` bases are strings, so those defaults stay quoted (`.default("0")`).

:::note
When a field also carries validations, the `.default(...)` is appended **after** the whole validation chain (`z.string().regex(...).default("0")`). Validators such as `.regex()` and `.max()` exist on the base type and not on `ZodDefault`, so the reverse order would throw at import time.
:::

## Decimal Type Support

The `Decimal` type in Prisma is mapped to Zod schemas based on the `decimalMode` configuration option. This feature provides full compatibility with `zod-prisma-types` for seamless migration.

### Configuration Options

Configure decimal handling via the `decimalMode` option in your config file. Accepted values are `"decimal"` (the default), `"number"` and `"string"`:

```json
{
  "decimalMode": "decimal"
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
