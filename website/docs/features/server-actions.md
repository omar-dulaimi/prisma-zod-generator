---
title: Server Actions Pack
---

> **Available in:** Starter, Professional, Business, Enterprise tiers

Utilities and templates for type-safe Next.js Server Actions validated by Zod schemas.

## Why Use Server Actions Pack

**Problem**: Server Actions need validation:
- Manual validation is repetitive
- Type safety lost between client/server
- Error handling inconsistent
- No standard response format

**Solution**: Generate validated Server Action stubs with automatic Zod validation and type-safe responses.

### Benefits

- **Type-Safe**: End-to-end TypeScript
- **Auto Validation**: Zod schemas applied automatically
- **Consistent Errors**: Standard error response format
- **Next.js Integration**: Works with `revalidatePath`, `redirect`, etc.

## Prerequisites

```bash
# Core dependencies
pnpm add react zod @prisma/client

# Optional: Next.js 13+ for full integration
pnpm add next

# PZG Pro license required
```

> **Note**: The generator avoids direct Next.js imports to prevent dependency issues. Next.js features like `revalidatePath()` and `redirect()` are commented out in generated code - uncomment them if using Next.js.

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableServerActions = true
}
```

Then run:

```bash
prisma generate
```

### Generated Files

```
generated/
  pro/
    server-actions/
      actions/
        user.ts          # User CRUD server actions
        post.ts          # Post CRUD server actions
      hooks/
        useUser.ts       # React hooks for User actions
        usePost.ts       # React hooks for Post actions
      types/
        common.ts        # Shared types
        user.ts          # User-specific types
        post.ts          # Post-specific types
      utils/
        validation.ts    # Validation helpers
      prisma-client.ts   # Prisma client instance
      USAGE.md           # Usage guide
```

## Basic Usage

### Server Actions

Generated server actions in `actions/user.ts`:

```ts
// Auto-generated with Zod validation and error handling
export async function createUser(
  data: Prisma.UserCreateInput
): Promise<ServerActionResult<User>> {
  try {
    const user = await prisma.user.create({ data });
    // revalidatePath('/users'); // Uncomment to enable
    return { success: true, data: user };
  } catch (error) {
    return handleServerActionError(error, 'Failed to create user');
  }
}
```

### React Hooks

Use generated hooks in `hooks/useUser.ts`:

```tsx
'use client'

import { useCreateUser } from '@/generated/pro/server-actions'

export function CreateUserForm() {
  const { execute, isPending, error } = useCreateUser({
    onSuccess: (user) => console.log('Created:', user),
    redirect: '/users'
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      execute({ name: 'John', email: 'john@example.com' });
    }}>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
```

## Next.js Integration

Generated actions include commented hints for Next.js features:

```ts
// Uncomment these in your Next.js app:
// import { revalidatePath } from 'next/cache'
// import { redirect } from 'next/navigation'

export async function createUser(data: Prisma.UserCreateInput) {
  const user = await prisma.user.create({ data });
  // revalidatePath('/users'); // Uncomment to enable cache revalidation
  // redirect('/users');        // Uncomment to enable redirect
  return { success: true, data: user };
}
```

The hooks also support redirect via options:
```ts
const { execute } = useCreateUser({
  redirect: '/users' // Logs redirect request (implement navigation as needed)
});
```

## See Also

- [Form UX Pack](./forms.md) - Generate form components
- [SDK Publisher](./sdk.md) - Type-safe API client
