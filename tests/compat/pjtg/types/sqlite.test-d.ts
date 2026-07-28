import { expectNotType, expectType } from 'tsd';
import type { Text } from '../target/sqlite/client';

declare global {
  export namespace PSqliteJson {
    type WithType = 'C' | 'D';
  }
}

expectType<Text>({
  id: 0,
  untyped: '' as string,
  typed: 'C' as PSqliteJson.WithType,
  literal: 'A' as 'A' | 'B'
});

expectNotType<Text>({
  id: 0,
  untyped: 'Arthur' as string,
  typed: 'D' as string,
  literal: 'D' as string
});
