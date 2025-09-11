# GitHub Issue #228 Analysis: @zod.json() and @zod.enum() Problems

**Issue**: [Bug]: Two `/// @zod` comment scenarios not working  
**Status**: OPEN  
**Reporter**: zacharyhansen  
**Assignee**: omar-dulaimi  

## Summary

User reported two specific `@zod` annotation issues:
1. `@zod.json()` annotation not working correctly
2. `@zod.enum()` generating invalid TypeScript with Zod v4 compatibility issues

## User's Schema

```prisma
model DocExtractAgent {
  lc_agent_id          String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  /// @zod.json()
  data_schema          Json              @db.JsonB

  /// @zod.enum(["openai-gpt-4-1", "openai-gpt-4-1-mini", "openai-gpt-4-1-nano", "openai-gpt-5", "openai-gpt-5-mini", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro", "openai-gpt-4o", "openai-gpt-4o-mini"])
  extract_model        String?

  @@map("doc_extract_agent")
}
```

## Generated Output (Problematic)

```typescript
export const DocExtractAgentSchema = z.object({
  lc_agent_id: z.string(),
  
  // Issue 1: @zod.json() not working
  data_schema: z.unknown().refine((val) => { /* complex depth validation */ }),

  // Issue 2: Invalid z.string().enum() syntax
  extract_model: z.string().enum(['openai-gpt-4-1', /* ... */]).nullish(),
});
```

## Investigation Findings

### ✅ Issue 1: @zod.json() Not Supported - CONFIRMED

**Root Cause**: `@zod.json()` method is not implemented in the parser

**Evidence**: 
- Search through `src/parsers/zodComments.ts` shows no `json` method configuration
- The `additionalMethods` array (line 917-928) includes `'object'`, `'array'`, `'record'` but not `'json'`
- The method validation logic (line 940) throws "Unknown @zod method" for unsupported methods

**What happens**: 
1. User writes `/// @zod.json()`
2. Parser validates against known methods and fails
3. Falls back to default JSON handling: `z.unknown().refine(...)` with depth validation
4. The `@zod.json()` annotation is effectively ignored

**Zod Documentation**: `z.json()` is a valid Zod method that validates JSON-encodable values (strings, numbers, booleans, null, arrays, records).

### ✅ Issue 2: z.string().enum() Invalid Syntax - CONFIRMED

**Root Cause**: Generator incorrectly chains `z.string().enum()` which is invalid in Zod v4

**Evidence**: 
- Generated code: `z.string().enum(['value1', 'value2']).nullish()`
- This creates TypeScript error: `Property 'enum' does not exist on type 'ZodString'`

**Architecture Issue**:
1. Base type mapping creates `z.string()` for `String?` field
2. `@zod.enum()` annotation gets processed as a chained method: `.enum(['values'])`
3. Final result: `z.string().enum()` - which is invalid syntax

**Correct Zod v4 Syntax**: Should be `z.enum(['value1', 'value2'])` not `z.string().enum()`

### ✅ Issue 3: Zod v4 Compatibility Problems - CONFIRMED

**Root Cause**: Generator wasn't designed with Zod v4 enum API changes in mind

**Zod v4 Breaking Changes**:
1. `z.string().enum()` method doesn't exist - enums are standalone: `z.enum()`
2. `z.nativeEnum()` deprecated in favor of direct `z.enum()` usage
3. Enum access patterns changed (`.enum` property instead of `.Enum/.Values`)

**User's Config**: Uses `"zodImportTarget": "v4"` which triggers v4 import style but doesn't fix enum generation logic.

## Architecture Analysis

### Current Enum Handling Logic

**File**: `src/parsers/zodComments.ts:1395-1400`
```typescript
{
  methodName: 'enum',
  zodMethod: 'enum',
  parameterCount: 1,
  fieldTypeCompatibility: ['String'],
},
```

**Problem**: The logic assumes `.enum()` is a method that can be chained to base types, but in Zod v4:
- `z.string().enum()` ❌ Invalid
- `z.enum()` ✅ Correct

### Current JSON Handling

**Missing**: No `json` method configuration in the validation method configs.

**Current JSON Logic**: Found in `src/generators/model.ts:772-836`
- Uses `z.unknown()` with custom refine logic for depth validation
- Ignores `@zod.json()` annotations completely

## Expected vs Actual Behavior

### For @zod.json()
```typescript
// User Input
/// @zod.json()
data_schema: Json

// Expected Output
data_schema: z.json()

// Actual Output  
data_schema: z.unknown().refine(/* depth validation */)
```

### For @zod.enum()
```typescript
// User Input
/// @zod.enum(["value1", "value2"])
extract_model: String?

// Expected Output (Zod v4)
extract_model: z.enum(["value1", "value2"]).nullish()

// Actual Output (Invalid)
extract_model: z.string().enum(["value1", "value2"]).nullish()
```

## Recommended Fixes

### Fix 1: Add z.json() Support
Add to `src/parsers/zodComments.ts` method configs:
```typescript
{
  methodName: 'json',
  zodMethod: 'json', 
  parameterCount: 0,
  fieldTypeCompatibility: ['Json'],
},
```

### Fix 2: Fix Enum Generation for Zod v4
Update enum handling in `src/parsers/zodComments.ts` and generator logic:

```typescript
// For @zod.enum() annotations, replace the base type entirely
if (annotation.method === 'enum' && baseType.startsWith('z.string()')) {
  // Replace z.string() with z.enum() 
  result.zodSchema = `z.enum(${formatParameters(annotation.parameters)})`;
} else {
  // Regular chaining logic
  result.zodSchema = `${baseType}${chainedMethods}`;
}
```

### Fix 3: Zod v4 Compatibility Layer
Create version-aware handling:
```typescript
if (config.zodVersion === 'v4' && annotation.method === 'enum') {
  // Use standalone z.enum() syntax
} else {
  // Legacy v3 handling
}
```

## Test Cases to Add

1. **JSON annotation**: `/// @zod.json()` should generate `z.json()`
2. **Enum annotation**: `/// @zod.enum(["a", "b"])` should generate `z.enum(["a", "b"])`  
3. **Enum with optional**: `/// @zod.enum(["a", "b"])` on `String?` should generate `z.enum(["a", "b"]).nullish()`
4. **Zod v4 import**: Config with `"zodImportTarget": "v4"` should use correct syntax

## Impact Assessment

- **Severity**: High - Generates TypeScript compilation errors  
- **Users Affected**: Anyone using `@zod.enum()` or `@zod.json()` annotations, especially with Zod v4
- **Workaround**: None available for these specific annotations
- **Breaking Change**: Fixes should be backward compatible

## Files to Modify

1. `src/parsers/zodComments.ts` - Add JSON method, fix enum logic
2. `src/generators/model.ts` - Update field mapping for special enum/json cases
3. Test files - Add coverage for both scenarios
4. Documentation - Update examples for Zod v4 compatibility

## Configuration Context

User's config shows they're using:
- `"zodImportTarget": "v4"` - Zod v4 imports
- `"mode": "minimal"` - Simplified generation
- `"pureModels": true` - Pure model schemas only

The generator needs to respect v4 syntax rules when this target is specified.