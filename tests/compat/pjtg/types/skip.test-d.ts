import { expectAssignable, expectNotAssignable } from 'tsd';
import { Prisma } from '../target/skip/client';

declare global {
  export namespace SkipJson {
    export type Simple = 1;
    export type Optional = 2;
    export type List = 3;
  }
}

expectAssignable<Prisma.XOR<Prisma.ModelCreateInput, Prisma.ModelUncheckedCreateInput>>({
  simple: 1,
  optional: Prisma.skip,
  list: [3]
});

expectNotAssignable<Prisma.XOR<Prisma.ModelCreateInput, Prisma.ModelUncheckedCreateInput>>({
  simple: 1,
  list: [3]
});

expectAssignable<Prisma.XOR<Prisma.ModelCreateInput, Prisma.ModelUncheckedCreateInput>>({
  simple: 1,
  optional: 2,
  list: [3]
});
