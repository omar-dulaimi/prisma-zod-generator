import { expectAssignable, expectNotAssignable, expectNotType, expectType } from 'tsd';
import type { Model, StringArrayModel } from '../target/string/client';
import type {
  ModelCountAggregateOutputType,
  ModelMaxAggregateOutputType,
  ModelMinAggregateOutputType,
  ModelUpdateInput
} from '../target/string/models/Model';
import type {
  StringArrayModelCountAggregateOutputType,
  StringArrayModelCreateInput,
  StringArrayModelUpdateInput
} from '../target/string/models/StringArrayModel';

declare global {
  export namespace PStringJson {
    type WithType = 'C' | 'D';
    type StringArrayType = 'foo' | 'bar';
  }
}

expectType<Model>({
  id: 0,
  untyped: '' as string,
  typed: 'C' as PStringJson.WithType,
  literal: 'A' as 'A' | 'B'
});

expectNotType<Model>({
  id: 0,
  untyped: 'Mesquita' as string,
  typed: 'D' as string,
  literal: 'D' as string
});

// Test UpdateInput types with Prisma. prefix (Prisma 7 format)
// https://github.com/arthurfiorette/prisma-json-types-generator/issues/602
expectAssignable<ModelUpdateInput>({
  typed: 'C' as PStringJson.WithType
});

expectAssignable<ModelUpdateInput>({
  typed: { set: 'D' as PStringJson.WithType }
});

expectAssignable<ModelUpdateInput>({
  literal: 'A' as 'A' | 'B'
});

expectAssignable<ModelUpdateInput>({
  literal: { set: 'B' as 'A' | 'B' }
});

expectNotAssignable<ModelUpdateInput>({
  typed: 'invalid' as string
});

expectNotAssignable<ModelUpdateInput>({
  typed: { set: 'invalid' as string }
});

expectNotAssignable<ModelUpdateInput>({
  literal: 'invalid' as string
});

expectNotAssignable<ModelUpdateInput>({
  literal: { set: 'invalid' as string }
});

// Test String[] type with Prisma. prefix (Prisma 7 format)
// https://github.com/arthurfiorette/prisma-json-types-generator/issues/603
expectAssignable<StringArrayModel>({
  id: '123e4567-e89b-12d3-a456-426614174000',
  tags: ['foo', 'bar'] as PStringJson.StringArrayType[]
});

expectNotAssignable<StringArrayModel>({
  id: '123e4567-e89b-12d3-a456-426614174000',
  tags: ['invalid'] as string[]
});

// Test CreateInput types for String[]
expectAssignable<StringArrayModelCreateInput>({
  tags: ['foo'] as PStringJson.StringArrayType[]
});

expectAssignable<StringArrayModelCreateInput>({
  tags: { set: ['bar'] as PStringJson.StringArrayType[] }
});

expectNotAssignable<StringArrayModelCreateInput>({
  tags: ['invalid'] as string[]
});

expectNotAssignable<StringArrayModelCreateInput>({
  tags: { set: ['invalid'] as string[] }
});

// Test UpdateInput types for String[]
expectAssignable<StringArrayModelUpdateInput>({
  tags: ['foo', 'bar'] as PStringJson.StringArrayType[]
});

expectAssignable<StringArrayModelUpdateInput>({
  tags: { set: ['foo'] as PStringJson.StringArrayType[] }
});

expectNotAssignable<StringArrayModelUpdateInput>({
  tags: ['invalid'] as string[]
});

expectNotAssignable<StringArrayModelUpdateInput>({
  tags: { set: ['invalid'] as string[] }
});

// Aggregate output typing
expectAssignable<ModelCountAggregateOutputType>({
  id: 1,
  untyped: 1,
  typed: 1,
  literal: 1,
  _all: 1
});

expectAssignable<ModelMinAggregateOutputType>({
  id: 1,
  untyped: 'A',
  typed: 'C' as PStringJson.WithType,
  literal: 'A' as 'A' | 'B'
});

expectAssignable<ModelMaxAggregateOutputType>({
  id: 1,
  untyped: 'Z',
  typed: 'D' as PStringJson.WithType,
  literal: 'B' as 'A' | 'B'
});

expectAssignable<StringArrayModelCountAggregateOutputType>({
  id: 1,
  tags: 1,
  _all: 1
});
