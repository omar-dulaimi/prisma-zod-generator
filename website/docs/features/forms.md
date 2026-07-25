---
title: Form UX Pack
---

> **Available in:** Starter, Professional, Business, Enterprise tiers

Schema-driven React forms with automatic validation. Generate fully-typed form components from your Prisma schema using React Hook Form and Zod.

## Why Use Form UX Pack

**Problem**: Building forms is repetitive and error-prone:
- Manually creating form components for each model
- Writing validation logic that duplicates schema rules
- Keeping forms in sync with database schema changes
- Handling complex nested relationships
- Managing form state, errors, and submissions

**Solution**: Auto-generate type-safe form components from your Prisma schema with built-in validation, error handling, and customizable UI.

### Benefits

- **Zero Boilerplate**: Forms generated from schema
- **Type Safety**: Full TypeScript from database to UI
- **Auto Validation**: Zod schemas automatically applied
- **Five UI libraries**: barebones, shadcn/ui, MUI, Chakra v3 and Mantine, or swap in your own
- **Nested Relations**: Handle complex data structures
- **Form State**: Built-in loading, error, and success states

## Prerequisites

```bash
# Core dependencies
pnpm add react react-dom react-hook-form @hookform/resolvers zod @prisma/client

# UI library (optional - example with shadcn/ui)
pnpm add class-variance-authority clsx tailwind-merge
npx shadcn@latest init

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableForms = true

  // Optional advanced config (stringified JSON)
  // forms = "{ \"uiLibrary\": \"shadcn\", \"enableI18n\": true, \"i18nNamespace\": \"forms\", \"generateTests\": true }"
}
```

> Pass additional options (UI library, i18n, tests, etc.) through the `forms` JSON string. All keys must be valid JSON and wrapped in quotes inside the Prisma schema.

Then run:

```bash
prisma generate
```

> **Note**: `uiLibrary` accepts `barebones` and `shadcn`. Use `barebones` for
> framework-agnostic forms built from plain elements, or `shadcn` for components
> wired to shadcn/ui primitives (`Input`, `Textarea`, `Checkbox`, `Select`).
>
> All five values are implemented from **2.4.3+**: `barebones`, `shadcn`, `mui`,
> `chakra` and `mantine`. An unrecognised value falls back to `barebones` and says
> so. (Between 2.4.1 and 2.4.2 `mui`/`chakra`/`mantine` fell back to barebones;
> before 2.4.1 they emitted shadcn markup with no imports, which could not compile.)
>
> Install the peer dependencies for whichever you choose:
>
> ```bash
> # mui
> pnpm add @mui/material @emotion/react @emotion/styled
> # chakra (v3)
> pnpm add @chakra-ui/react
> # mantine
> pnpm add @mantine/core
> ```
>
> `mui`, `chakra` and `mantine` render through react-hook-form's `Controller`,
> because their inputs are controlled — `register()` alone does not propagate a
> Select or Checkbox change. Enum columns become a select populated with the enum's
> members in every variant.

:::note Chakra targets v3
The emitted components use the v3 API — `Field.Root`/`Field.Label`/`Field.ErrorText`,
`NativeSelect`, compound `Checkbox`, and `disabled` rather than `isDisabled`. They do
not compile against Chakra v2, whose `FormControl`/`FormLabel`/`FormErrorMessage`
were removed in v3.
:::

### Generated Files

```
generated/
  pro/
    forms/
      components/
        UserForm.tsx         # User form component
        PostForm.tsx         # Post form component
      validation/
        UserValidation.ts    # User validation helpers
        PostValidation.ts    # Post validation helpers
      i18n/                  # i18n translation keys (if enabled)
        user.json
        post.json
      __tests__/             # Form tests (if enabled)
        UserForm.test.tsx
        PostForm.test.tsx
      zod.ts                 # Zod schemas for all models
      index.ts               # Exports all forms and validation
      README.md              # Usage documentation
```

## Basic Usage

```tsx
// app/users/create/page.tsx
import { UserForm } from '@/generated/pro/forms'

export default function CreateUserPage() {
  return (
    <UserForm
      defaultValues={{
        email: '',
        name: ''
      }}
      onSubmit={async (data) => {
        // Send to API
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          console.log('User created')
        }
      }}
    />
  )
}
```

### Edit Form Example

```tsx
// app/users/[id]/edit/page.tsx
import { UserForm } from '@/generated/pro/forms'

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const user = await fetch(`/api/users/${params.id}`).then(r => r.json())

  return (
    <UserForm
      defaultValues={user}
      onSubmit={async (data) => {
        await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
      }}
    />
  )
}
```

## Integration Notes

### Validation & Controllers

Generated forms rely on `react-hook-form` with Zod validation. For shadcn output, the generator uses `Controller` with shadcn primitives (`Input`, `Textarea`, `Checkbox`, and `Select`) and avoids the deprecated `@/components/ui/form` abstraction. If you prefer manual `register()` calls (e.g., for simple text inputs), you can still wire up `useForm` directly—just make sure to use the same Zod resolver.

### Schema Imports

The generated forms import validation schemas from your Prisma Zod output. Prefer importing from a generated aggregator (e.g., `prisma/zod/index.ts`) that maps long object names to short forms like `UserCreateInputSchema`.

### Nested Relations

If a Prisma create schema includes nested relations, provide a compatible default (e.g., `{}`) or render nested form fields to handle the relationship data.

### Customizing UI

The generated form components are designed to work with your UI library of choice. You can:
- Swap out the default input components
- Add custom styling and classes
- Integrate with component libraries like shadcn/ui, MUI, Chakra, etc.
- Customize error display and form layout

## Example: shadcn/ui Integration

```tsx
// Example using RHF register + shadcn/ui inputs
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserSchema } from '@/generated/pro/forms/zod'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type UserFormValues = z.infer<typeof UserSchema>

export function UserForm({ defaultValues, onSubmit }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(UserSchema),
    defaultValues,
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register('email')} />
        {form.formState.errors.email && (
          <p className="text-sm text-red-500">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </Button>
    </form>
  )
}
```

## See Also

- [Server Actions Pack](./server-actions.md) - Integrate with Next.js server actions
- [API Docs Pack](./api-docs.md) - Test forms against mock API
- [SDK Publisher](./sdk.md) - Use generated SDK for form submissions
