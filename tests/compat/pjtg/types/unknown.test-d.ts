import { expectNotType, expectType } from 'tsd';
import type { Model } from '../target/unknown/client';

expectType<Model>({
  id: 0,
  field: {} as unknown,
  fieldArray: [] as unknown[],
  fieldOptional: {} as unknown,
  str: '' as string,
  int: 0 as number
});

expectNotType<Model>({
  id: 0,
  field: {} as any,
  str: {} as unknown,
  int: 0 as unknown
});

expectNotType<Model>({
  id: 0,
  field: {} as any,
  str: {} as any,
  int: 0 as any
});
