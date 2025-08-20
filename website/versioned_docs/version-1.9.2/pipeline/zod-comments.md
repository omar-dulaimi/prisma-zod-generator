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

## Custom Inline Override (@zod.custom.use)

Replace an entire field schema inline:

```prisma
model AiChat {
  id        String @id @default(cuid())
  /// @zod.custom.use(z.array(z.object({ role: z.enum(['user','assistant','system']), parts: z.array(z.object({ type: z.enum(['text','image']), text: z.string() })) })))
  messages  Json   @default("[]")
}
```

Result (excerpt):

```ts
messages: z.array(
  z.object({
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.object({ type: z.enum(['text', 'image']), text: z.string() })),
  }),
).default('[]');
```

This short-circuits other annotations for that field.

Optional helper for deep JSON arrays:

```ts
import { jsonMaxDepthRefinement } from 'prisma-zod-generator';
const ChatMessagesSchema = z.array(MessageSchema)${'${jsonMaxDepthRefinement(10)}'};
```
