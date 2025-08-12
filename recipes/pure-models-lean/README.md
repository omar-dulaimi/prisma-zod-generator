## Pure Models Lean Recipe

Generate only pure model schemas with lean documentation (default) or opt back into verbose docs, and configure DateTime handling.

### Features

- Emits only pure model schemas (no operation args / variants)
- Lean mode: no JSDoc header, no schema statistics, no field doc blocks
- Switch `pureModelsLean` off to restore rich docs
- Choose DateTime validation style via `dateTimeStrategy`

### Config

`zod-generator.config.json`:

```jsonc
{
  "mode": "custom",
  "pureModels": true,
  "pureModelsLean": true,        // omit verbose docs (default)
  "dateTimeStrategy": "date"     // or "coerce" | "isoString"
}
```

`schema.prisma` generator block snippet:

```prisma
generator zod {
  provider         = "prisma-zod-generator"
  output           = "./prisma/generated"
  useMultipleFiles = true        // models go in ./prisma/generated/schemas/models
  config           = "./zod-generator.config.json"
}
```

To get a single bundle instead:

```prisma
generator zod {
  provider              = "prisma-zod-generator"
  output                = "./prisma/generated"
  useMultipleFiles      = false
  singleFileName        = "schemas.ts"
  placeSingleFileAtRoot = true
  config                = "./zod-generator.config.json"
}
```

### DateTime Strategy Examples

```jsonc
{ "dateTimeStrategy": "date" }      // z.date()
{ "dateTimeStrategy": "coerce" }    // z.coerce.date()
{ "dateTimeStrategy": "isoString" } // z.string().regex(ISO).transform(v => new Date(v))
```

### Disable Lean Mode

```jsonc
{
  "pureModels": true,
  "pureModelsLean": false
}
```

### When to Use

- Want ultra small diff-friendly model schemas
- Running in environments where large headers add noise
- Need to tune DateTime ingestion (strict ISO vs coercion)

### Next Steps

Layer variants later by enabling them in the JSON config:

```jsonc
{
  "pureModels": true,
  "variants": { "input": { "enabled": true }, "result": { "enabled": true } }
}
```
