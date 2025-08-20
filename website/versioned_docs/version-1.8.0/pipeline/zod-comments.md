---
id: zod-comments
title: '@zod Comment Annotations'
---

Use triple-slash Prisma doc comments with `@zod` to append validations.

```prisma
model User {
  id    String @id @default(cuid())
  /// @zod .email().min(5)
  email String @unique
}
```

Result:

```ts
export const UserSchema = z
  .object({
    email: z.string().email().min(5),
    // ...
  })
  .strict();
```

Annotations are concatenated after base type; unsafe expressions are not executed (string append model). Keep rules pure.
