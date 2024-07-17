import { DMMF } from '@prisma/generator-helper';
export declare function checkModelHasModelRelation(model: DMMF.Model): boolean;
export declare function checkModelHasManyModelRelation(model: DMMF.Model): boolean;
export declare function checkIsModelRelationField(modelField: DMMF.Field): boolean;
export declare function checkIsManyModelRelationField(modelField: DMMF.Field): import("@prisma/generator-helper").ReadonlyDeep<boolean>;
export declare function findModelByName(models: DMMF.Model[], modelName: string): import("@prisma/generator-helper").ReadonlyDeep<{
    name: string;
    dbName: string | null;
    fields: DMMF.Field[];
    uniqueFields: string[][];
    uniqueIndexes: DMMF.uniqueIndex[];
    documentation?: string;
    primaryKey: DMMF.PrimaryKey | null;
    isGenerated?: boolean;
}> | undefined;
