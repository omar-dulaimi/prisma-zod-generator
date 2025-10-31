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
- **Customizable UI**: Bring your own components (shadcn/ui, MUI, etc.)
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
  provider = "node ./lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableForms = true

  # Optional: Choose UI library (barebones, shadcn, mantine, chakra, mui)
  # uiLibrary = "shadcn"

  # Optional: Enable i18n support
  # enableI18n = true
  # i18nNamespace = "forms"

  # Optional: Generate tests
  # generateTests = true
}
```

Then run:

```bash
prisma generate
```

> **Note**: The generator supports multiple UI libraries. Use `barebones` for framework-agnostic forms, or specify `shadcn`, `mantine`, `chakra`, or `mui` for framework-specific components.

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

### Error Messages

Each `<FormField>` uses React Hook Form's `Controller`. To render per-field errors, ensure your `FormMessage` component reads `formState.errors` (the generated UI kit supports this by default).

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
// You can customize the generated FormField component
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function UserForm({ defaultValues, onSubmit }: UserFormProps) {
  const form = useForm({
    resolver: zodResolver(UserCreateInputSchema),
    defaultValues
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register('email')}
        />
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
