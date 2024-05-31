import { DMMF } from '@prisma/generator-helper';
export declare function checkModelHasModelRelation(model: DMMF.Model): boolean;
export declare function checkModelHasManyModelRelation(model: DMMF.Model): boolean;
export declare function checkIsModelRelationField(modelField: DMMF.Field): boolean;
export declare function checkIsManyModelRelationField(modelField: DMMF.Field): import("@prisma/generator-helper").ReadonlyDeep<boolean>;
export declare function findModelByName(models: DMMF.Model[], modelName: string): import("@prisma/generator-helper").ReadonlyDeep<{
    name: string;
    dbName: string | null;
    fields: import("@prisma/generator-helper").ReadonlyDeep<{
        kind: DMMF.FieldKind;
        name: string;
        isRequired: boolean;
        isList: boolean;
        isUnique: boolean;
        isId: boolean;
        isReadOnly: boolean;
        isGenerated?: boolean | undefined;
        isUpdatedAt?: boolean | undefined;
        type: string;
        dbName?: string | null | undefined;
        hasDefaultValue: boolean;
        default?: import("@prisma/generator-helper").ReadonlyDeep<{
            name: string;
            args: any[];
        }> | DMMF.FieldDefaultScalar | DMMF.FieldDefaultScalar[] | undefined;
        relationFromFields?: string[] | undefined;
        relationToFields?: string[] | undefined;
        relationOnDelete?: string | undefined;
        relationName?: string | undefined;
        documentation?: string | undefined;
    }>[];
    uniqueFields: string[][];
    uniqueIndexes: import("@prisma/generator-helper").ReadonlyDeep<{
        name: string;
        fields: string[];
    }>[];
    documentation?: string | undefined;
    primaryKey: import("@prisma/generator-helper").ReadonlyDeep<{
        name: string | null;
        fields: string[];
    }> | null;
    isGenerated?: boolean | undefined;
}> | undefined;
