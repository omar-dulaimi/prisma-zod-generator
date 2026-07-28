import { expectAssignable, expectNotAssignable } from 'tsd';
import type { Model } from '../target/normal-prisma-client/client';
import type { SubModelUncheckedUpdateManyWithoutModelInput } from '../target/normal-prisma-client/models';
import type { UpdateManyInput } from '../target/normal-prisma-client/pjtg';

declare global {
  export namespace PNormalPrismaClientJson {
    export type Simple = 1;
    export type Optional = 2;
    export type List = 3;
  }
}

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 2,
  list: [3]
});

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: null,
  list: [3]
});

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: null,
  list: []
});

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 2,
  list: [3, 3, 3]
});

expectAssignable<UpdateManyInput<Model['list'][number]>>({
  push: 3
});

expectAssignable<UpdateManyInput<Model['list'][number]>>({
  push: []
});

expectAssignable<UpdateManyInput<Model['list'][number]>>({
  push: [3]
});

expectAssignable<UpdateManyInput<Model['list'][number]>>({
  push: [3, 3, 3]
});

expectAssignable<UpdateManyInput<Model['list'][number]>>({
  set: []
});

expectAssignable<UpdateManyInput<Model['list'][number]>>({
  set: [3]
});

expectAssignable<UpdateManyInput<Model['list'][number]>>({
  set: [3, 3, 3]
});

expectAssignable<SubModelUncheckedUpdateManyWithoutModelInput['simple']>(1);

expectNotAssignable<Model>({
  id: 0,
  simple: '1',
  optional: 2,
  list: [3]
});

expectNotAssignable<Model>({
  id: 0,
  simple: 1,
  optional: '2',
  list: [3]
});

expectNotAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 'undefined',
  list: 3
});

expectNotAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 2,
  list: '3,3,3'
});

expectNotAssignable<UpdateManyInput<Model['list'][number]>>({
  push: '3'
});

expectNotAssignable<UpdateManyInput<Model['list'][number]>>({
  push: ['3']
});

expectNotAssignable<UpdateManyInput<Model['list'][number]>>({
  set: 3
});

expectNotAssignable<UpdateManyInput<Model['list'][number]>>({
  set: '3'
});

expectNotAssignable<UpdateManyInput<Model['list'][number]>>({
  set: ['3,3,3']
});

expectNotAssignable<SubModelUncheckedUpdateManyWithoutModelInput['simple']>(2);
