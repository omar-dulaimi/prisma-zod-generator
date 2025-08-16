# Optional Field Behavior Recipe

This recipe demonstrates the three different behaviors for handling optional Prisma fields in generated Zod schemas.

## Files

- `schema.prisma` - Example Prisma schema with optional fields
- `zod-generator.config.json` - Configuration using nullish behavior (default)
- `optional-strict.config.json` - Configuration for optional-only behavior
- `nullable.config.json` - Configuration for nullable behavior

## Usage

### Test Default (Nullish) Behavior

```bash
npx prisma generate
```

### Test Optional-Only Behavior

```bash
cp optional-strict.config.json zod-generator.config.json
npx prisma generate
```

### Test Nullable Behavior

```bash
cp nullable.config.json zod-generator.config.json
npx prisma generate
```

## Expected Output

Each configuration generates different Zod validation patterns:

- **Nullish**: `name: z.string().nullish()`
- **Optional**: `name: z.string().optional()`
- **Nullable**: `name: z.string().nullable()`

All patterns are type-compatible with Prisma but accept different input validation patterns.