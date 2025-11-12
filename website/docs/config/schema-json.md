---
id: schema-json
title: JSON Schema IntelliSense
description: Wire up $schema in your config files for editor hints and automated validation.
---

The generator ships a full [JSON Schema draft‑07](https://json-schema.org/) definition for every config option. Point your config files at it once and editors, CI scripts, and custom tooling all get the same contract the generator enforces internally.

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

Pair this with the `$schema` hint so editors catch problems before CI does.

Once the `$schema` field is in place, every upgrade automatically refreshes the schema definition because the path always points to the version installed in `node_modules`.
