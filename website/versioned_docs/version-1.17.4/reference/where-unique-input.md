---
id: where-unique-input
title: WhereUniqueInput Semantics
---

The generator aligns `WhereUniqueInput` validation with Prisma Client behavior:

- Accepts at least one unique selector (single-field unique or primary key)
- Supports composite uniques; if any field from a composite is present, all fields of that composite must be provided
- Keeps the object strict (no extra keys)

What changed

- Unique fields are no longer forced required individually. Instead, the input object contains optional unique fields, with a refinement that requires at least one valid unique selector (single or composite).
- For composite uniques, partial objects are rejected with helpful messages.

Examples

Single-field unique (id or email)
```ts
// ✅ OK: any single unique selector
where: { id: 1 }
where: { email: 'alice@example.com' }

// ❌ Not OK: empty object
where: { }
```

Composite uniques
```ts
// Given @@unique([a, b]) on Model
// ✅ OK: full composite
where: { a: 'A', b: 'B' }

// ❌ Not OK: partial composite
where: { a: 'A' } // Missing 'b'
```

Nested connect
```ts
// ✅ OK: typical connect by unique field
author: { connect: { email: 'alice@example.com' } }
```

Validation rules (conceptual)

- Model unique singles (e.g., `id`, `email`) are optional fields on the object schema
- Composite unique groups are expressed via a superRefine:
  - If any field of a group is present, the entire group is required
  - At least one of:
    - Any single-field unique present, or
    - Any full composite group present

Compatibility

- Matches Prisma Client semantics for `connect`, `findUnique`, etc.
- Reduces client friction by avoiding “all uniques required” validation errors
- Strict object mode prevents extra keys

Notes

- Generated files for `WhereUniqueInput` are used across CRUD and nested operations, e.g., `findUnique`, `findFirst`, `update`, `delete`, and relation `connect`.
- The refinement is internal to the generator and does not require configuration to enable.

Troubleshooting

- “Provide at least one unique selector”
  - The object is empty or does not include any recognized single unique fields or complete composite groups
- “All fields of composite unique must be provided”
  - A composite group is partially specified; include all fields of that composite set