---
id: special-types
title: Special Type Mapping
---

| Prisma   | Zod (I/O)                          | Pure Models Default | Notes                                                     |
| -------- | ---------------------------------- | ------------------- | --------------------------------------------------------- |
| String   | z.string()                         | same                | optional + .nullable() when optional string input variant |
| Int      | z.number().int()                   | same                |                                                           |
| Float    | z.number()                         | same                |                                                           |
| Boolean  | z.boolean()                        | same                |                                                           |
| DateTime | z.date()                           | same                | (strategy: date)                                          |
| Json     | z.unknown() + optional refinements | same                | Optional depth/length validations                         |
| Bytes    | z.instanceof(Uint8Array)           | z.string() (base64) | Override to Uint8Array by `useBase64:false`               |
| BigInt   | z.bigint()                         | same                |                                                           |
| Decimal  | z.number()                         | same                | Simplified mapping                                        |
| Enums    | \<Enum\>Schema                     | \<Enum\>Schema      | Generated enum schemas                                    |

**Bytes**: adds size constraints & base64 regex or length refinements depending on representation.

**JSON**: Can enforce serializability, depth, and length; adds descriptive comments in generated file.
