import { expectAssignable, expectNotAssignable } from 'tsd';
import type { Model } from '../target/array/client';

expectAssignable<Model>({
  id: 0,
  array: [[[[1, 2, 3]], [[4, 5, 6]]]]
});

expectNotAssignable<Model>({
  id: 0,
  array: [[[[1, 2, 3]], [[4, 5, '6']]]]
});

expectNotAssignable<Model>({
  id: 0,
  array: [
    [
      [
        [1, 2, 3],
        [4, 5, 6]
      ]
    ]
  ]
});

expectNotAssignable<Model>({
  id: 0,
  array: ['asd']
});
