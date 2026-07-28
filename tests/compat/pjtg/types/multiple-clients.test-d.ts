import { expectAssignable, expectNotAssignable, expectType } from 'tsd';
import type {
  PrismaClient as PrismaClientNew,
  User as UserNew
} from '../target/multiple-clients-new/client';
import type {
  PrismaClient as PrismaClientOld,
  User as UserOld
} from '../target/multiple-clients-old/client';

declare global {
  export namespace PMultipleClientsJson {
    export type Profile = {
      name: string;
      age: number;
    };

    export type Settings = {
      theme: 'light' | 'dark';
      notifications: boolean;
    };

    export type Tag = string;
  }
}

// Test OLD client generator output
expectAssignable<UserOld>({
  id: 1,
  profile: { name: 'John', age: 30 },
  settings: { theme: 'dark', notifications: true },
  tags: ['developer', 'typescript']
});

expectAssignable<UserOld>({
  id: 2,
  profile: { name: 'Jane', age: 25 },
  settings: null,
  tags: []
});

expectNotAssignable<UserOld>({
  id: 3,
  profile: { name: 'Invalid', age: '30' }, // age should be number
  settings: null,
  tags: []
});

expectNotAssignable<UserOld>({
  id: 4,
  profile: { name: 'Bob', age: 40 },
  settings: { theme: 'invalid', notifications: true }, // invalid theme
  tags: []
});

expectNotAssignable<UserOld>({
  id: 5,
  profile: { name: 'Alice', age: 35 },
  settings: null,
  tags: [123] // should be string[]
});

// Test NEW client generator output - should have identical typing
expectAssignable<UserNew>({
  id: 1,
  profile: { name: 'John', age: 30 },
  settings: { theme: 'light', notifications: false },
  tags: ['engineer', 'javascript']
});

expectAssignable<UserNew>({
  id: 2,
  profile: { name: 'Jane', age: 25 },
  settings: null,
  tags: []
});

expectNotAssignable<UserNew>({
  id: 3,
  profile: { name: 'Invalid', age: '30' }, // age should be number
  settings: null,
  tags: []
});

expectNotAssignable<UserNew>({
  id: 4,
  profile: { name: 'Bob', age: 40 },
  settings: { theme: 'blue', notifications: true }, // invalid theme
  tags: []
});

expectNotAssignable<UserNew>({
  id: 5,
  profile: { name: 'Alice', age: 35 },
  settings: null,
  tags: [true, false] // should be string[]
});

// Verify both clients have the same type structure
declare const prismaOld: PrismaClientOld;
declare const prismaNew: PrismaClientNew;

(async () => {
  const userOld = await prismaOld.user.findFirst();
  const userNew = await prismaNew.user.findFirst();

  if (userOld) {
    expectType<PMultipleClientsJson.Profile>(userOld.profile);
    expectType<PMultipleClientsJson.Settings | null>(userOld.settings);
    expectType<PMultipleClientsJson.Tag[]>(userOld.tags);
  }

  if (userNew) {
    expectType<PMultipleClientsJson.Profile>(userNew.profile);
    expectType<PMultipleClientsJson.Settings | null>(userNew.settings);
    expectType<PMultipleClientsJson.Tag[]>(userNew.tags);
  }
})();

// Verify profile field structure on both clients
(async () => {
  const userOld = await prismaOld.user.findFirst();
  if (userOld) {
    expectType<string>(userOld.profile.name);
    expectType<number>(userOld.profile.age);
  }

  const userNew = await prismaNew.user.findFirst();
  if (userNew) {
    expectType<string>(userNew.profile.name);
    expectType<number>(userNew.profile.age);
  }
})();

// Verify settings field structure on both clients
(async () => {
  const userOld = await prismaOld.user.findFirst();
  if (userOld?.settings) {
    expectType<'light' | 'dark'>(userOld.settings.theme);
    expectType<boolean>(userOld.settings.notifications);
  }

  const userNew = await prismaNew.user.findFirst();
  if (userNew?.settings) {
    expectType<'light' | 'dark'>(userNew.settings.theme);
    expectType<boolean>(userNew.settings.notifications);
  }
})();
