import { DMMF } from '@prisma/generator-helper';
export declare function addMissingInputObjectTypesForMongoDbRawOpsAndQueries(modelOperations: DMMF.ModelMapping[], outputObjectTypes: DMMF.OutputType[], inputObjectTypes: DMMF.InputType[]): void;
export declare const isMongodbRawOp: (name: string) => boolean;
