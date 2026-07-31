# Closing the typed-JSON parity gaps

Status: plan, round 3, after two scrutiny passes. Ready to implement.
Follows: `2026-07-28-typed-json-fields-design.md`, shipped on `feat/typed-json-fields` at 197/230

## What is actually left, measured

The 33 gaps were labelled by shape in the conformance snapshot. Reading the emitted files shows they are
not 33 problems, they are **two code paths plus a residue**.

### Class A: nested list-operation wrappers (19 gaps)

The outer field is already typed. The wrapper object it points at is not.

```ts
// WorkflowUncheckedUpdateManyInput.schema.ts   CORRECT today
steps: z.union([z.lazy(() => WorkflowUpdatestepsInputObjectSchema), WorkflowNodeSchema.array()]).optional(),

// WorkflowUpdatestepsInput.schema.ts           WRONG today
set:  jsonSchema.array().optional(),
push: z.union([jsonSchema, jsonSchema.array()]).optional()

// WorkflowCreatestepsInput.schema.ts           WRONG today
set: jsonSchema.array()
```

`{ set: [<node>] }` and `{ push: <node> }` are how a list field is actually written through Prisma, so this
is the path users hit, not an edge case. Both should use the resolved schema.

Covers: 15 `UpdateManyInput`, 2 `ModelUpdateInput`, 1 `StringArrayModelUpdateInput`,
1 `StringArrayModelCreateInput`.

### Class B: result schemas (7 gaps)

`schemas/results/*.schema.ts` is a separate generator (`src/generators/results.ts`) and applies **no**
typed-JSON at all. Worse than Class A: it does not even carry the scalar annotations.

```ts
// WorkflowGroupByResult.schema.ts   WRONG today
nodes: z.unknown(),                  // should be WorkflowNodeSchema
steps: z.array(z.unknown()),         // should be z.array(WorkflowNodeSchema)
meta:  z.unknown(),                  // should be MetaSchema
label: z.string(),                   // should be z.enum(['A','B'])
tier:  z.number().int(),             // should be z.union([z.literal(1), z.literal(2)])
```

Note `_min` / `_max` are nested **inside** `WorkflowGroupByResult`, not separate files, so the 2 aggregate
gaps are the same fix rather than a third path. Twelve result schemas are emitted per model; the annotation
belongs in all of them that carry the field.

Covers: 5 `ModelGroupByOutputType`, 1 `ModelMinAggregateOutputType`, 1 `ModelMaxAggregateOutputType`.

Twelve result schemas exist per model (`FindMany`, `FindFirst`, `Create`, `Update`, `GroupBy`, `Aggregate`,
and so on). The corpus only asserts against GroupBy and the aggregates, but fixing only those would leave
`FindManyResult` still saying `label: z.string()`, which is the inconsistency this is meant to remove. Do
all of them, and let the corpus score be a side effect rather than the target.

### Class C: not expressible at runtime (about 6 gaps)

`expectNotType<Model>({ field: {} as any })` asserts that **the TypeScript type is not `any`**. A Zod schema
validates a value; it cannot assert anything about a type's identity. Same for upstream's `strictUndefined`
behaviour, which is a compiler flag rather than a validation rule.

These are not PZG defects and they are not closable. They are artefacts of translating type-level assertions
into runtime ones, and the translation is still worth having for the other 224.

**So the honest ceiling is about 224 of 230, not 230.** Any plan claiming 100% is claiming something the
corpus cannot express.

And 224 is not "parity with PJTG" either. It is parity with *a runtime translation of PJTG's type tests*,
which is a strictly harder standard in places (result schemas) and an impossible one in others (`as any`).
The number is a useful regression scoreboard. It is not a marketing claim and should not become one.

## The work

### 1. Class A: type the list-operation wrappers

Find where `Create<field>Input` / `Update<field>Input` object schemas are generated and thread the resolved
schema into the `set` and `push` positions, exactly as the outer field already does. The resolution is
already built and tested; this is a second call site, not new logic.

Risk: these wrappers are generated for every list field of every scalar type. The change must be inert when
the field has no annotation.

Checked, and the existing behaviour is reassuring: `tags String[]` with no annotation already emits
`set: z.string().array()`, so the wrapper reflects the field's scalar type rather than defaulting to
`jsonSchema`. The change is a substitution at a position that already varies by field, not a new branch.

### 2. Class B: type the result schemas

`src/generators/results.ts` needs the same annotation lookup the CRUD and pure-model paths use. It currently
has no access to it, so this is genuinely new plumbing rather than a second call site.

**Scrutiny changed the justification for this, and the justification matters.**

The original reason was "close 7 corpus gaps". That reason is wrong. Upstream's
`expectNotAssignable<ModelGroupByOutputType>` is a **compile-time** claim: PJTG rewrites `index.d.ts` and
has no runtime component at all. A mistyped row does not throw in PJTG, it is merely mistyped. So making
PZG's result schema `.parse()` throw is **stricter than upstream, not parity with it**. Anyone selling this
as "matching PJTG" would be describing it wrongly.

The real reason to do it is that **PZG is already self-inconsistent**, with or without PJTG in the picture.
The same field, the same annotation, two different answers depending on which emitted schema you reach for:

```ts
// input schema  (WorkflowCreateInput)
label: z.enum(['A', 'B']),
// result schema (WorkflowFindManyResult)
label: z.string(),
```

That is a defect on its own terms. Fixing it happens to close 7 corpus gaps; the gaps are the symptom.

**The hazard is real and needs a decision, not a footnote.** A result schema describes what the database
returned. A row written before the annotation existed will now fail validation on READ. The input path
cannot have this problem, because input is what the caller is about to send.

Round 2 decided "default true, because self-consistency". **Round 3 reverses that**, on a measurement:

Result schemas are emitted **by default**. The fixture used here produced 14 of them with no `emit` config
at all. So typing them by default is not a quiet nicety for people who opted into result validation, it
changes the read path for everyone who enables `typedJson`.

Weigh the two failure modes rather than the two principles:

| default | what goes wrong |
|---|---|
| `true` | a row written before the annotation existed now throws on READ. A production incident, in someone else's data, triggered by adding an annotation. |
| `false` | the result schema disagrees with the input schema until the user opts in. Confusing, documented, breaks nothing. |

The second is plainly the lesser harm, and it is the only one that cannot page someone at night.

Decision: `typedJson.applyToResults`, **defaulting to false**. The self-consistency argument from round 2 is
still true, but it is a documentation problem, not a reason to make the strict thing the default. Being
loudly inconsistent and safe beats being quietly strict about data already in the database.

Consequence, stated so nobody is surprised: the 7 Class B gaps stay open in the default configuration. The
flag closes them. The gap list must say so.

### 3. Interop documentation

The 421k/week prisma-json-types-generator audience does not need to switch, and telling them to would be
wrong: PZG cannot type the Prisma Client, which is what that library is for. The accurate pitch is additive.
README section plus a docs page, with the six-line config and an explicit statement of what PZG does not do.

### 4. Not in scope

Rewriting Prisma's generated client. That is PJTG's mechanism, it fights `prisma generate`, and duplicating
it to compete with a 4x-larger incumbent on their own ground needs a better reason than parity.

## Test plan

TDD throughout, and the corpus tally is the scoreboard: `EXPECTED_TALLY` must move from
`{cases:230, matching:197, gaps:33}` to whatever is genuinely achieved, in the same commit as the change.

- Unit: wrapper typing and result typing, each red first.
- Integration: generate from a fixture, assert emitted text for Class A and Class B.
- **e2e, the one that matters**: pack the real artifact, install into an empty project, generate, then
  `.parse()` a `{ set: [...] }` and a `{ push: ... }` payload with valid and invalid values.
- Regression: the byte-identical no-config diff, re-run. This is the 106k-a-week contract.
