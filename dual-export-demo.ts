import { z } from 'zod';
import {
  PostFindManySchema, // ❌ Type-safe: No methods
  PostFindManyZodSchema, // ✅ Method-friendly: Full methods
  PostSelectSchema, // ❌ Type-safe: No methods
  PostSelectZodSchema, // ✅ Method-friendly: Full methods
} from './prisma/generated/schemas/findManyPost.schema';

console.log('🚀 Dual Export Demo - Choose Your Trade-off!\n');

// ❌ TYPE-SAFE VERSIONS - These will show TypeScript errors but work at runtime
console.log('❌ Type-Safe Versions (Perfect inference, no methods):');

// These should show TypeScript errors in VS Code:
PostFindManySchema.extend({ custom: z.string() }); // ❌ TS Error: Property 'extend' does not exist
PostFindManySchema.omit({ take: true }); // ❌ TS Error: Property 'omit' does not exist
PostSelectSchema.partial(); // ❌ TS Error: Property 'partial' does not exist

// But type inference is PERFECT:
type PerfectType = z.infer<typeof PostFindManySchema>; // ✅ Perfect Prisma.PostFindManyArgs

// ✅ METHOD-FRIENDLY VERSIONS - These work perfectly in TypeScript
console.log('✅ Method-Friendly Versions (Full methods, loose inference):');

// These work perfectly:
const extended = PostFindManyZodSchema.extend({ custom: z.string() }); // ✅ Works!
const omitted = PostFindManyZodSchema.omit({ take: true }); // ✅ Works!
const partial = PostSelectZodSchema.partial(); // ✅ Works!
const merged = PostFindManyZodSchema.merge(z.object({ extra: z.boolean() })); // ✅ Works!

// Type inference is still good (but not explicitly bound to Prisma types):
type LooseType = z.infer<typeof PostFindManyZodSchema>; // ✅ Good inference

console.log('🎯 Perfect! Users get both worlds:');
console.log('   📐 PostFindManySchema: Perfect Prisma type binding');
console.log('   🔧 PostFindManyZodSchema: Full Zod method arsenal');
console.log('   🎨 Use based on your needs - type safety vs method flexibility');

// Example usage patterns:
console.log('\n📋 Usage Patterns:');
console.log('1. API validation (type safety): PostFindManySchema');
console.log('2. Schema composition (methods): PostFindManyZodSchema');
console.log('3. Runtime parsing: Either works identically');
console.log('4. Type inference: Both provide excellent IntelliSense');
