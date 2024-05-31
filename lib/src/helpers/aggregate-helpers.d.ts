import { DMMF } from '@prisma/generator-helper';
import { AggregateOperationSupport } from '../types';
export declare const isAggregateInputType: (name: string) => boolean;
export declare function addMissingInputObjectTypesForAggregate(inputObjectTypes: DMMF.InputType[], outputObjectTypes: DMMF.OutputType[]): void;
export declare function resolveAggregateOperationSupport(inputObjectTypes: DMMF.InputType[]): AggregateOperationSupport;
