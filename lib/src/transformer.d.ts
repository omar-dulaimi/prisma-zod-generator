import type { ConnectorType, DMMF } from '@prisma/generator-helper';
import { AggregateOperationSupport, TransformerParams } from './types';
export default class Transformer {
    name: string;
    fields: DMMF.SchemaArg[];
    schemaImports: Set<string>;
    models: DMMF.Model[];
    modelOperations: DMMF.ModelMapping[];
    aggregateOperationSupport: AggregateOperationSupport;
    enumTypes: DMMF.SchemaEnum[];
    static enumNames: string[];
    static rawOpsMap: {
        [name: string]: string;
    };
    static provider: ConnectorType;
    static previewFeatures: string[] | undefined;
    private static outputPath;
    private hasJson;
    private static prismaClientOutputPath;
    private static isCustomPrismaClientOutputPath;
    private static isGenerateSelect;
    private static isGenerateInclude;
    constructor(params: TransformerParams);
    static setOutputPath(outPath: string): void;
    static setIsGenerateSelect(isGenerateSelect: boolean): void;
    static setIsGenerateInclude(isGenerateInclude: boolean): void;
    static getOutputPath(): string;
    static setPrismaClientOutputPath(prismaClientCustomPath: string): void;
    static generateIndex(): Promise<void>;
    generateEnumSchemas(): Promise<void>;
    generateImportZodStatement(): string;
    generateExportSchemaStatement(name: string, schema: string): string;
    generateObjectSchema(): Promise<void>;
    generateObjectSchemaFields(): string[];
    generateObjectSchemaField(fieldNotFiltered: DMMF.SchemaArg): [string, DMMF.SchemaArg, boolean][];
    wrapWithZodValidators(mainValidator: string, field: DMMF.SchemaArg, inputType: DMMF.InputTypeRef): string;
    addSchemaImport(name: string): void;
    generatePrismaStringLine(field: DMMF.SchemaArg, inputType: DMMF.InputTypeRef, inputsLength: number): string;
    generateFieldValidators(zodStringWithMainType: string, field: DMMF.SchemaArg): string;
    prepareObjectSchema(zodObjectSchemaFields: string[]): string;
    generateExportObjectSchemaStatement(schema: string): string;
    addFinalWrappers({ zodStringFields }: {
        zodStringFields: string[];
    }): string;
    generateImportPrismaStatement(): string;
    generateJsonSchemaImplementation(): string;
    generateObjectSchemaImportStatements(): string;
    generateSchemaImports(): string;
    checkIsModelQueryType(type: string): {
        isModelQueryType: boolean;
        modelName: string;
        queryName: string;
    } | {
        isModelQueryType: boolean;
        modelName?: undefined;
        queryName?: undefined;
    };
    resolveModelQuerySchemaName(modelName: string, queryName: string): string;
    wrapWithZodUnion(zodStringFields: string[]): string;
    wrapWithZodObject(zodStringFields: string | string[]): string;
    resolveObjectSchemaName(): string;
    generateModelSchemas(): Promise<void>;
    generateImportStatements(imports: (string | undefined)[]): string;
    resolveSelectIncludeImportAndZodSchemaLine(model: DMMF.Model): {
        selectImport: string;
        includeImport: string;
        selectZodSchemaLine: string;
        includeZodSchemaLine: string;
        selectZodSchemaLineLazy: string;
        includeZodSchemaLineLazy: string;
    };
    resolveOrderByWithRelationImportAndZodSchemaLine(model: DMMF.Model): {
        orderByImport: string;
        orderByZodSchemaLine: string;
    };
}
