---
id: bytes-json
title: Bytes & JSON Details
---

**Bytes** mapping logic:

- Default pure model output: `z.string()` plus base64 validation — `.regex(/^[A-Za-z0-9+/]*={0,2}$/, "Must be valid base64 string")` and a `.max(...)` derived from the generator's internal 16 MB ceiling (byte sizes are scaled 4/3 to base64 string length).
- To change the representation, turn on JSON Schema compatibility mode and pick a format with `jsonSchemaOptions.bytesFormat` — `"base64String"` (the default) or `"hexString"`:

```json title="zod-generator.config.json"
{
  "jsonSchemaCompatible": true,
  "jsonSchemaOptions": {
    "bytesFormat": "hexString"
  }
}
```

- Size limits (`minSize` / `maxSize`) and allowed-MIME-type comments are internal generator defaults, not JSON config keys — there is no supported option today for switching Bytes fields to `z.instanceof(Uint8Array)` schemas (binary mode would also need external MIME detection).
- A Bytes `@default` is appended **after** the validation chain, so the default is not swallowed by the base64 refinements ([#394](https://github.com/omar-dulaimi/prisma-zod-generator/issues/394), fixed in 2.1.7).

Other Prisma literal defaults in pure models are emitted as runtime-correct expressions rather than raw strings:

| Prisma type | Emitted default |
| --- | --- |
| `BigInt` | `BigInt("0")` |
| `DateTime` | `new Date("...")` under the `date` / `coerce` dateTime strategies |
| `Decimal` | `new Prisma.Decimal(...)` when `decimalMode` is `decimal` |
| `Json` | re-emitted as a JSON literal when the default parses as JSON |

**JSON** mapping options (when enhanced config present):

- Serializability refine (JSON.stringify guard)
- Max depth & length checks
- Null allowance toggles (record vs strict modes)

### Helper: jsonMaxDepthRefinement

`jsonMaxDepthRefinement(maxDepth)` in `src/utils/jsonValidators.ts` is an internal **code-generation** helper: it returns the *source text* of a `.refine(...)` depth guard that the generator splices into emitted schemas. It is not a runtime refinement, and it is not importable — the npm package ships only the `prisma-zod-generator` and `pzg-pro` binaries, with no library entry point.

To apply the same guard in your own code, write the refinement directly:

```ts
const DeepJson = z.array(z.any()).refine((val) => {
  const getDepth = (obj: unknown, depth = 0): number => {
    if (depth > 8) return depth;
    if (obj === null || typeof obj !== 'object') return depth;
    const values = Object.values(obj as Record<string, unknown>);
    if (values.length === 0) return depth;
    return Math.max(...values.map((v) => getDepth(v, depth + 1)));
  };
  return getDepth(val) <= 8;
}, 'JSON nesting depth exceeds maximum of 8');
```

Nodes beyond the limit trigger a validation error. Prefer modest limits (5–12) to avoid costly traversals.
