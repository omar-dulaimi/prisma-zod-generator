import { expectAssignable, expectNotAssignable, expectType } from 'tsd';
import type { Model, PrismaClient } from '../target/normal/client';
import type {
  ModelCountAggregateOutputType,
  ModelGroupByOutputType
} from '../target/normal/models/Model';
import type { OrdersCountAggregateOutputType } from '../target/normal/models/orders';
import type { UpdateManyInput } from '../target/normal/pjtg';

declare global {
  export namespace PNormalJson {
    export type Simple = 1;
    export type Optional = 2;
    export type List = 3;

    // Type matching the reproduction repository
    export type SampleJson = {
      a: number;
      b: string;
    };
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

// GroupBy output type should have properly typed JSON fields
expectAssignable<ModelGroupByOutputType>({
  id: 0,
  simple: 1,
  optional: 2,
  list: [3],
  _count: null,
  _avg: null,
  _sum: null,
  _min: null,
  _max: null
});

expectAssignable<ModelGroupByOutputType>({
  id: 0,
  simple: 1,
  optional: null,
  list: [3, 3, 3],
  _count: null,
  _avg: null,
  _sum: null,
  _min: null,
  _max: null
});

// GroupBy should reject incorrect JSON types
expectNotAssignable<ModelGroupByOutputType>({
  id: 0,
  simple: '1', // should be number 1, not string '1'
  optional: 2,
  list: [3],
  _count: null,
  _avg: null,
  _sum: null,
  _min: null,
  _max: null
});

expectNotAssignable<ModelGroupByOutputType>({
  id: 0,
  simple: 1,
  optional: '2', // should be number 2, not string '2'
  list: [3],
  _count: null,
  _avg: null,
  _sum: null,
  _min: null,
  _max: null
});

expectNotAssignable<ModelGroupByOutputType>({
  id: 0,
  simple: 1,
  optional: 2,
  list: ['3'], // should be number[] [3], not string[] ['3']
  _count: null,
  _avg: null,
  _sum: null,
  _min: null,
  _max: null
});

// Test groupBy return type for specific field selections
// This tests the actual return type from prisma.model.groupBy()
declare const prisma: PrismaClient;

// Test groupBy with 'simple' field - should return properly typed result
(async () => {
  const result = await prisma.model.groupBy({
    by: ['simple'],
    _count: true
  });

  for (const item of result) {
    // item.simple should be typed as PNormalJson.Simple (which is 1)
    expectType<PNormalJson.Simple>(item.simple);
    // Should NOT be JsonValue
    expectAssignable<PNormalJson.Simple>(item.simple);
  }
})();

// Test groupBy with 'optional' field - should return properly typed result
(async () => {
  const result = await prisma.model.groupBy({
    by: ['optional'],
    _count: true
  });

  for (const item of result) {
    // item.optional should be typed as PNormalJson.Optional | null
    expectType<PNormalJson.Optional | null>(item.optional);
    expectAssignable<PNormalJson.Optional | null>(item.optional);
  }
})();

// Test groupBy with 'list' field - should return properly typed result
(async () => {
  const result = await prisma.model.groupBy({
    by: ['list'],
    _count: true
  });

  for (const item of result) {
    // item.list should be typed as PNormalJson.List[]
    expectType<PNormalJson.List[]>(item.list);
    expectAssignable<PNormalJson.List[]>(item.list);
  }
})();

// Test groupBy with multiple fields including JSON fields
(async () => {
  const result = await prisma.model.groupBy({
    by: ['id', 'simple', 'optional'],
    _count: true
  });

  for (const item of result) {
    expectType<number>(item.id);
    expectType<PNormalJson.Simple>(item.simple);
    expectType<PNormalJson.Optional | null>(item.optional);
  }
})();

// Test case exactly matching the reproduction repository:
// https://github.com/rivatove/prisma-json-types-generator-418
// Testing the orders model with meta field
(async () => {
  const aggregates = await prisma.orders.groupBy({
    by: ['meta'],
    _count: true
  });

  for (const aggregate of aggregates) {
    // The type of aggregate.meta should be PNormalJson.SampleJson | null
    // NOT JsonValue
    expectType<PNormalJson.SampleJson | null>(aggregate.meta);
    expectAssignable<PNormalJson.SampleJson | null>(aggregate.meta);

    // Verify we can access the nested properties with proper typing
    if (aggregate.meta !== null) {
      expectType<number>(aggregate.meta.a);
      expectType<string>(aggregate.meta.b);
    }
  }
})();

// Count aggregate output must stay numeric
expectAssignable<ModelCountAggregateOutputType>({
  id: 1,
  simple: 1,
  optional: 1,
  list: 1,
  _all: 1
});

declare const modelCount: ModelCountAggregateOutputType;
expectType<number>(modelCount.simple);
expectType<number>(modelCount.optional);
expectType<number>(modelCount.list);

expectAssignable<OrdersCountAggregateOutputType>({
  id: 1,
  meta: 1,
  _all: 1
});

declare const ordersCount: OrdersCountAggregateOutputType;
expectType<number>(ordersCount.meta);
