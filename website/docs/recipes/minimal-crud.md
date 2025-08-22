---
id: minimal-crud
title: Minimal CRUD
---

```jsonc
{
  "mode": "minimal",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true },
    "input": { "enabled": true },
    "result": { "enabled": false },
  },
}
```

Produces lean create/update/find schemas, prunes deep nested inputs, disables select/include.

## Schema Generation Behavior

In minimal mode, the generator optimizes schema generation for simplicity and performance:

### Create Operations
- **Uses `UncheckedCreateInput` schemas only**: Create operations (e.g., `UserCreateOne`) use only `UncheckedCreateInputObjectSchema` instead of the union of both `CreateInput` and `UncheckedCreateInput`
- **Blocks complex `CreateInput` schemas**: Regular `*CreateInput.schema.ts` files are not generated since they require complex nested relation objects
- **Favors foreign keys**: `UncheckedCreateInput` schemas use simple foreign key fields (e.g., `userId: string`) instead of nested relation objects (e.g., `user: UserCreateNestedOneInput`)

### Update Operations
- **Allows both variants**: Update operations continue to support both `UpdateInput` and `UncheckedUpdateInput` schemas
- **Maintains flexibility**: Users can choose between relation-based updates or foreign key-based updates

### Blocked Schema Types
Minimal mode blocks generation of these complex input types:
- `*CreateInput` (regular, relation-based)
- `*CreateNestedInput` 
- `*CreateWithoutInput`
- `*CreateOrConnectWithoutInput`
- `*CreateManyWithoutInput`
- Various nested and relation-heavy input schemas

### Example Output
```typescript
// ✅ Generated in minimal mode
export const UserCreateOneSchema = z.object({
  data: UserUncheckedCreateInputObjectSchema  // Only unchecked variant
})

// ✅ Generated - UncheckedCreateInput with foreign keys
export const UserUncheckedCreateInputObjectSchema = z.object({
  id: z.string().optional(),
  companyId: z.string(),  // Foreign key instead of nested relation
  name: z.string(),
  email: z.string()
})

// ❌ Not generated in minimal mode - would require complex relations
// UserCreateInputObjectSchema with nested { company: CompanyCreateNestedOneInput }
```

This approach ensures TypeScript compatibility while keeping the generated schemas lean and focused on essential CRUD operations.
