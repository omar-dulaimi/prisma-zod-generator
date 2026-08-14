# Typed JSON and scalar fields, compatible with prisma-json-types-generator

Status: implemented and shipped in 3.1.0 (#398). Kept as the design record — the
reasoning below is why the implementation looks the way it does, not outstanding work.
Issue: [#386](https://github.com/omar-dulaimi/prisma-zod-generator/issues/386)

## The problem, restated from evidence

Issue #386 asked for typed `Json` fields and was closed by 2.3.1, which added:

```prisma
/// @zod.import(["import { WorkflowNodeSchema } from '../json-types'"]).custom.use(z.array(WorkflowNodeSchema))
nodes Json
```

That works. It is also the whole import statement, inline, on every field.

The reporter's actual complaint was narrower and is still unsolved. They wrote:

> **Use both generators**: prisma-json-types-generator for types + prisma-zod-generator for CRUD schemas.
> Problem: Two sources of truth, schemas can drift.

They are running `prisma-json-types-generator` (PJTG) for compile-time types and PZG for runtime schemas,
and maintaining the same shape twice. 2.3.1 did not remove the second source of truth, it added a third
place to write it.

Verified against PZG 3.0.0, generating from a schema carrying a PJTG annotation:

```prisma
model Workflow {
  /// [WorkflowNode]
  nodes Json
  edges Json
}
```

```ts
nodes: z.union([JsonNullValueInputSchema, jsonSchema]),
edges: z.union([JsonNullValueInputSchema, jsonSchema])
```

Byte-identical. PZG does not see PJTG annotations at all, because `detectZodAnnotations` matches only
`/@zod\s*\./i`.

## What PJTG provides

| | |
|---|---|
| `/// [TypeName]` | field takes the shape of `PrismaJson.TypeName` |
| `/// ![<ts type>]` | field takes an inline TypeScript type; works on `Json`, `String`, `Int`, `Float` |
| Types declared in | `declare global { namespace PrismaJson { ... } }` |
| Config | `namespace`, `clientOutput`, `allowAny`, `useType` |
| Applies types to | the generated Prisma Client |
| Runtime validation | **none** |

The `!` form is the more interesting half. `/// !['draft' | 'published']` on a `String` column is a value
Prisma cannot express and nothing validates today, in either library.

## Design

One annotation, both guarantees. PZG reads PJTG's syntax unchanged, and can emit the namespace itself.

### 1. Reading annotations

Two new forms. **Both apply to every supported field type**, which corrects an earlier draft that split them
by form. Verified against upstream's own fixtures, now vendored under `tests/compat/pjtg/`:

- `[TypeName]` appears on `Json`, `Json?`, `Json[]`, `String`, `String[]`, `Int`, `Int?` and `Float`.
- `![...]` appears on `Json`, `Json?`, `Json[]` and `String`.

On an **array** field the annotation gives the ELEMENT type and the array wrapping is added. Upstream's
`literal.prisma` puts `/// ![3]` on `list Json[]` and its type test asserts `list: [3]`.

Examples, all taken from the vendored corpus rather than invented:

```prisma
model Model {
  /// ![1]
  simple    Json       // -> z.literal(1)
  /// ![2]
  optional  Json?      // -> z.literal(2).nullable()
  /// ![3]
  list      Json[]     // -> z.array(z.literal(3))
  /// ![[number[]][]]
  nested    Json[]     // -> z.array(z.array(z.tuple([z.array(z.number())])))
  /// !['A' | 'B']
  literal   String     // -> z.enum(['A','B'])
  /// [WithType]
  typed     String     // namespace ref on a SCALAR, not just Json
  /// [StringArrayType]
  tags      String[]   // namespace ref on a scalar array
  /// [NullablePrice]
  price     Int?       // namespace ref on an optional Int
}
```

Note `![[number[]][]]`: a **tuple** type, arrayed, on an array field. Tuples were absent from an earlier
draft of this table and are required by upstream's `array.prisma`.

`@zod.custom.use` keeps working and **wins** where both are present, so nothing existing changes.

### 2. Resolving `[TypeName]` to a schema

By convention plus explicit override, in this order:

1. `typedJson.map[TypeName]`, if configured. An exact expression, escape hatch for anything odd.
2. `<TypeName>{schemaSuffix}` imported from `typedJson.schemaModule`. Suffix defaults to `Schema`, so
   `[WorkflowNode]` resolves to `WorkflowNodeSchema`.
3. If neither resolves: **leave the field exactly as it is today** and record a warning. Never guess, and
   never fail a generate over an annotation that was written for a different generator.

Point 3 is the compatibility contract. A schema annotated for PJTG alone must keep generating, unchanged,
if PZG is not configured for it.

### 3. Converting `![<ts type>]` to a schema

The content is TypeScript, not Zod, because it has to stay readable by PJTG. A small converter handles the
documented cases:

| TypeScript | Zod |
|---|---|
| `'a' \| 'b'` | `z.enum(['a','b'])` |
| `1 \| 2 \| 3` | `z.union([z.literal(1), z.literal(2), z.literal(3)])` |
| `string`, `number`, `boolean` | `z.string()`, `z.number()`, `z.boolean()` |
| `T[]` | `z.array(<T>)` |
| `[A, B]` (tuple) | `z.tuple([<A>, <B>])` |
| `1` (single literal) | `z.literal(1)` |
| `{ a: string; b?: number }` | `z.object({ a: z.string(), b: z.number().optional() })` |
| `TypeName` (bare identifier) | resolved as in section 2 |
| anything else | unconverted, warning, field unchanged |

Deliberately not supported in v1: conditional types, generics, mapped types, intersections, `Record<>`,
imported types. Each falls into the "anything else" row rather than producing a wrong schema.

### 4. Emitting the namespace

Optional, off by default. With `typedJson.emitNamespace: true`, PZG writes:

```ts
import type { z } from 'zod';
import type { WorkflowNodeSchema } from './json-types';

declare global {
  namespace PrismaJson {
    type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
  }
}

export {};
```

This removes the second source of truth: the Zod schema is authoritative and the TypeScript type is derived
from it, so they cannot drift.

**It does not, on its own, type the Prisma Client.** Measured, not assumed: with `/// [WorkflowNode]` on a
`Json` column, the generated client declares `nodes: JsonValue` and contains **zero** references to
`PrismaJson`. PJTG works by rewriting that `index.d.ts`; a `declare global` block alone changes nothing
about it. An earlier draft of this spec claimed otherwise and was wrong.

So the honest pipeline is:

    Zod schema (authored)  ->  PZG emits `type X = z.infer<typeof XSchema>`  ->  PJTG rewrites the client

PJTG stays in the toolchain for the client rewrite, and that is fine, because the thing the reporter
actually complained about was drift, not the number of generators. After this change there is exactly one
authored definition. What PZG does not do is patch Prisma's generated client: that is PJTG's mechanism,
it fights Prisma regenerating the file, and duplicating it here would be a second fragile implementation
of someone else's working feature.

The namespace name is configurable and defaults to `PrismaJson`, matching PJTG, so the same `declare global`
slot is used and existing code reading `PrismaJson.WorkflowNode` keeps compiling.

Verified while writing this: `import type { XSchema }` combined with `typeof XSchema` inside
`declare global` compiles under `strict`, and the resulting type is genuinely enforced (a missing required
property errors).

### 5. Nullability and Prisma's JSON null sentinels

Unchanged from today's behaviour, which is already correct and easy to get wrong:

- A required `Json` field in a create input stays wrapped: `z.union([JsonNullValueInputSchema, <schema>])`.
- An optional field keeps `.optional()`, applied outside the union.
- `DbNull` / `JsonNull` handling is untouched. The typed schema replaces only the `jsonSchema` position.
- Filter inputs (`JsonFilter`, `JsonWithAggregatesFilter`) stay untyped, matching PJTG's own limitation.
  Typing a filter is not the same problem and would break `path`/`string_contains` operations.

### 6. Config

Named `typedJson`, deliberately not `jsonTypes`: this repo already has `jsonSchemaCompatible` and
`jsonSchemaOptions`, which concern JSON Schema as an output format and are a different feature entirely.

```jsonc
{
  "typedJson": {
    "schemaModule": "./json-types",   // where [TypeName] resolves from
    "schemaSuffix": "Schema",         // [Foo] -> FooSchema
    "namespace": "PrismaJson",        // matches PJTG
    "emitNamespace": false,           // emit declare global
    "namespaceOutput": "./prisma-json-types.d.ts",
    "map": {}                         // explicit overrides
  }
}
```

Absent `typedJson`, behaviour is byte-identical to 3.0.0. That is the first test.

## Why this is better than either library alone

- PJTG users add one config block and get runtime validation, with **no annotation changes**.
- The Zod schema becomes the single authored definition; the TypeScript type is derived from it, so the
  drift the reporter described cannot happen.
- `String`/`Int`/`Float` literal unions get validated, which neither library does today.
- One annotation, one schema, both guarantees, no drift.

## Test plan

**The corpus is upstream's own, vendored under `tests/compat/pjtg/`**: 18 `.prisma` schemas and 18
`.test-d.ts` type assertions, MIT, attribution kept in `UPSTREAM-LICENSE`. Testing against the real library's
fixtures proves compatibility rather than asserting it, and it already corrected four errors in this spec
before a line of code was written.

The translation is direct and is the heart of the test plan:

| upstream, type level | here, runtime |
|---|---|
| `expectAssignable<Model>({ ... })` | the emitted schema `.parse()` accepts that value |
| `expectNotAssignable<Model>({ ... })` | the emitted schema `.parse()` throws a ZodError |

So `array.test-d.ts` asserting `[[[[1,2,3]],[[4,5,6]]]]` assignable and `[[[[1,2,3]],[[4,5,'6']]]]` not
becomes two runtime assertions on the generated Zod. Any case the converter declares unconvertible is
recorded as a known gap rather than silently skipped, so the coverage against upstream is legible.

Beyond the corpus, the bar this repo already applies: run the generator, run the emitted code, and check
the packaged artifact rather than the working tree.

1. **Byte-identical default.** Generate a fixture with no `typedJson` config, before and after, and diff.
   Any difference is a regression.
2. **PJTG-annotated schema with PZG unconfigured** still generates and still emits `jsonSchema`. This is
   the compatibility contract from section 2 point 3.
3. Each `![...]` conversion in the table, asserted on emitted text **and** executed: the emitted schema
   must accept a valid value and reject an invalid one.
4. `[TypeName]` resolution through all three paths, including the unresolved-warning path.
5. Arrays: `Json[]` with `[TypeName]` wraps in `z.array`, `Json` does not.
6. Optional and required fields keep their existing null-sentinel wrapping.
7. Emitted namespace typechecks: compile a fixture consuming `PrismaJson.WorkflowNode` and assert `tsc`
   exits 0, since a namespace that does not compile is worse than none.
8. Filters remain untyped.
9. Packaged-artifact run: `npm pack`, install into an empty project, generate, execute.
