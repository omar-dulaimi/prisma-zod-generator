import type {
  ConnectorType,
  DMMF as PrismaDMMF,
} from '@prisma/generator-helper';
import path from 'path';
import {
  checkModelHasModelRelation,
  findModelByName,
  isMongodbRawOp,
} from './helpers';
import { AggregateOperationSupport, TransformerParams } from './types';
import { writeFileSafely } from './utils/writeFileSafely';
import { writeIndexFile } from './utils/writeIndexFile';

export default class Transformer {
  name: string;
  fields: PrismaDMMF.SchemaArg[];
  schemaImports = new Set<string>();
  models: PrismaDMMF.Model[];
  modelOperations: PrismaDMMF.ModelMapping[];
  aggregateOperationSupport: AggregateOperationSupport;
  enumTypes: PrismaDMMF.SchemaEnum[];

  static enumNames: string[] = [];
  static rawOpsMap: { [name: string]: string } = {};
  static provider: ConnectorType;
  static previewFeatures: string[] | undefined;
  private static outputPath: string = './generated';
  private hasJson = false;
  private static prismaClientOutputPath: string = '@prisma/client';
  private static isCustomPrismaClientOutputPath: boolean = false;
  private static prismaClientProvider: string = 'prisma-client-js';
  private static prismaClientConfig: Record<string, unknown> = {};
  private static isGenerateSelect: boolean = false;
  private static isGenerateInclude: boolean = false;
  
  // Dual schema export configuration
  private static exportTypedSchemas: boolean = true;      // Export z.ZodType<Prisma.Type> versions (type-safe)
  private static exportZodSchemas: boolean = true;        // Export pure Zod versions (method-friendly)
  private static typedSchemaSuffix: string = 'Schema';    // Suffix for typed schemas (PostFindManySchema)
  private static zodSchemaSuffix: string = 'ZodSchema';   // Suffix for Zod schemas (PostFindManyZodSchema)

  constructor(params: TransformerParams) {
    this.name = params.name ?? '';
    this.fields = params.fields ?? [];
    this.models = params.models ?? [];
    this.modelOperations = params.modelOperations ?? [];
    this.aggregateOperationSupport = params.aggregateOperationSupport ?? {};
    this.enumTypes = params.enumTypes ?? [];
  }

  static setOutputPath(outPath: string) {
    this.outputPath = outPath;
  }

  static setIsGenerateSelect(isGenerateSelect: boolean) {
    this.isGenerateSelect = isGenerateSelect;
  }

  static setIsGenerateInclude(isGenerateInclude: boolean) {
    this.isGenerateInclude = isGenerateInclude;
  }

  static setExportTypedSchemas(exportTypedSchemas: boolean) {
    this.exportTypedSchemas = exportTypedSchemas;
  }

  static setExportZodSchemas(exportZodSchemas: boolean) {
    this.exportZodSchemas = exportZodSchemas;
  }

  static setTypedSchemaSuffix(typedSchemaSuffix: string) {
    this.typedSchemaSuffix = typedSchemaSuffix;
  }

  static setZodSchemaSuffix(zodSchemaSuffix: string) {
    this.zodSchemaSuffix = zodSchemaSuffix;
  }


  static getOutputPath() {
    return this.outputPath;
  }

  static setPrismaClientOutputPath(prismaClientCustomPath: string) {
    this.prismaClientOutputPath = prismaClientCustomPath;
    this.isCustomPrismaClientOutputPath =
      prismaClientCustomPath !== '@prisma/client';
  }

  static setPrismaClientProvider(provider: string) {
    this.prismaClientProvider = provider;
  }

  static setPrismaClientConfig(config: Record<string, unknown>) {
    this.prismaClientConfig = config;
  }

  static getPrismaClientProvider() {
    return this.prismaClientProvider;
  }

  static getPrismaClientConfig() {
    return this.prismaClientConfig;
  }

  /**
   * Determines the schemas directory path based on the output path.
   * If the output path already ends with 'schemas', use it directly.
   * Otherwise, append 'schemas' to the output path.
   */
  private static getSchemasPath(): string {
    const normalizedOutputPath = path.normalize(this.outputPath);
    const pathSegments = normalizedOutputPath.split(path.sep);
    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment === 'schemas') {
      return this.outputPath;
    }

    return path.join(this.outputPath, 'schemas');
  }

  static async generateIndex() {
    const indexPath = path.join(Transformer.getSchemasPath(), 'index.ts');
    await writeIndexFile(indexPath);
  }

  async generateEnumSchemas() {
    for (const enumType of this.enumTypes) {
      const { name, values } = enumType;

      await writeFileSafely(
        path.join(Transformer.getSchemasPath(), `enums/${name}.schema.ts`),
        `${this.generateImportZodStatement()}\n${this.generateExportSchemaStatement(
          `${name}`,
          `z.enum(${JSON.stringify(values)})`,
        )}`,
      );
    }
  }

  generateImportZodStatement() {
    return "import { z } from 'zod';\n";
  }

  generateExportSchemaStatement(name: string, schema: string) {
    return `export const ${name}Schema = ${schema}`;
  }

  async generateObjectSchema() {
    const zodObjectSchemaFields = this.generateObjectSchemaFields();
    const objectSchema = this.prepareObjectSchema(zodObjectSchemaFields);
    const objectSchemaName = this.resolveObjectSchemaName();

    await writeFileSafely(
      path.join(
        Transformer.getSchemasPath(),
        `objects/${objectSchemaName}.schema.ts`,
      ),
      objectSchema,
    );
  }

  generateObjectSchemaFields() {
    const zodObjectSchemaFields = this.fields
      .map((field) => this.generateObjectSchemaField(field))
      .flatMap((item) => item)
      .map((item) => {
        const [zodStringWithMainType, field, skipValidators] = item;

        const value = skipValidators
          ? zodStringWithMainType
          : this.generateFieldValidators(zodStringWithMainType, field);

        return value.trim();
      });

    return zodObjectSchemaFields;
  }

  generateObjectSchemaField(
    field: PrismaDMMF.SchemaArg,
  ): [string, PrismaDMMF.SchemaArg, boolean][] {
    const lines = field.inputTypes;

    if (lines.length === 0) {
      return [];
    }

    let alternatives = lines.reduce<string[]>((result, inputType) => {
      if (inputType.type === 'String') {
        result.push(this.wrapWithZodValidators('z.string()', field, inputType));
      } else if (inputType.type === 'Int') {
        result.push(this.wrapWithZodValidators('z.number().int()', field, inputType));
      } else if (
        inputType.type === 'Float' ||
        inputType.type === 'Decimal'
      ) {
        result.push(this.wrapWithZodValidators('z.number()', field, inputType));
      } else if (inputType.type === 'BigInt') {
        result.push(this.wrapWithZodValidators('z.bigint()', field, inputType));
      } else if (inputType.type === 'Boolean') {
        result.push(
          this.wrapWithZodValidators('z.boolean()', field, inputType),
        );
      } else if (inputType.type === 'DateTime') {
        result.push(
          this.wrapWithZodValidators('z.union([z.date(), z.string().datetime()])', field, inputType),
        );
      } else if (inputType.type === 'Json') {
        this.hasJson = true;

        result.push(this.wrapWithZodValidators('jsonSchema', field, inputType));
      } else if (inputType.type === 'True') {
        result.push(
          this.wrapWithZodValidators('z.literal(true)', field, inputType),
        );
      } else if (inputType.type === 'Bytes') {
        result.push(
          this.wrapWithZodValidators(
            'z.instanceof(Buffer)',
            field,
            inputType,
          ),
        );
      } else {
        const isEnum = inputType.location === 'enumTypes';

        if (inputType.namespace === 'prisma' || isEnum) {
          if (
            inputType.type !== this.name &&
            typeof inputType.type === 'string'
          ) {
            this.addSchemaImport(inputType.type);
          }

          result.push(
            this.generatePrismaStringLine(field, inputType, lines.length),
          );
        }
      }

      return result;
    }, []);

    if (alternatives.length === 0) {
      return [];
    }

    if (alternatives.length > 1) {
      alternatives = alternatives.map((alter) =>
        alter.replace('.optional()', ''),
      );
    }

    // Check if ALL alternatives already include the field name
    // This happens when inputsLength === 1 for all alternatives
    // We check if alternatives start with the field name pattern (spaces + fieldname + colon)
    const fieldNamePattern = `  ${field.name}:`;
    const allAlternativesHaveFieldName = alternatives.every((alt) =>
      alt.startsWith(fieldNamePattern),
    );

    const fieldName = allAlternativesHaveFieldName ? '' : fieldNamePattern;

    const opt = !field.isRequired ? '.optional()' : '';

    let resString =
      alternatives.length === 1
        ? alternatives.join(',\r\n')
        : `z.union([${alternatives.join(',\r\n')}])${opt}`;

    if (field.isNullable) {
      resString += '.nullable()';
    }

    return [[`  ${fieldName} ${resString} `, field, true]];
  }

  wrapWithZodValidators(
    mainValidator: string,
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArg['inputTypes'][0],
  ) {
    let line: string = '';
    line = mainValidator;

    if (inputType.isList) {
      if (inputType.type === 'DateTime') {
        line = 'z.union([z.date().array(), z.string().datetime().array()])';
      } else {
        line += '.array()';
      }
    }

    if (!field.isRequired) {
      line += '.optional()';
    }

    return line;
  }

  addSchemaImport(name: string) {
    this.schemaImports.add(name);
  }

  generatePrismaStringLine(
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArg['inputTypes'][0],
    inputsLength: number,
  ) {
    const isEnum = inputType.location === 'enumTypes';

    const { isModelQueryType, modelName, queryName } =
      this.checkIsModelQueryType(inputType.type as string);

    const objectSchemaLine = isModelQueryType
      ? this.resolveModelQuerySchemaName(
          modelName as string,
          queryName as string,
        )
      : `${inputType.type}ObjectSchema`;
    const enumSchemaLine = `${inputType.type}Schema`;

    const schema =
      inputType.type === this.name
        ? objectSchemaLine
        : isEnum
          ? enumSchemaLine
          : objectSchemaLine;

    const arr = inputType.isList ? '.array()' : '';

    const opt = !field.isRequired ? '.optional()' : '';

    // Only use lazy loading for self-references or complex object schemas that might have circular dependencies
    // Simple enums like SortOrder don't need lazy loading
    const needsLazyLoading =
      inputType.type === this.name ||
      (!isEnum && inputType.namespace === 'prisma');

    if (needsLazyLoading) {
      return inputsLength === 1
        ? `  ${field.name}: z.lazy(() => ${schema})${arr}${opt}`
        : `z.lazy(() => ${schema})${arr}${opt}`;
    } else {
      return inputsLength === 1
        ? `  ${field.name}: ${schema}${arr}${opt}`
        : `${schema}${arr}${opt}`;
    }
  }

  generateFieldValidators(
    zodStringWithMainType: string,
    field: PrismaDMMF.SchemaArg,
  ) {
    const { isRequired, isNullable } = field;

    if (!isRequired) {
      zodStringWithMainType += '.optional()';
    }

    if (isNullable) {
      zodStringWithMainType += '.nullable()';
    }

    return zodStringWithMainType;
  }

  prepareObjectSchema(zodObjectSchemaFields: string[]) {
    const objectSchema = `${this.generateExportObjectSchemaStatement(
      this.addFinalWrappers({ zodStringFields: zodObjectSchemaFields }),
    )}\n`;

    const json = this.generateJsonSchemaImplementation();

    return `${this.generateObjectSchemaImportStatements()}${json}${objectSchema}`;
  }

  generateExportObjectSchemaStatement(schema: string) {
    let name = this.name;
    let exportName = this.name;
    if (Transformer.provider === 'mongodb') {
      if (isMongodbRawOp(name)) {
        name = Transformer.rawOpsMap[name];
        exportName = name.replace('Args', '');
      }
    }

    const end = `export const ${exportName}ObjectSchema = Schema`;

    return `const Schema = ${schema};\n\n ${end}`;
  }

  addFinalWrappers({ zodStringFields }: { zodStringFields: string[] }) {
    const fields = [...zodStringFields];

    return this.wrapWithZodObject(fields) + '.strict()';
  }

  generateJsonSchemaImplementation() {
    let jsonSchemaImplementation = '';

    if (this.hasJson) {
      jsonSchemaImplementation += `\n`;
      jsonSchemaImplementation += `const literalSchema = z.union([z.string(), z.number(), z.boolean()]);\n`;
      jsonSchemaImplementation += `const jsonSchema = z.lazy(() =>\n`;
      jsonSchemaImplementation += `  z.union([literalSchema, z.array(jsonSchema.nullable()), z.record(z.string(), jsonSchema.nullable())])\n`;
      jsonSchemaImplementation += `);\n\n`;
    }

    return jsonSchemaImplementation;
  }

  generateObjectSchemaImportStatements() {
    let generatedImports = this.generateImportZodStatement();
    generatedImports += this.generateSchemaImports();
    generatedImports += '\n\n';
    return generatedImports;
  }

  /**
   * Get the file extension to use for imports based on Prisma client configuration
   * For ESM with importFileExtension = "js", we need to add .js extension
   */
  private getImportFileExtension(): string {
    // Check if we're using the new prisma-client generator with ESM configuration
    const isNewPrismaClientGenerator = Transformer.prismaClientProvider === 'prisma-client' ||
                                       Transformer.prismaClientConfig.moduleFormat !== undefined ||
                                       Transformer.prismaClientConfig.runtime !== undefined;
    
    // If using ESM with importFileExtension specified, use that extension
    if (isNewPrismaClientGenerator && 
        Transformer.prismaClientConfig.moduleFormat === 'esm' &&
        Transformer.prismaClientConfig.importFileExtension) {
      return `.${Transformer.prismaClientConfig.importFileExtension}`;
    }
    
    // Default to no extension for backward compatibility
    return '';
  }

  /**
   * Generate an import statement with the correct file extension for ESM support
   */
  private generateImportStatement(importName: string, importPath: string): string {
    const extension = this.getImportFileExtension();
    return `import { ${importName} } from '${importPath}${extension}'`;
  }

  generateSchemaImports() {
    // Get the file extension to use for imports (for ESM support)
    const importExtension = this.getImportFileExtension();
    
    return [...this.schemaImports]
      .map((name) => {
        const { isModelQueryType, modelName, queryName } =
          this.checkIsModelQueryType(name);
        if (isModelQueryType) {
          return `import { ${this.resolveModelQuerySchemaName(
            modelName as string,
            queryName as string,
          )} } from '../${queryName}${modelName}.schema${importExtension}'`;
        } else if (Transformer.enumNames.includes(name)) {
          return `import { ${name}Schema } from '../enums/${name}.schema${importExtension}'`;
        } else {
          return `import { ${name}ObjectSchema } from './${name}.schema${importExtension}'`;
        }
      })
      .join(';\r\n');
  }

  checkIsModelQueryType(type: string) {
    const modelQueryTypeSuffixToQueryName: Record<string, string> = {
      FindManyArgs: 'findMany',
    };
    for (const modelQueryType of ['FindManyArgs']) {
      if (type.includes(modelQueryType)) {
        const modelQueryTypeSuffixIndex = type.indexOf(modelQueryType);
        return {
          isModelQueryType: true,
          modelName: type.substring(0, modelQueryTypeSuffixIndex),
          queryName: modelQueryTypeSuffixToQueryName[modelQueryType],
        };
      }
    }
    return { isModelQueryType: false };
  }

  resolveModelQuerySchemaName(modelName: string, queryName: string) {
    const modelNameCapitalized =
      modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const queryNameCapitalized =
      queryName.charAt(0).toUpperCase() + (queryName as string).slice(1);
    return `${modelNameCapitalized}${queryNameCapitalized}Schema`;
  }

  wrapWithZodObject(zodStringFields: string | string[]) {
    let wrapped = '';

    wrapped += 'z.object({';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields;
    wrapped += '\n';
    wrapped += '})';
    return wrapped;
  }

  resolveObjectSchemaName() {
    let name = this.name;
    let exportName = this.name;
    if (isMongodbRawOp(name)) {
      name = Transformer.rawOpsMap[name];
      exportName = name.replace('Args', '');
    }
    return exportName;
  }

  async generateModelSchemas() {
    for (const modelOperation of this.modelOperations) {
      const {
        model: modelName,
        findUnique,
        findFirst,
        findMany,
        // @ts-expect-error - Legacy API compatibility
        createOne,
        createMany,
        // @ts-expect-error - Legacy API compatibility
        deleteOne,
        // @ts-expect-error - Legacy API compatibility
        updateOne,
        deleteMany,
        updateMany,
        // @ts-expect-error - Legacy API compatibility
        upsertOne,
        aggregate,
        groupBy,
      } = modelOperation;

      const model = findModelByName(this.models, modelName) as PrismaDMMF.Model;

      const {
        selectImport,
        includeImport,
        selectZodSchemaLine,
        includeZodSchemaLine,
        selectZodSchemaLineLazy,
        includeZodSchemaLineLazy,
      } = this.resolveSelectIncludeImportAndZodSchemaLine(model);

      const { orderByImport, orderByZodSchemaLine } =
        this.resolveOrderByWithRelationImportAndZodSchemaLine(model);

      if (findUnique) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findUnique}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}FindUnique`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema })`,
          )}`,
        );
      }

      if (findFirst) {
        const shouldInline = this.shouldInlineSelectSchema(model);
        
        // Build imports based on aggressive inlining strategy
        const baseImports = [
          includeImport, // Include always external
          orderByImport,
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
          this.generateImportStatement(`${modelName}ScalarFieldEnumSchema`, `./enums/${modelName}ScalarFieldEnum.schema`),
        ];
        
        // Add select import only if NOT inlining, add inline imports if inlining
        const imports = shouldInline 
          ? [...baseImports, ...this.generateInlineSelectImports(model)]
          : [...baseImports, selectImport];

        // Determine select field reference based on dual export strategy
        const selectFieldReference = shouldInline 
          ? (Transformer.exportTypedSchemas 
              ? `${modelName}Select${Transformer.typedSchemaSuffix}.optional()`
              : `${modelName}Select${Transformer.zodSchemaSuffix}.optional()`)
          : selectZodSchemaLineLazy.replace('select: ', '').replace(',', '');
        
        const selectField = `select: ${selectFieldReference},`;
        const includeField = includeZodSchemaLineLazy; // Include always uses lazy loading
        const schemaFields = `${selectField} ${includeField} ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([${modelName}ScalarFieldEnumSchema, ${modelName}ScalarFieldEnumSchema.array()]).optional()`.trim().replace(/,\s*,/g, ',');

        // Add Prisma type import for explicit type binding
        let schemaContent = `import type { Prisma } from '@prisma/client';\n${this.generateImportStatements(imports)}`;

        // Add inline select schema definitions (dual export pattern)
        if (shouldInline) {
          schemaContent += `// Select schema needs to be in file to prevent circular imports\n//------------------------------------------------------\n\n${this.generateDualSelectSchemaExports(model)}\n\n`;
        }

        // Generate dual schema exports for FindFirst operation
        const schemaObjectDefinition = `z.object({ ${schemaFields } }).strict()`;
        const dualExports = this.generateDualSchemaExports(
          modelName, 
          'FindFirst', 
          schemaObjectDefinition,
          `Prisma.${modelName}FindFirstArgs`
        );

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findFirst}.schema.ts`),
          schemaContent + dualExports,
        );
      }

      if (findMany) {
        const shouldInline = this.shouldInlineSelectSchema(model);
        
        // Build imports based on aggressive inlining strategy
        const baseImports = [
          includeImport, // Include always external
          orderByImport,
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
          this.generateImportStatement(`${modelName}ScalarFieldEnumSchema`, `./enums/${modelName}ScalarFieldEnum.schema`),
        ];
        
        // Add select import only if NOT inlining, add inline imports if inlining
        const imports = shouldInline 
          ? [...baseImports, ...this.generateInlineSelectImports(model)]
          : [...baseImports, selectImport];

        // Determine select field reference based on dual export strategy
        const selectFieldReference = shouldInline 
          ? (Transformer.exportTypedSchemas 
              ? `${modelName}Select${Transformer.typedSchemaSuffix}.optional()`
              : `${modelName}Select${Transformer.zodSchemaSuffix}.optional()`)
          : selectZodSchemaLineLazy.replace('select: ', '').replace(',', '');
        
        const selectField = `select: ${selectFieldReference},`;
        const includeField = includeZodSchemaLineLazy; // Include always uses lazy loading
        const schemaFields = `${selectField} ${includeField} ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([${modelName}ScalarFieldEnumSchema, ${modelName}ScalarFieldEnumSchema.array()]).optional()`.trim().replace(/,\s*,/g, ',');

        // Add Prisma type import for explicit type binding
        let schemaContent = `import type { Prisma } from '@prisma/client';\n${this.generateImportStatements(imports)}`;

        // Add inline select schema definitions (dual export pattern)
        if (shouldInline) {
          schemaContent += `// Select schema needs to be in file to prevent circular imports\n//------------------------------------------------------\n\n${this.generateDualSelectSchemaExports(model)}\n\n`;
        }

        // Generate dual schema exports for FindMany operation
        const schemaObjectDefinition = `z.object({ ${schemaFields} }).strict()`;
        const dualExports = this.generateDualSchemaExports(
          modelName, 
          'FindMany', 
          schemaObjectDefinition,
          `Prisma.${modelName}FindManyArgs`
        );

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findMany}.schema.ts`),
          schemaContent + dualExports,
        );
      }

      if (createOne) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}CreateInputObjectSchema`, `./objects/${modelName}CreateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedCreateInputObjectSchema`, `./objects/${modelName}UncheckedCreateInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${createOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}CreateOne`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${modelName}CreateInputObjectSchema, ${modelName}UncheckedCreateInputObjectSchema])  })`,
          )}`,
        );
      }

      if (createMany) {
        const imports = [
          this.generateImportStatement(`${modelName}CreateManyInputObjectSchema`, `./objects/${modelName}CreateManyInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${createMany}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}CreateMany`,
            `z.object({ data: z.union([ ${modelName}CreateManyInputObjectSchema, z.array(${modelName}CreateManyInputObjectSchema) ]), ${
              Transformer.provider === 'postgresql' ||
              Transformer.provider === 'cockroachdb'
                ? 'skipDuplicates: z.boolean().optional()'
                : ''
            } })`,
          )}`,
        );
      }

      if (deleteOne) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${deleteOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}DeleteOne`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema  })`,
          )}`,
        );
      }

      if (deleteMany) {
        const imports = [
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${deleteMany}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}DeleteMany`,
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional()  })`,
          )}`,
        );
      }

      if (updateOne) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}UpdateInputObjectSchema`, `./objects/${modelName}UpdateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedUpdateInputObjectSchema`, `./objects/${modelName}UncheckedUpdateInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${updateOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}UpdateOne`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${modelName}UpdateInputObjectSchema, ${modelName}UncheckedUpdateInputObjectSchema]), where: ${modelName}WhereUniqueInputObjectSchema  })`,
          )}`,
        );
      }

      if (updateMany) {
        const imports = [
          this.generateImportStatement(`${modelName}UpdateManyMutationInputObjectSchema`, `./objects/${modelName}UpdateManyMutationInput.schema`),
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${updateMany}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}UpdateMany`,
            `z.object({ data: ${modelName}UpdateManyMutationInputObjectSchema, where: ${modelName}WhereInputObjectSchema.optional()  })`,
          )}`,
        );
      }

      if (upsertOne) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
          this.generateImportStatement(`${modelName}CreateInputObjectSchema`, `./objects/${modelName}CreateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedCreateInputObjectSchema`, `./objects/${modelName}UncheckedCreateInput.schema`),
          this.generateImportStatement(`${modelName}UpdateInputObjectSchema`, `./objects/${modelName}UpdateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedUpdateInputObjectSchema`, `./objects/${modelName}UncheckedUpdateInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${upsertOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}Upsert`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema, create: z.union([ ${modelName}CreateInputObjectSchema, ${modelName}UncheckedCreateInputObjectSchema ]), update: z.union([ ${modelName}UpdateInputObjectSchema, ${modelName}UncheckedUpdateInputObjectSchema ])  })`,
          )}`,
        );
      }

      if (aggregate) {
        const imports = [
          orderByImport,
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        const aggregateOperations = [];
        if (this.aggregateOperationSupport[modelName].count) {
          imports.push(
            this.generateImportStatement(`${modelName}CountAggregateInputObjectSchema`, `./objects/${modelName}CountAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_count: z.union([ z.literal(true), ${modelName}CountAggregateInputObjectSchema ]).optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].min) {
          imports.push(
            this.generateImportStatement(`${modelName}MinAggregateInputObjectSchema`, `./objects/${modelName}MinAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_min: ${modelName}MinAggregateInputObjectSchema.optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].max) {
          imports.push(
            this.generateImportStatement(`${modelName}MaxAggregateInputObjectSchema`, `./objects/${modelName}MaxAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_max: ${modelName}MaxAggregateInputObjectSchema.optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].avg) {
          imports.push(
            this.generateImportStatement(`${modelName}AvgAggregateInputObjectSchema`, `./objects/${modelName}AvgAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_avg: ${modelName}AvgAggregateInputObjectSchema.optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].sum) {
          imports.push(
            this.generateImportStatement(`${modelName}SumAggregateInputObjectSchema`, `./objects/${modelName}SumAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_sum: ${modelName}SumAggregateInputObjectSchema.optional()`,
          );
        }

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${aggregate}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}Aggregate`,
            `z.object({ ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), ${aggregateOperations.join(
              ', ',
            )} })`,
          )}`,
        );
      }

      if (groupBy) {
        const imports = [
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}OrderByWithAggregationInputObjectSchema`, `./objects/${modelName}OrderByWithAggregationInput.schema`),
          this.generateImportStatement(`${modelName}ScalarWhereWithAggregatesInputObjectSchema`, `./objects/${modelName}ScalarWhereWithAggregatesInput.schema`),
          this.generateImportStatement(`${modelName}ScalarFieldEnumSchema`, `./enums/${modelName}ScalarFieldEnum.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${groupBy}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}GroupBy`,
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional(), orderBy: z.union([${modelName}OrderByWithAggregationInputObjectSchema, ${modelName}OrderByWithAggregationInputObjectSchema.array()]).optional(), having: ${modelName}ScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(${modelName}ScalarFieldEnumSchema)  })`,
          )}`,
        );
      }
    }
  }

  generateImportStatements(imports: (string | undefined)[]) {
    let generatedImports = this.generateImportZodStatement();
    generatedImports +=
      imports?.filter((importItem) => !!importItem).join(';\r\n') ?? '';
    generatedImports += '\n\n';
    return generatedImports;
  }

  resolveSelectIncludeImportAndZodSchemaLine(model: PrismaDMMF.Model) {
    const { name: modelName } = model;

    const hasRelationToAnotherModel = checkModelHasModelRelation(model);

    const selectImport = Transformer.isGenerateSelect
      ? this.generateImportStatement(`${modelName}SelectObjectSchema`, `./objects/${modelName}Select.schema`)
      : '';

    const includeImport =
      Transformer.isGenerateInclude && hasRelationToAnotherModel
        ? this.generateImportStatement(`${modelName}IncludeObjectSchema`, `./objects/${modelName}Include.schema`)
        : '';

    let selectZodSchemaLine = '';
    let includeZodSchemaLine = '';
    let selectZodSchemaLineLazy = '';
    let includeZodSchemaLineLazy = '';

    if (Transformer.isGenerateSelect) {
      const zodSelectObjectSchema = `${modelName}SelectObjectSchema.optional()`;
      selectZodSchemaLine = `select: ${zodSelectObjectSchema},`;
      selectZodSchemaLineLazy = `select: z.lazy(() => ${zodSelectObjectSchema}),`;
    }

    if (Transformer.isGenerateInclude && hasRelationToAnotherModel) {
      const zodIncludeObjectSchema = `${modelName}IncludeObjectSchema.optional()`;
      includeZodSchemaLine = `include: ${zodIncludeObjectSchema},`;
      includeZodSchemaLineLazy = `include: z.lazy(() => ${zodIncludeObjectSchema}),`;
    }

    return {
      selectImport,
      includeImport,
      selectZodSchemaLine,
      includeZodSchemaLine,
      selectZodSchemaLineLazy,
      includeZodSchemaLineLazy,
    };
  }

  resolveOrderByWithRelationImportAndZodSchemaLine(model: PrismaDMMF.Model) {
    const { name: modelName } = model;
    let modelOrderBy = '';

    if (
      ['postgresql', 'mysql'].includes(Transformer.provider) &&
      Transformer.previewFeatures?.includes('fullTextSearch')
    ) {
      modelOrderBy = `${modelName}OrderByWithRelationAndSearchRelevanceInput`;
    } else {
      modelOrderBy = `${modelName}OrderByWithRelationInput`;
    }

    const orderByImport = this.generateImportStatement(`${modelOrderBy}ObjectSchema`, `./objects/${modelOrderBy}.schema`);
    const orderByZodSchemaLine = `orderBy: z.union([${modelOrderBy}ObjectSchema, ${modelOrderBy}ObjectSchema.array()]).optional(),`;

    return { orderByImport, orderByZodSchemaLine };
  }

  /**
   * Determines if a select schema should be inlined to avoid circular dependencies.
   * Following community generator approach: ALWAYS inline select schemas.
   * Use lazy loading only for specific relation fields within the inlined schema.
   */
  shouldInlineSelectSchema(_model: PrismaDMMF.Model): boolean {
    // Community generator approach: Always inline select schemas
    // This prevents circular imports by keeping select definitions local
    // Use z.lazy() only for relation fields within the inlined schema
    return true; // Always inline - aggressive inlining like community generator
  }

  /**
   * Generates inline select schema definition code within the FindMany file.
   * This prevents circular imports by defining the schema locally.
   * Follows community generator pattern with aggressive inlining.
   */
  generateInlineSelectSchema(model: PrismaDMMF.Model): string {
    const { name: modelName, fields } = model;
    
    // Generate field definitions for the select schema
    const selectFields: string[] = [];
    
    for (const field of fields) {
      const { name: fieldName, relationName, type } = field;
      
      if (relationName) {
        // Relation field: boolean OR lazy-loaded args schema (community generator pattern)
        // Use ArgsObjectSchema for related model (both single and array relations)
        const argsSchema = `${type}ArgsObjectSchema`;
        selectFields.push(`  ${fieldName}: z.union([z.boolean(),z.lazy(() => ${argsSchema})]).optional()`);
      } else {
        // Scalar field: just boolean
        selectFields.push(`  ${fieldName}: z.boolean().optional()`);
      }
    }
    
    // Add _count field if model has array relations (for aggregation support)
    const hasArrayRelations = fields.some(field => field.relationName && field.isList);
    if (hasArrayRelations) {
      selectFields.push(`  _count: z.union([z.boolean(),z.lazy(() => ${modelName}CountOutputTypeArgsObjectSchema)]).optional()`);
    }
    
    return `export const ${modelName}SelectSchema: z.ZodType<Prisma.${modelName}Select, Prisma.${modelName}Select> = z.object({
${selectFields.join(',\n')}
}).strict()`;
  }

  /**
   * Generates the additional imports needed for inlined select schemas.
   * Returns import statements for Args schemas referenced in relation fields.
   */
  generateInlineSelectImports(model: PrismaDMMF.Model): string[] {
    const imports: string[] = [];
    
    for (const field of model.fields) {
      if (field.relationName) {
        const argsSchema = `${field.type}ArgsObjectSchema`;
        imports.push(`import { ${argsSchema} } from './objects/${field.type}Args.schema'`);
      }
    }
    
    // Add _count import if model has array relations (only these get count output types)
    const hasArrayRelations = model.fields.some(field => field.relationName && field.isList);
    if (hasArrayRelations) {
      imports.push(`import { ${model.name}CountOutputTypeArgsObjectSchema } from './objects/${model.name}CountOutputTypeArgs.schema'`);
    }
    
    // Remove duplicates
    return [...new Set(imports)];
  }

  /**
   * Generates dual schema exports: typed version and Zod-method-friendly version
   */
  generateDualSchemaExports(
    modelName: string, 
    operationType: string, 
    schemaDefinition: string,
    prismaType: string
  ): string {
    const exports: string[] = [];

    // Generate typed schema (perfect inference, no methods)
    if (Transformer.exportTypedSchemas) {
      const typedName = `${modelName}${operationType}${Transformer.typedSchemaSuffix}`;
      exports.push(`export const ${typedName}: z.ZodType<${prismaType}, ${prismaType}> = ${schemaDefinition};`);
    }

    // Generate Zod schema (methods available, loose inference) 
    if (Transformer.exportZodSchemas) {
      const zodName = `${modelName}${operationType}${Transformer.zodSchemaSuffix}`;
      exports.push(`export const ${zodName} = ${schemaDefinition};`);
    }

    return exports.join('\n\n');
  }

  /**
   * Generates dual select schema exports for inlined schemas
   */
  generateDualSelectSchemaExports(model: PrismaDMMF.Model): string {
    const modelName = model.name;
    const schemaDefinition = this.generateInlineSelectSchemaDefinition(model);
    const exports: string[] = [];

    // Generate typed select schema
    if (Transformer.exportTypedSchemas) {
      const typedName = `${modelName}Select${Transformer.typedSchemaSuffix}`;
      exports.push(`export const ${typedName}: z.ZodType<Prisma.${modelName}Select, Prisma.${modelName}Select> = ${schemaDefinition};`);
    }

    // Generate Zod select schema  
    if (Transformer.exportZodSchemas) {
      const zodName = `${modelName}Select${Transformer.zodSchemaSuffix}`;
      exports.push(`export const ${zodName} = ${schemaDefinition};`);
    }

    return exports.join('\n\n');
  }

  /**
   * Generates just the schema definition without export statement
   */
  generateInlineSelectSchemaDefinition(model: PrismaDMMF.Model): string {
    const { name: modelName, fields } = model;
    
    // Generate field definitions for the select schema
    const selectFields: string[] = [];
    
    for (const field of fields) {
      const { name: fieldName, relationName, type } = field;
      
      if (relationName) {
        // Relation field: boolean OR lazy-loaded args schema (community generator pattern)
        // Use ArgsObjectSchema for related model (both single and array relations)
        const argsSchema = `${type}ArgsObjectSchema`;
        selectFields.push(`    ${fieldName}: z.union([z.boolean(),z.lazy(() => ${argsSchema})]).optional()`);
      } else {
        // Scalar field: just boolean
        selectFields.push(`    ${fieldName}: z.boolean().optional()`);
      }
    }
    
    // Add _count field if model has array relations (for aggregation support)
    const hasArrayRelations = fields.some(field => field.relationName && field.isList);
    if (hasArrayRelations) {
      selectFields.push(`    _count: z.union([z.boolean(),z.lazy(() => ${modelName}CountOutputTypeArgsObjectSchema)]).optional()`);
    }
    
    return `z.object({
${selectFields.join(',\n')}
  }).strict()`;
  }
}
