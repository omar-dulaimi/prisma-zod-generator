import { expectAssignable, expectNotAssignable, expectNotType, expectType } from 'tsd';
import type { Model, Text } from '../target/mongo/client';
import type { UpdateManyInput } from '../target/mongo/pjtg';

declare global {
  export namespace PMongoJson {
    export type Simple = 1;
    export type Optional = 2;
    export type List = 3;
    type WithType = 'C' | 'D';
  }
}

expectAssignable<Model>({
  id: '0',
  simple: 1,
  optional: 2,
  list: [3],
  nested: {
    simple: 1,
    optional: 2,
    list: [3]
  }
});

expectAssignable<Model>({
  id: '0',
  simple: 1,
  optional: null,
  list: [3],
  nested: {
    simple: 1,
    optional: null,
    list: [3]
  }
});

expectAssignable<Model>({
  id: '0',
  simple: 1,
  optional: null,
  list: [],
  nested: {
    simple: 1,
    optional: null,
    list: []
  }
});

expectAssignable<Model>({
  id: '0',
  simple: 1,
  optional: 2,
  list: [3, 3, 3],
  nested: {
    simple: 1,
    optional: 2,
    list: [3, 3, 3]
  }
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

expectNotAssignable<Model>({
  id: '0',
  simple: 1,
  optional: 2,
  list: [3],
  nested: {
    simple: 1,
    optional: 2,
    list: [3]
  }
});

expectNotAssignable<Model>({
  id: '0',
  simple: 1,
  optional: '2',
  list: [3],
  nested: {
    simple: 1,
    optional: 2,
    list: [3]
  }
});

expectNotAssignable<Model>({
  id: '0',
  simple: 1,
  optional: 'undefined',
  list: 3,
  nested: {
    simple: 1,
    optional: 2,
    list: [3]
  }
});

expectNotAssignable<Model>({
  id: '0',
  simple: 1,
  optional: 2,
  list: '3,3,3',
  nested: {
    simple: 1,
    optional: 2,
    list: [3]
  }
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

expectType<Text>({
  id: '0',
  untyped: '' as string,
  typed: 'C' as PMongoJson.WithType,
  literal: 'A' as 'A' | 'B'
});

expectNotType<Text>({
  id: '0',
  untyped: 'Arthur' as string,
  typed: 'D' as string,
  literal: 'D' as string
});
