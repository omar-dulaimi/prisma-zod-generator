---
id: schema-json
title: JSON Schema IntelliSense
description: Wire up $schema in your config files for editor hints and automated validation.
---

The generator ships a [JSON Schema draft‑07](https://json-schema.org/) definition covering the config options. Point your config files at it once and editors give you IntelliSense, hover docs, and validation — and CI scripts can reuse the same definition.

## Quick Start

1. Make sure `prisma-zod-generator` is installed (the schema is published with every npm release under `lib/config/schema.json`).
2. Open the config file you pass through the Prisma generator block (for example `prisma/config.json`, `zod-generator.config.json`, or whatever you set via `config = "./..."`).
3. Add a `$schema` field that points to the installed package:

```json title="prisma/config.json"
{
  "$schema": "../node_modules/prisma-zod-generator/lib/config/schema.json",
  "mode": "full",
  "pureModels": true
}
```

Save the file and your editor immediately enables IntelliSense, hover docs, and red squiggles for invalid values.

## Known Coverage Gaps

The schema sets `additionalProperties: false`, so anything it does not model is reported as `Unknown property`. Two things the generator accepts are not covered:

- **Array-based custom variants.** The schema models only the object form of `variants` (`pure` / `input` / `result`), so the array form documented in [Variants System](./variants.md) is reported as `must be object`.
- **`minimalOperations`.** This minimal-mode escape hatch is not part of the declared config contract, so it is reported as an unknown property. See [Generation Modes](./modes.md#overriding-the-minimal-operation-set).

:::note
These reports come from your editor or from `ConfigurationValidator`, never from generation itself — the generator does not validate your config against this schema, so a config using either feature still generates correctly. The flip side is that the generator also will not warn you about a genuine typo; see [Configuration Precedence → Unknown Keys Are Silently Ignored](./precedence.md#unknown-keys-are-silently-ignored).
:::

There is also one key the schema models but the generator ignores: `strictMode.enums` is accepted and offered by IntelliSense, yet nothing reads it (enum schemas are inherently strict). See [Strict Mode Configuration](./strict-mode.md#global-configuration).

## Picking the Right Path

- **Relative to config file** – Recommended because it survives CI and other machines. Use `../node_modules/...` if your config file sits inside the `prisma/` directory, or `./node_modules/...` if it lives at the project root.
- **Absolute path** – Works for quick tests but breaks across machines. Prefer relative paths once you confirm things locally.
- **Hosted copy** – If you host the schema at a stable URL (for example on your docs site or an internal CDN), set `$schema` to the HTTPS URL. Any consumer that understands JSON Schema will pull it remotely.

## Programmatic Validation

Need to fail CI when someone pushes an invalid config? Reuse the same schema through the compiled validator:

```ts title="scripts/validate-config.ts"
import { readFileSync } from 'node:fs';
import { ConfigurationValidator } from 'prisma-zod-generator/lib/config/validator.js';

const configPath = process.argv[2] ?? './prisma/config.json';
const validator = new ConfigurationValidator();
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const result = validator.validate(config);

if (!result.valid) {
  console.error('❌ Invalid Prisma Zod Generator config:');
  console.error(result.errors);
  process.exit(1);
}

console.log('✅ Config looks good');
```

Pair this with the `$schema` hint so editors catch problems before CI does. If your config uses array-based variants or `minimalOperations`, account for the [coverage gaps](#known-coverage-gaps) above before making this check blocking — the validator will flag them even though generation succeeds.

Once the `$schema` field is in place, every upgrade automatically refreshes the schema definition because the path always points to the version installed in `node_modules`.
