import type { ConnectorType, DMMF } from '@prisma/generator-helper';
import path from 'path';
import {
  checkModelHasModelRelation,
  findModelByName,
  isMongodbRawOp,
} from './helpers';
import { isAggregateInputType } from './helpers/aggregate-helpers';
import { AggregateOperationSupport, TransformerParams } from './types';
import { writeFileSafely } from './utils/writeFileSafely';
import { writeIndexFile } from './utils/writeIndexFile';
import { toPascalCase } from './helpers/pascal-case';
import { formatFindManyName } from './helpers/format-find-many';

export default class Transformer {
  name: string;
  fields: DMMF.SchemaArg[];
  schemaImports = new Set<string>();
  models: DMMF.Model[];
  modelOperations: DMMF.ModelMapping[];
  aggregateOperationSupport: AggregateOperationSupport;
  enumTypes: DMMF.SchemaEnum[];

  static enumNames: string[] = [];
  static rawOpsMap: { [name: string]: string } = {};
  static provider: ConnectorType;
  static previewFeatures: string[] | undefined;
  private static outputPath: string = './generated';
  private hasJson = false;
  private static prismaClientOutputPath: string = '@prisma/client';
  private static isCustomPrismaClientOutputPath: boolean = false;
  private static isGenerateSelect: boolean = false;
  private static isGenerateInclude: boolean = false;

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

  static getOutputPath() {
    return this.outputPath;
  }

  static setPrismaClientOutputPath(prismaClientCustomPath: string) {
    this.prismaClientOutputPath = prismaClientCustomPath;
    this.isCustomPrismaClientOutputPath =
      prismaClientCustomPath !== '@prisma/client';
  }

  static async generateIndex() {
    const indexPath = path.join(Transformer.outputPath, 'schemas/index.ts');
    await writeIndexFile(indexPath);
  }

  async generateEnumSchemas() {
    for (const enumType of this.enumTypes) {
      const { name, values } = enumType;

      await writeFileSafely(
        path.join(Transformer.outputPath, `schemas/enums/${toPascalCase(name)}.schema.ts`),
        `${this.generateImportZodStatement()}\n${this.generateExportSchemaStatement(
          `${toPascalCase(name)}`,
          `z.enum(${JSON.stringify(values)})`,
        )}`,
      );
    }
  }

  generateImportZodStatement() {
    return "import { z } from 'zod';\n";
  }

  generateExportSchemaStatement(name: string, schema: string) {
    return `export const ${toPascalCase(name)}Schema = ${schema}`;
  }

  async generateObjectSchema() {
    const zodObjectSchemaFields = this.generateObjectSchemaFields();
    const objectSchema = this.prepareObjectSchema(zodObjectSchemaFields);
    const objectSchemaName = this.resolveObjectSchemaName();

    await writeFileSafely(
      path.join(
        Transformer.outputPath,
        `schemas/objects/${toPascalCase(objectSchemaName)}.schema.ts`,
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
    fieldNotFiltered: DMMF.SchemaArg,
  ): [string, DMMF.SchemaArg, boolean][] {
    const field = {
      ...fieldNotFiltered,
      inputTypes: fieldNotFiltered.inputTypes.filter(
        (type) => !type.type.includes('RefInput'),
      ),
    };

    let lines = field.inputTypes;
    if (lines.length === 0) {
      return [];
    }

    let alternatives = lines.reduce<string[]>((result, inputType) => {
      if (inputType.type === 'String') {
        result.push(this.wrapWithZodValidators('z.string()', field, inputType));
      } else if (
        inputType.type === 'Int' ||
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
          this.wrapWithZodValidators('z.coerce.date()', field, inputType),
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
          this.wrapWithZodValidators('z.instanceof(Buffer)', field, inputType),
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

    const fieldName = alternatives.some((alt) => alt.includes(':'))
      ? ''
      : `  ${field.name}:`;

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
    field: DMMF.SchemaArg,
    inputType: DMMF.InputTypeRef,
  ) {
    let line: string = '';
    line = mainValidator;

    if (inputType.isList) {
      line += '.array()';
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
    field: DMMF.SchemaArg,
    inputType: DMMF.InputTypeRef,
    inputsLength: number,
  ) {
    const isEnum = inputType.location === 'enumTypes';

    const { isModelQueryType, modelName, queryName } =
      this.checkIsModelQueryType(inputType.type as string);

    let objectSchemaLine = isModelQueryType
      ? this.resolveModelQuerySchemaName(modelName!, queryName!)
      : `${inputType.type}ObjectSchema`;
    let enumSchemaLine = `${inputType.type}Schema`;

    const schema =
      inputType.type === this.name
        ? objectSchemaLine
        : isEnum
          ? enumSchemaLine
          : objectSchemaLine;

    const arr = inputType.isList ? '.array()' : '';

    const opt = !field.isRequired ? '.optional()' : '';

    return inputsLength === 1
      ? `  ${field.name}: z.lazy(() => ${toPascalCase(schema)})${arr}${opt}`
      : `z.lazy(() => ${toPascalCase(schema)})${arr}${opt}`;
  }

  generateFieldValidators(
    zodStringWithMainType: string,
    field: DMMF.SchemaArg,
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

    const prismaImportStatement = this.generateImportPrismaStatement();

    const json = this.generateJsonSchemaImplementation();

    return `${this.generateObjectSchemaImportStatements()}${prismaImportStatement}${json}${objectSchema}`;
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

    if (isAggregateInputType(name)) {
      name = `${toPascalCase(name)}Type`;
    }
    const end = `export const ${toPascalCase(exportName)}ObjectSchema = Schema`;
    return `
    // @ts-ignore
    const Schema: z.ZodType<Prisma.${toPascalCase(name)}> = ${schema};\n\n ${end}`;
  }

  addFinalWrappers({ zodStringFields }: { zodStringFields: string[] }) {
    const fields = [...zodStringFields];

    return this.wrapWithZodObject(fields) + '.strict()';
  }

  generateImportPrismaStatement() {
    let prismaClientImportPath: string;
    if (Transformer.isCustomPrismaClientOutputPath) {
      /**
       * If a custom location was designated for the prisma client, we need to figure out the
       * relative path from {outputPath}/schemas/objects to {prismaClientCustomPath}
       */
      const fromPath = path.join(Transformer.outputPath, 'schemas', 'objects');
      const toPath = Transformer.prismaClientOutputPath!;
      const relativePathFromOutputToPrismaClient = path
        .relative(fromPath, toPath)
        .split(path.sep)
        .join(path.posix.sep);
      prismaClientImportPath = relativePathFromOutputToPrismaClient;
    } else {
      /**
       * If the default output path for prisma client (@prisma/client) is being used, we can import from it directly
       * without having to resolve a relative path
       */
      prismaClientImportPath = Transformer.prismaClientOutputPath;
    }
    return `import type { Prisma } from '${prismaClientImportPath}';\n\n`;
  }

  generateJsonSchemaImplementation() {
    let jsonSchemaImplementation = '';

    if (this.hasJson) {
      jsonSchemaImplementation += `\n`;
      jsonSchemaImplementation += `const literalSchema = z.union([z.string(), z.number(), z.boolean()]);\n`;
      jsonSchemaImplementation += `const jsonSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>\n`;
      jsonSchemaImplementation += `  z.union([literalSchema, z.array(jsonSchema.nullable()), z.record(jsonSchema.nullable())])\n`;
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

  generateSchemaImports() {
    return [...this.schemaImports]
      .map((name) => {
        if (name.includes('RefInput')) {
          return '';
        }
        const { isModelQueryType, modelName, queryName } =
          this.checkIsModelQueryType(name);
        if (isModelQueryType) {
          return `import { ${this.resolveModelQuerySchemaName(
            toPascalCase(modelName)!,
            toPascalCase(queryName)!,
          )} } from '../${toPascalCase(queryName)}${toPascalCase(modelName)}.schema'`;
        } else if (Transformer.enumNames.includes(name)) {
          return `import { ${toPascalCase(name)}Schema } from '../enums/${toPascalCase(name)}.schema'`;
        } else {
          return `import { ${toPascalCase(name)}ObjectSchema } from './${toPascalCase(name)}.schema'`;
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
    return `${toPascalCase(modelName)}${toPascalCase(queryName)}Schema`;
  }

  wrapWithZodUnion(zodStringFields: string[]) {
    let wrapped = '';

    wrapped += 'z.union([';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields.join(',');
    wrapped += '\n';
    wrapped += '])';
    return wrapped;
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
        // @ts-ignore
        createOne,
        createMany,
        // @ts-ignore
        deleteOne,
        // @ts-ignore
        updateOne,
        deleteMany,
        updateMany,
        // @ts-ignore
        upsertOne,
        aggregate,
        groupBy,
      } = modelOperation;
      try {
        const model = findModelByName(this.models, modelName)!;

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
            `import { ${toPascalCase(modelName)}WhereUniqueInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereUniqueInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(findUnique)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}FindUnique`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${toPascalCase(modelName)}WhereUniqueInputObjectSchema })`,
            )}`,
          );
        }

        if (findFirst) {
          if (modelName.includes('Scalar')) {
          }
          const imports = [
            selectImport,
            includeImport,
            orderByImport,
            `import { ${toPascalCase(modelName)}WhereInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereInput.schema'`,
            `import { ${toPascalCase(modelName)}WhereUniqueInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereUniqueInput.schema'`,
            `import { ${toPascalCase(modelName)}ScalarFieldEnumSchema } from './enums/${toPascalCase(modelName)}ScalarFieldEnum.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(findFirst)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}FindFirst`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} ${orderByZodSchemaLine} where: ${toPascalCase(modelName)}WhereInputObjectSchema.optional(), cursor: ${toPascalCase(modelName)}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.array(${toPascalCase(modelName)}ScalarFieldEnumSchema).optional() })`,
            )}`,
          );
        }

        if (findMany) {
          const imports = [
            selectImport,
            includeImport,
            orderByImport,
            `import { ${toPascalCase(modelName)}WhereInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereInput.schema'`,
            `import { ${toPascalCase(modelName)}WhereUniqueInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereUniqueInput.schema'`,
            `import { ${toPascalCase(modelName)}ScalarFieldEnumSchema } from './enums/${toPascalCase(modelName)}ScalarFieldEnum.schema'`,
          ];

          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(formatFindManyName(findMany))}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}FindMany`,
              `z.object({ ${selectZodSchemaLineLazy} ${includeZodSchemaLineLazy} ${orderByZodSchemaLine} where: ${toPascalCase(modelName)}WhereInputObjectSchema.optional(), cursor: ${toPascalCase(modelName)}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.array(${toPascalCase(modelName)}ScalarFieldEnumSchema).optional()  })`,
            )}`,
          );
        }

        if (createOne) {
          const imports = [
            selectImport,
            includeImport,
            `import { ${toPascalCase(modelName)}CreateInputObjectSchema } from './objects/${toPascalCase(modelName)}CreateInput.schema'`,
            `import { ${toPascalCase(modelName)}UncheckedCreateInputObjectSchema } from './objects/${toPascalCase(modelName)}UncheckedCreateInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(createOne)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}CreateOne`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${toPascalCase(modelName)}CreateInputObjectSchema, ${toPascalCase(modelName)}UncheckedCreateInputObjectSchema])  })`,
            )}`,
          );
        }

        if (createMany) {
          const imports = [
            `import { ${toPascalCase(modelName)}CreateManyInputObjectSchema } from './objects/${toPascalCase(modelName)}CreateManyInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(createMany)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}CreateMany`,
              `z.object({ data: z.union([ ${toPascalCase(modelName)}CreateManyInputObjectSchema, z.array(${toPascalCase(modelName)}CreateManyInputObjectSchema) ]), ${
                Transformer.provider === 'mongodb' ||
                Transformer.provider === 'sqlserver'
                  ? ''
                  : 'skipDuplicates: z.boolean().optional()'
              } })`,
            )}`,
          );
        }

        if (deleteOne) {
          const imports = [
            selectImport,
            includeImport,
            `import { ${toPascalCase(modelName)}WhereUniqueInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereUniqueInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(deleteOne)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}DeleteOne`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${toPascalCase(modelName)}WhereUniqueInputObjectSchema  })`,
            )}`,
          );
        }

        if (deleteMany) {
          const imports = [
            `import { ${toPascalCase(modelName)}WhereInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(deleteMany)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}DeleteMany`,
              `z.object({ where: ${toPascalCase(modelName)}WhereInputObjectSchema.optional()  })`,
            )}`,
          );
        }

        if (updateOne) {
          const imports = [
            selectImport,
            includeImport,
            `import { ${toPascalCase(modelName)}UpdateInputObjectSchema } from './objects/${toPascalCase(modelName)}UpdateInput.schema'`,
            `import { ${toPascalCase(modelName)}UncheckedUpdateInputObjectSchema } from './objects/${toPascalCase(modelName)}UncheckedUpdateInput.schema'`,
            `import { ${toPascalCase(modelName)}WhereUniqueInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereUniqueInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(updateOne)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}UpdateOne`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${toPascalCase(modelName)}UpdateInputObjectSchema, ${toPascalCase(modelName)}UncheckedUpdateInputObjectSchema]), where: ${toPascalCase(modelName)}WhereUniqueInputObjectSchema  })`,
            )}`,
          );
        }

        if (updateMany) {
          const imports = [
            `import { ${toPascalCase(modelName)}UpdateManyMutationInputObjectSchema } from './objects/${toPascalCase(modelName)}UpdateManyMutationInput.schema'`,
            `import { ${toPascalCase(modelName)}WhereInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(updateMany)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}UpdateMany`,
              `z.object({ data: ${toPascalCase(modelName)}UpdateManyMutationInputObjectSchema, where: ${toPascalCase(modelName)}WhereInputObjectSchema.optional()  })`,
            )}`,
          );
        }

        if (upsertOne) {
          const imports = [
            selectImport,
            includeImport,
            `import { ${toPascalCase(modelName)}WhereUniqueInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereUniqueInput.schema'`,
            `import { ${toPascalCase(modelName)}CreateInputObjectSchema } from './objects/${toPascalCase(modelName)}CreateInput.schema'`,
            `import { ${toPascalCase(modelName)}UncheckedCreateInputObjectSchema } from './objects/${toPascalCase(modelName)}UncheckedCreateInput.schema'`,
            `import { ${toPascalCase(modelName)}UpdateInputObjectSchema } from './objects/${toPascalCase(modelName)}UpdateInput.schema'`,
            `import { ${toPascalCase(modelName)}UncheckedUpdateInputObjectSchema } from './objects/${toPascalCase(modelName)}UncheckedUpdateInput.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(upsertOne)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}Upsert`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${toPascalCase(modelName)}WhereUniqueInputObjectSchema, create: z.union([ ${toPascalCase(modelName)}CreateInputObjectSchema, ${toPascalCase(modelName)}UncheckedCreateInputObjectSchema ]), update: z.union([ ${toPascalCase(modelName)}UpdateInputObjectSchema, ${toPascalCase(modelName)}UncheckedUpdateInputObjectSchema ])  })`,
            )}`,
          );
        }

        if (aggregate) {
          const imports = [
            orderByImport,
            `import { ${toPascalCase(modelName)}WhereInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereInput.schema'`,
            `import { ${toPascalCase(modelName)}WhereUniqueInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereUniqueInput.schema'`,
          ];
          const aggregateOperations = [];
          if (this.aggregateOperationSupport[modelName]?.count) {
            imports.push(
              `import { ${toPascalCase(modelName)}CountAggregateInputObjectSchema } from './objects/${toPascalCase(modelName)}CountAggregateInput.schema'`,
            );
            aggregateOperations.push(
              `_count: z.union([ z.literal(true), ${toPascalCase(modelName)}CountAggregateInputObjectSchema ]).optional()`,
            );
          }
          if (this.aggregateOperationSupport[modelName]?.min) {
            imports.push(
              `import { ${toPascalCase(modelName)}MinAggregateInputObjectSchema } from './objects/${toPascalCase(modelName)}MinAggregateInput.schema'`,
            );
            aggregateOperations.push(
              `_min: ${toPascalCase(modelName)}MinAggregateInputObjectSchema.optional()`,
            );
          }
          if (this.aggregateOperationSupport[modelName]?.max) {
            imports.push(
              `import { ${toPascalCase(modelName)}MaxAggregateInputObjectSchema } from './objects/${toPascalCase(modelName)}MaxAggregateInput.schema'`,
            );
            aggregateOperations.push(
              `_max: ${toPascalCase(modelName)}MaxAggregateInputObjectSchema.optional()`,
            );
          }
          if (this.aggregateOperationSupport[modelName]?.avg) {
            imports.push(
              `import { ${toPascalCase(modelName)}AvgAggregateInputObjectSchema } from './objects/${toPascalCase(modelName)}AvgAggregateInput.schema'`,
            );
            aggregateOperations.push(
              `_avg: ${toPascalCase(modelName)}AvgAggregateInputObjectSchema.optional()`,
            );
          }
          if (this.aggregateOperationSupport[modelName]?.sum) {
            imports.push(
              `import { ${toPascalCase(modelName)}SumAggregateInputObjectSchema } from './objects/${toPascalCase(modelName)}SumAggregateInput.schema'`,
            );
            aggregateOperations.push(
              `_sum: ${toPascalCase(modelName)}SumAggregateInputObjectSchema.optional()`,
            );
          }

          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(aggregate)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}Aggregate`,
              `z.object({ ${orderByZodSchemaLine} where: ${toPascalCase(modelName)}WhereInputObjectSchema.optional(), cursor: ${toPascalCase(modelName)}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), ${aggregateOperations.join(
                ', ',
              )} })`,
            )}`,
          );
        }

        if (groupBy) {
          const imports = [
            `import { ${toPascalCase(modelName)}WhereInputObjectSchema } from './objects/${toPascalCase(modelName)}WhereInput.schema'`,
            `import { ${toPascalCase(modelName)}OrderByWithAggregationInputObjectSchema } from './objects/${toPascalCase(modelName)}OrderByWithAggregationInput.schema'`,
            `import { ${toPascalCase(modelName)}ScalarWhereWithAggregatesInputObjectSchema } from './objects/${toPascalCase(modelName)}ScalarWhereWithAggregatesInput.schema'`,
            `import { ${toPascalCase(modelName)}ScalarFieldEnumSchema } from './enums/${toPascalCase(modelName)}ScalarFieldEnum.schema'`,
          ];
          await writeFileSafely(
            path.join(Transformer.outputPath, `schemas/${toPascalCase(groupBy)}.schema.ts`),
            `${this.generateImportStatements(
              imports,
            )}${this.generateExportSchemaStatement(
              `${toPascalCase(modelName)}GroupBy`,
              `z.object({ where: ${toPascalCase(modelName)}WhereInputObjectSchema.optional(), orderBy: z.union([${toPascalCase(modelName)}OrderByWithAggregationInputObjectSchema, ${toPascalCase(modelName)}OrderByWithAggregationInputObjectSchema.array()]).optional(), having: ${toPascalCase(modelName)}ScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(${toPascalCase(modelName)}ScalarFieldEnumSchema)  })`,
            )}`,
          );
        }
      } catch (error) {
        console.log('error', error)
        
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

  resolveSelectIncludeImportAndZodSchemaLine(model: DMMF.Model) {
    const { name: modelName } = model;

    const hasRelationToAnotherModel = checkModelHasModelRelation(model);

    const selectImport = Transformer.isGenerateSelect
      ? `import { ${toPascalCase(modelName)}SelectObjectSchema } from './objects/${toPascalCase(modelName)}Select.schema'`
      : '';

    const includeImport =
      Transformer.isGenerateInclude && hasRelationToAnotherModel
        ? `import { ${toPascalCase(modelName)}IncludeObjectSchema } from './objects/${toPascalCase(modelName)}Include.schema'`
        : '';

    let selectZodSchemaLine = '';
    let includeZodSchemaLine = '';
    let selectZodSchemaLineLazy = '';
    let includeZodSchemaLineLazy = '';

    if (Transformer.isGenerateSelect) {
      const zodSelectObjectSchema = `${toPascalCase(modelName)}SelectObjectSchema.optional()`;
      selectZodSchemaLine = `select: ${zodSelectObjectSchema},`;
      selectZodSchemaLineLazy = `select: z.lazy(() => ${zodSelectObjectSchema}),`;
    }

    if (Transformer.isGenerateInclude && hasRelationToAnotherModel) {
      const zodIncludeObjectSchema = `${toPascalCase(modelName)}IncludeObjectSchema.optional()`;
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

  resolveOrderByWithRelationImportAndZodSchemaLine(model: DMMF.Model) {
    const { name: modelName } = model;
    let modelOrderBy = '';

    if (
      ['postgresql', 'mysql'].includes(Transformer.provider) &&
      Transformer.previewFeatures?.includes('fullTextSearch')
    ) {
      modelOrderBy = `${toPascalCase(modelName)}OrderByWithRelationAndSearchRelevanceInput`;
    } else {
      modelOrderBy = `${toPascalCase(modelName)}OrderByWithRelationInput`;
    }

    const orderByImport = `import { ${modelOrderBy}ObjectSchema } from './objects/${modelOrderBy}.schema'`;
    const orderByZodSchemaLine = `orderBy: z.union([${modelOrderBy}ObjectSchema, ${modelOrderBy}ObjectSchema.array()]).optional(),`;

    return { orderByImport, orderByZodSchemaLine };
  }
}
