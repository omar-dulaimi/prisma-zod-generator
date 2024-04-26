import { DMMF } from '@prisma/generator-helper';
export declare function checkModelHasModelRelation(model: DMMF.Model): boolean;
export declare function checkModelHasManyModelRelation(model: DMMF.Model): boolean;
export declare function checkIsModelRelationField(modelField: DMMF.Field): boolean;
export declare function checkIsManyModelRelationField(modelField: DMMF.Field): import("@prisma/generator-helper").ReadonlyDeep<boolean>;
export declare function findModelByName(models: DMMF.Model[], modelName: string): import("@prisma/generator-helper").ReadonlyDeep<{
    name: string;
    dbName: string;
    fields: import("@prisma/generator-helper").ReadonlyDeep<{
        kind: DMMF.FieldKind;
        name: string;
        isRequired: boolean;
        isList: boolean;
        isUnique: boolean;
        isId: boolean;
        isReadOnly: boolean;
        isGenerated?: boolean;
        isUpdatedAt?: boolean;
        type: string;
        dbName?: string;
        hasDefaultValue: boolean;
        default?: import("@prisma/generator-helper").ReadonlyDeep<{
            name: string;
            args: any[];
        }> | DMMF.FieldDefaultScalar | DMMF.FieldDefaultScalar[];
        relationFromFields?: string[];
        relationToFields?: string[];
        relationOnDelete?: string;
        relationName?: string;
        documentation?: string;
    }>[];
    uniqueFields: string[][];
    uniqueIndexes: import("@prisma/generator-helper").ReadonlyDeep<{
        name: string;
        fields: string[];
    }>[];
    documentation?: string;
    primaryKey: import("@prisma/generator-helper").ReadonlyDeep<{
        name: string;
        fields: string[];
    }>;
    isGenerated?: boolean;
}>;
