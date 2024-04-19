import { ConnectorType, DMMF } from '@prisma/generator-helper';
import { GeneratorConfig } from '@prisma/internals';
interface AddMissingInputObjectTypeOptions {
    isGenerateSelect: boolean;
    isGenerateInclude: boolean;
}
export declare function addMissingInputObjectTypes(inputObjectTypes: DMMF.InputType[], outputObjectTypes: DMMF.OutputType[], models: DMMF.Model[], modelOperations: DMMF.ModelMapping[], dataSourceProvider: ConnectorType, options: AddMissingInputObjectTypeOptions): void;
export declare function resolveAddMissingInputObjectTypeOptions(generatorConfigOptions: GeneratorConfig['config']): AddMissingInputObjectTypeOptions;
export {};
