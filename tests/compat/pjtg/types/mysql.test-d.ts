import { expectAssignable, expectNotAssignable, expectNotType, expectType } from 'tsd';
import type { Model, Text } from '../target/mysql/client';

declare global {
  export namespace PMysqlJson {
    export type Simple = 1;
    export type Optional = 2;
    export type List = 3;
    type WithType = 'C' | 'D';
  }
}

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 2
});

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: null
});

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: null
});

expectAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 2
});

expectNotAssignable<Model>({
  id: 0,
  simple: '1',
  optional: 2
});

expectNotAssignable<Model>({
  id: 0,
  simple: 1,
  optional: '2'
});

expectNotAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 'undefined'
});

expectNotAssignable<Model>({
  id: 0,
  simple: 1,
  optional: 2
});

expectType<Text>({
  id: 0,
  untyped: '' as string,
  typed: 'C' as PMysqlJson.WithType,
  literal: 'A' as 'A' | 'B'
});

expectNotType<Text>({
  id: 0,
  untyped: 'Arthur' as string,
  typed: 'D' as string,
  literal: 'D' as string
});
