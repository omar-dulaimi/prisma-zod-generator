import { DMMF } from '@prisma/generator-helper';
export declare function resolveModelsComments(models: DMMF.Model[], modelOperations: DMMF.ModelMapping[], enumTypes: {
    model?: DMMF.SchemaEnum[];
    prisma: DMMF.SchemaEnum[];
}, hiddenModels: string[], hiddenFields: string[]): void;
export declare function hideInputObjectTypesAndRelatedFields(inputObjectTypes: DMMF.InputType[], hiddenModels: string[], hiddenFields: string[]): void;
