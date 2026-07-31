---
id: prisma-json-types-generator
title: prisma-json-types-generator
sidebar_label: prisma-json-types-generator
description: Read prisma-json-types-generator's /// [TypeName] and /// ![<ts type>] annotations and validate those fields at runtime, without changing your schema or dropping PJTG.
---

[prisma-json-types-generator](https://github.com/arthurfiorette/prisma-json-types-generator) (PJTG) types
your `Json` columns in the **generated Prisma Client**. It has no runtime component. PZG validates at
runtime but, until now, could not see PJTG's annotations at all.

`typedJson` closes that half. PZG reads PJTG's annotation syntax unchanged and builds Zod schemas from it,
so the same comment gives you both guarantees.

:::info This is additive. Keep PJTG installed.
PZG **cannot** type the Prisma Client, and nothing on this page changes that. If you drop PJTG, you lose
`prisma.workflow.findFirst()` returning a typed `nodes`. See [Limitations](#limitations) for the
measurement.
:::

## Setup

Add a `typedJson` block. Nothing else changes: not the annotations, not the Prisma schema, not PJTG's own
configuration.

```json title="zod-generator.config.json"
{
  "typedJson": {
    "schemaModule": "./json-types"
  }
}
```

`schemaModule` is the module `[TypeName]` resolves from. Write the Zod schemas there yourself:

```ts title="prisma/generated/json-types.ts"
import * as z from 'zod';

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(['task', 'gateway']),
});
```

A relative specifier is relative to the generator **output directory** and is rewritten per emitted file,
so it resolves from wherever that file sits. A bare or scoped package specifier (`@acme/contracts`) is
used verbatim.

With no `typedJson` block, output is byte-identical to before the feature existed. The generator prints a
one-line notice instead of changing anything:

```
[typedJson] 4 field(s) carry prisma-json-types-generator annotations (Workflow.nodes,
Workflow.steps, Workflow.status, Workflow.tier), but "typedJson" is not configured, so their
schemas are unchanged. Set typedJson.schemaModule to have prisma-zod-generator use them.
```

## Annotation forms

Both of PJTG's forms are supported, and **both apply to every supported field type**, not just `Json`.

| Form | Meaning |
| --- | --- |
| `/// [TypeName]` | the field takes the shape of the schema `TypeName` resolves to |
| `/// ![<ts type>]` | the field takes an inline TypeScript type, converted to Zod |

An annotation must own its line. Leading and trailing whitespace is fine, anything else is not. That is
what stops a markdown link `[text](url)` or a bracketed aside in prose from being read as a type.

On an **array** field the annotation gives the **element** type; the array wrapping is added for you.

### `![<ts type>]` conversions

The content is TypeScript, not Zod, because PJTG has to keep reading it. Every row below is real generator
output; the rows that constrain a value were also executed against valid and invalid input:

| TypeScript | Emitted Zod |
| --- | --- |
| `![1]` | `z.literal(1)` |
| `!['draft' \| 'published']` | `z.enum(['draft', 'published'])` |
| `![1 \| 2 \| 3]` | `z.union([z.literal(1), z.literal(2), z.literal(3)])` |
| `![string]`, `![number]`, `![boolean]`, `![bigint]` | `z.string()`, `z.number()`, `z.boolean()`, `z.bigint()` |
| `![any]`, `![unknown]`, `![never]` | `z.any()`, `z.unknown()`, `z.never()` |
| `![true]`, `![false]` | `z.literal(true)`, `z.literal(false)` |
| `![number[]]` | `z.array(z.number())` |
| `![[string, number]]` | `z.tuple([z.string(), z.number()])` |
| `![{ a: string; b?: number }]` | `z.object({ a: z.string(), b: z.number().optional() })` |
| `![WorkflowNode]` | `WorkflowNodeSchema`, resolved the same way `[WorkflowNode]` is |

Deliberately **not** supported: generics (`Record<string, number>`, `Partial<T>`), intersections,
conditional types, mapped types and index signatures, `keyof` / `typeof` / `infer`, function and
constructor types, indexed access types, template literal types, labelled or optional or rest tuple
elements, and the `object`, `symbol` and `void` keywords.

Each of those makes the **whole** conversion fail rather than half-convert. The field keeps the schema it
has today and the generator says why:

```
[typedJson] Forms.unsupported: cannot convert ![Record<string, number>] to a Zod schema because
generic type arguments are not supported. The field keeps its current schema.
```

That is the compatibility contract: a schema annotated for PJTG alone must keep generating, unchanged,
when PZG cannot use the annotation. A wrong Zod schema rejects valid production data, which is far worse
than an unconverted field.

### Resolving `[TypeName]`

In order:

1. `typedJson.map[TypeName]`, an exact Zod expression. No import is emitted for it.
2. `<TypeName><schemaSuffix>` imported from `typedJson.schemaModule`. With the default suffix,
   `[WorkflowNode]` becomes `WorkflowNodeSchema`.
3. Neither resolves: the field is left exactly as it is, with a warning.

`@zod.custom.use(...)` and `@zod.custom({...})` still win where both are present, so nothing you already
have changes.

## Worked example

```prisma title="schema.prisma"
model Workflow {
  id Int @id @default(autoincrement())

  /// [WorkflowNode]
  nodes Json

  /// [WorkflowNode]
  steps Json[]

  /// !['draft' | 'published']
  status String

  /// ![1 | 2 | 3]
  tier Int

  edges Json
  tags  String[]
}
```

`objects/WorkflowCreateInput.schema.ts`, generated with the config above:

```ts
import { WorkflowNodeSchema } from '../../json-types';

const makeSchema = () => z.object({
  nodes: z.union([JsonNullValueInputSchema, WorkflowNodeSchema]),
  steps: z.union([z.lazy(() => WorkflowCreatestepsInputObjectSchema), WorkflowNodeSchema.array()]).optional(),
  status: z.enum(['draft', 'published']),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  edges: z.union([JsonNullValueInputSchema, jsonSchema]),
  tags: z.union([z.lazy(() => WorkflowCreatetagsInputObjectSchema), z.string().array()]).optional()
}).strict();
```

Three things to notice.

`status` and `tier` are `String` and `Int` columns. Prisma cannot express `'draft' | 'published'`, and
neither library validated it before. PJTG types it, PZG now checks it.

`edges` and `tags` carry no annotation and are untouched: `edges` keeps `jsonSchema`, `tags` keeps
`z.string().array()`.

`Json` null sentinels are preserved. A required `Json` field stays wrapped in
`z.union([JsonNullValueInputSchema, <schema>])`; the typed schema replaces only the `jsonSchema` position.

### List-operation wrappers

`{ set: [...] }` and `{ push: ... }` are how a list column is actually written through Prisma, so those
wrappers take the annotation from the column they wrap:

```ts title="objects/WorkflowUpdatestepsInput.schema.ts"
const makeSchema = () => z.object({
  set: WorkflowNodeSchema.array().optional(),
  push: z.union([WorkflowNodeSchema, WorkflowNodeSchema.array()]).optional()
}).strict();
```

The unannotated `tags String[]` keeps emitting `set: z.string().array()`, exactly as before.

### Pure models

`pureModels: true` gets the same treatment, with no Prisma types involved:

```ts title="models/Workflow.schema.ts"
export const WorkflowSchema = z.object({
  id: z.number().int(),
  nodes: WorkflowNodeSchema,
  steps: z.array(WorkflowNodeSchema),
  status: z.enum(['draft', 'published']),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ...
});
```

## Removing the second source of truth

This is the part that addresses [#386](https://github.com/omar-dulaimi/prisma-zod-generator/issues/386).
The complaint was not the number of generators, it was maintaining the same shape twice: a TypeScript type
for PJTG and a Zod schema for PZG, free to drift.

`emitNamespace` makes the Zod schema the **single authored definition** and derives the TypeScript type
from it:

```json
{
  "typedJson": {
    "schemaModule": "./json-types",
    "emitNamespace": true
  }
}
```

```ts title="prisma/generated/prisma-json-types.d.ts"
import type { z } from 'zod';
import type { WorkflowNodeSchema } from './json-types';

declare global {
  namespace PrismaJson {
    /** Workflow.nodes, Workflow.steps */
    type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
  }
}

export {};
```

The namespace name defaults to `PrismaJson`, matching PJTG, so existing code reading
`PrismaJson.WorkflowNode` keeps compiling and PJTG keeps reading the same slot. You now write the shape
once, in Zod, and the type cannot drift from it.

The emitted file compiles under `strict` and the type is genuinely enforced. A missing required property
is a compile error:

```
error TS2741: Property 'kind' is missing in type '{ id: string; }' but required in
type '{ id: string; kind: "task" | "gateway"; }'.
```

## Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `typedJson.schemaModule` | string | none | Module that `[TypeName]` resolves from. Relative specifiers are relative to the output directory and rewritten per file; package specifiers are used verbatim. |
| `typedJson.schemaSuffix` | string (empty allowed) | `"Schema"` | Suffix appended to the annotation's type name. `[Foo]` → `FooSchema`. Set `""` for `[Foo]` → `Foo`. |
| `typedJson.namespace` | string (identifier) | `"PrismaJson"` | Namespace the emitted `declare global` block declares. Matches PJTG. |
| `typedJson.applyToResults` | boolean | `false` | Also apply annotations to `schemas/results/*`. See [the read-path hazard](#applytoresults-narrows-the-read-path). |
| `typedJson.emitNamespace` | boolean | `false` | Emit the `declare global` file that derives the namespace types from the Zod schemas. |
| `typedJson.namespaceOutput` | string | `"./prisma-json-types.d.ts"` | Path of the emitted namespace file, relative to the output directory. |
| `typedJson.map` | object | `{}` | Explicit `TypeName` → Zod expression overrides, checked before `schemaModule`. |

`typedJson` is config-file only. It is unrelated to `jsonSchemaCompatible` and `jsonSchemaOptions`, which
concern JSON Schema as an output format.

### `map`

The escape hatch for anything the convention cannot express. A mapped entry wins over `schemaModule` and
emits no import, so the expression must stand on its own:

```json
{
  "typedJson": {
    "schemaModule": "./json-types",
    "map": {
      "WorkflowNode": "z.record(z.string(), z.unknown())"
    }
  }
}
```

```ts
nodes: z.union([JsonNullValueInputSchema, z.record(z.string(), z.unknown())]),
```

## Limitations

### PZG does not type the Prisma Client

This is the important one, and it is measured rather than assumed. Generating a Prisma Client from the
example schema above, whose `nodes` column carries `/// [WorkflowNode]`:

```bash
$ grep -rn "PrismaJson" client/
# (no output)

$ grep -n "nodes: " client/index.d.ts
client/index.d.ts:1064:    nodes: JsonValue
```

Zero references to `PrismaJson`, and `nodes` is `JsonValue`. PJTG works by rewriting that `index.d.ts`.
A `declare global` block alone does not change it, so `emitNamespace` does not either.

The honest pipeline is:

```
Zod schema (authored) → PZG emits `type X = z.infer<typeof XSchema>` → PJTG rewrites the client
```

Keep PJTG. Duplicating its client rewrite here would be a second fragile implementation of someone else's
working feature, and it fights `prisma generate`.

### `applyToResults` narrows the read path

Off by default, and the reasoning matters more than the setting.

Left off, PZG is openly inconsistent. `status` above is `z.enum(['draft', 'published'])` in
`WorkflowCreateInput` and `z.string()` in `WorkflowFindManyResult`.

That is a real defect. It is still not worth defaulting to `true`, because **result schemas are emitted by
default**, thirteen per model, with no `emit` config at all. Typing them by default would not be a quiet
nicety for people who opted into result validation; it would change the READ path for everyone who turns
`typedJson` on. A row written before the annotation existed then throws on read: a production incident, in
data you already have, triggered by adding a comment to a Prisma schema.

Turn it on once you know every stored row conforms, or once you have backfilled:

```json
{
  "typedJson": {
    "schemaModule": "./json-types",
    "applyToResults": true
  }
}
```

```ts title="results/WorkflowFindManyResult.schema.ts, with the flag on"
  nodes: WorkflowNodeSchema,
  steps: z.array(WorkflowNodeSchema),
  status: z.enum(['draft', 'published']),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
```

`_min` and `_max` inside `GroupByResult` are narrowed too, as `.nullable()`. If you do not want result
schemas at all, `emit.results: false` or `variants.result.enabled: false` removes them
([Result Schemas](../pipeline/result-schemas.md)).

### Scalar `{ set: ... }` update wrappers are not narrowed

On a **scalar** column, `{ field: { set: value } }` goes through Prisma's shared
`StringFieldUpdateOperationsInput`, which every `String` column in the schema uses. Typing it would apply
one column's annotation to every other column, so it stays `z.string()`.

Executed against the generated schema, with `/// !['draft' | 'published']` on `status`:

```
REJECTED  { status: 'archived' }
ACCEPTED  { status: { set: 'archived' } }
ACCEPTED  { status: 'draft' }
```

The direct branch of the update union is narrowed; the operations branch is not. Annotated **list**
columns do not have this problem. Their `Create<field>Input` / `Update<field>Input` wrappers are
per-field, and are narrowed.

### Other gaps

- **Filter inputs stay untyped.** `JsonFilter` and `JsonWithAggregatesFilter` keep `jsonSchema`, matching
  PJTG's own limitation. Typing a filter is a different problem and would break `path` and
  `string_contains` operations.
- **MongoDB composite `type` blocks are not covered.** Annotations inside a composite are not applied: the
  emitter resolves a model name from the schema name, and a composite is not a model.
- **`z.infer` is not a Prisma type.** The emitted namespace gives you the schema's inferred type; it does
  not make the Prisma Client return it.

## Conformance against upstream's corpus

PJTG's own fixtures are vendored under `tests/compat/pjtg/` (18 `.prisma` schemas and 18 `.test-d.ts`
assertions, MIT, attribution in `UPSTREAM-LICENSE`). Every upstream type-level assertion is translated
into a runtime one:

| upstream, type level | here, runtime |
| --- | --- |
| `expectAssignable<Model>({ ... })` | the generated schema `.parse()` accepts that value |
| `expectNotAssignable<Model>({ ... })` | the generated schema `.parse()` throws a `ZodError` |

**214 of 230 assertions reproduce**, in the default configuration.

:::caution Read the number correctly
This is **not** "93% of PJTG". It is parity against *a runtime translation of PJTG's type tests*, which is
a stricter standard than upstream in places and an impossible one in others:

- **Stricter**: upstream's result-type assertions are compile-time claims about a client PJTG rewrote.
  PJTG never throws on a mistyped row; it is merely mistyped. Making PZG's result schema `.parse()` throw
  is more than upstream does, not the same as it.
- **Impossible**: `expectNotType<Model>({ field: {} as any })` asserts that a *type* is not `any`. A Zod
  schema validates a value; it cannot inspect a type's identity. Same for upstream's
  `strictUndefinedChecks`, which is a compiler flag.

6 of the 16 open gaps are in that impossible class, so the ceiling is roughly 224, not 230. A further 5
are the result-schema rows that [`applyToResults`](#applytoresults-narrows-the-read-path) narrows; the
pinned score is the **default** configuration, which is what a `typedJson` block gives you out of the box.
The remaining 5 are the two scalar `{ set: ... }` rows and three genuine differences (MongoDB composites,
and `groupBy` marking `_count`/`_avg`/`_sum`/`_min`/`_max` optional but not nullable).

Treat the number as a **regression scoreboard**, existing so that a gap cannot be added quietly, rather
than as a marketing claim.
:::

Every gap is pinned with its reason in `tests/typed-json-corpus-conformance.test.ts` and snapshotted, so a
gap that silently closes turns the suite red and has to be removed deliberately.

## Reference

- [Zod comment annotations](../pipeline/zod-comments.md): `@zod.custom.use`, which still wins where both
  are present
- [Result Schemas](../pipeline/result-schemas.md): what `applyToResults` narrows
- [All configuration options](../reference/config-options.md)
