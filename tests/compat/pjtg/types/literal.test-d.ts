import { expectAssignable, expectNotAssignable } from 'tsd';
import type { Model } from '../target/literal/client';
import type { UpdateManyInput } from '../target/literal/pjtg';

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
