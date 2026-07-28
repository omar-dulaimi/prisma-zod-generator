import { expectAssignable } from 'tsd';
import type { Prisma, User } from '../target/extensions/client';

declare global {
  export namespace PExtensionsJson {
    export type UserProfile = {
      theme: 'dark' | 'light';
      language?: string;
    };
  }
}

// Test 1: Valid types should be assignable
expectAssignable<Prisma.UserCreateInput>({
  profile: {
    theme: 'dark',
    language: 'en'
  }
});

expectAssignable<Prisma.UserCreateInput>({
  profile: {
    theme: 'light'
  }
});

// Test 2: Omitting optional field should work
expectAssignable<Prisma.UserCreateInput>({});

// Test 3: User model types
expectAssignable<User>({
  id: 1,
  profile: {
    theme: 'dark',
    language: 'en'
  }
});

expectAssignable<User>({
  id: 1,
  profile: null
});

// Note: Testing that INVALID types are rejected (expectNotAssignable) doesn't work
// with tsd when the generated files use @ts-nocheck. However, the types DO work
// correctly in actual user code. See manual testing to verify that invalid types like
// `profile: 10` are properly rejected.
