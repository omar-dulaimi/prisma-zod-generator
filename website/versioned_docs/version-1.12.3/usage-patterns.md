---
id: usage-patterns
title: Usage Patterns
---

Common integration scenarios.

## tRPC Procedures

```ts
import { UserInputSchema, UserResultSchema } from './prisma/generated/schemas';

export const userRouter = t.router({
  create: t.procedure
    .input(UserInputSchema)
    .mutation(({ ctx, input }) => ctx.prisma.user.create({ data: input })),
});
```

## Express / Fastify

```ts
app.post('/users', (req, res) => {
  const parsed = UserInputSchema.parse(req.body);
  // ...
});
```

## Next.js Route Handler

```ts
export async function POST(req: Request) {
  const body = await req.json();
  const data = UserInputSchema.parse(body);
  return NextResponse.json(data);
}
```

## Form Validation

Use `safeParse` for user-facing error messaging.
