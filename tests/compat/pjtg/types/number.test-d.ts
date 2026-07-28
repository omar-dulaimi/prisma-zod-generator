import { expectAssignable, expectNotAssignable } from 'tsd';
import type { Model } from '../target/number/client';
import type {
  ModelAvgAggregateOutputType,
  ModelCountAggregateOutputType,
  ModelCreateInput,
  ModelMaxAggregateOutputType,
  ModelMinAggregateOutputType,
  ModelScalarWhereWithAggregatesInput,
  ModelSumAggregateOutputType,
  ModelUpdateInput,
  ModelWhereInput
} from '../target/number/models/Model';

declare global {
  export namespace PNumberJson {
    type Price = 100 | 200 | 300;
    type NullablePrice = 50 | 100;
    type FloatPrice = 1.5 | 2.5 | 3.5;
    type Config = { tier: string; enabled: boolean };
  }
}

// Test basic model type
expectAssignable<Model>({
  id: 0,
  price: 100 as PNumberJson.Price,
  nullablePrice: null,
  floatPrice: 1.5 as PNumberJson.FloatPrice,
  config: { tier: 'basic', enabled: true }
});

// Test with nullablePrice value
expectAssignable<Model>({
  id: 0,
  price: 200 as PNumberJson.Price,
  nullablePrice: 50 as PNumberJson.NullablePrice,
  floatPrice: 2.5 as PNumberJson.FloatPrice,
  config: null
});

// Test CreateInput types
expectAssignable<ModelCreateInput>({
  price: 100 as PNumberJson.Price,
  nullablePrice: 50 as PNumberJson.NullablePrice,
  floatPrice: 1.5 as PNumberJson.FloatPrice,
  config: { tier: 'basic', enabled: true }
});

// Test CreateInput without optional fields
expectAssignable<ModelCreateInput>({
  price: 100 as PNumberJson.Price,
  floatPrice: 1.5 as PNumberJson.FloatPrice
});

// Test UpdateInput types - direct assignment
expectAssignable<ModelUpdateInput>({
  price: 200 as PNumberJson.Price
});

expectAssignable<ModelUpdateInput>({
  nullablePrice: 100 as PNumberJson.NullablePrice
});

expectAssignable<ModelUpdateInput>({
  floatPrice: 2.5 as PNumberJson.FloatPrice
});

expectAssignable<ModelUpdateInput>({
  config: { tier: 'premium', enabled: false }
});

// Test nullable fields can be set to null
expectAssignable<ModelUpdateInput>({
  nullablePrice: null
});

expectNotAssignable<ModelWhereInput>({
  price: 400 // Invalid price, not in Price union
});

expectNotAssignable<ModelWhereInput>({
  floatPrice: 4.5 // Invalid floatPrice, not in FloatPrice union
});

expectNotAssignable<ModelWhereInput>({
  nullablePrice: 75 // Invalid nullablePrice, not in NullablePrice union
});

// Test that filter objects still work (complex filters should be preserved)
expectAssignable<ModelWhereInput>({
  price: { gt: 100 as PNumberJson.Price } // Should work with valid type
});

expectAssignable<ModelWhereInput>({
  floatPrice: { gte: 1.5 as PNumberJson.FloatPrice }
});

expectAssignable<ModelWhereInput>({
  nullablePrice: { not: null }
});

// Test WithAggregates - these should still accept the filter types
// (WithAggregates filters are NOT transformed to preserve complex functionality)
expectAssignable<ModelScalarWhereWithAggregatesInput>({
  price: { gt: 100 }
});

expectAssignable<ModelScalarWhereWithAggregatesInput>({
  floatPrice: { gte: 1.5 }
});

// Test CreateInput rejects invalid values
expectNotAssignable<ModelCreateInput>({
  price: 400, // Invalid
  floatPrice: 1.5 as PNumberJson.FloatPrice
});

expectNotAssignable<ModelCreateInput>({
  price: 100 as PNumberJson.Price,
  floatPrice: 99.9 // Invalid
});

// Test UpdateInput rejects invalid values
expectNotAssignable<ModelUpdateInput>({
  price: 999 // Invalid
});

expectNotAssignable<ModelUpdateInput>({
  floatPrice: 0.5 // Invalid
});

expectNotAssignable<ModelUpdateInput>({
  nullablePrice: 25 // Invalid
});

// Test Model output type rejects invalid values
expectNotAssignable<Model>({
  id: 0,
  price: 999, // Invalid
  nullablePrice: null,
  floatPrice: 1.5 as PNumberJson.FloatPrice,
  config: null
});

expectNotAssignable<Model>({
  id: 0,
  price: 100 as PNumberJson.Price,
  nullablePrice: 25, // Invalid
  floatPrice: 1.5 as PNumberJson.FloatPrice,
  config: null
});

// Aggregate output typing
expectAssignable<ModelCountAggregateOutputType>({
  id: 1,
  price: 1,
  nullablePrice: 1,
  floatPrice: 1,
  config: 1,
  _all: 1
});

expectNotAssignable<ModelCountAggregateOutputType>({
  id: 1,
  price: '1',
  nullablePrice: 1,
  floatPrice: 1,
  config: 1,
  _all: 1
});

expectAssignable<ModelAvgAggregateOutputType>({
  id: 1,
  price: 123,
  nullablePrice: null,
  floatPrice: 1.25
});

expectNotAssignable<ModelAvgAggregateOutputType>({
  id: 1,
  price: '123',
  nullablePrice: null,
  floatPrice: 1.25
});

expectAssignable<ModelSumAggregateOutputType>({
  id: 1,
  price: 123,
  nullablePrice: null,
  floatPrice: 2.75
});

expectNotAssignable<ModelSumAggregateOutputType>({
  id: 1,
  price: 123,
  nullablePrice: null,
  floatPrice: '2.75'
});

expectAssignable<ModelMinAggregateOutputType>({
  id: 1,
  price: 100 as PNumberJson.Price,
  nullablePrice: 50 as PNumberJson.NullablePrice,
  floatPrice: 1.5 as PNumberJson.FloatPrice
});

expectNotAssignable<ModelMinAggregateOutputType>({
  id: 1,
  price: 123,
  nullablePrice: 75,
  floatPrice: 2.25
});

expectAssignable<ModelMaxAggregateOutputType>({
  id: 1,
  price: 300 as PNumberJson.Price,
  nullablePrice: 100 as PNumberJson.NullablePrice,
  floatPrice: 3.5 as PNumberJson.FloatPrice
});

expectNotAssignable<ModelMaxAggregateOutputType>({
  id: 1,
  price: 999,
  nullablePrice: 75,
  floatPrice: 9.75
});
