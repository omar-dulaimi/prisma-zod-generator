import { DMMF as PrismaDMMF } from '@prisma/client/runtime';
import path from 'path';
import { writeFileSafely } from './utils/writeFileSafely';

export default class Transformer {
  name?: string;
  fields?: PrismaDMMF.SchemaArg[];
  schemaImports?: Set<string>;
  modelOperations?: PrismaDMMF.ModelMapping[];
  enumTypes?: PrismaDMMF.SchemaEnum[];
  static enumNames: Array<string> = [];
  private static outputPath: string = './generated';
  constructor({
    name,
    fields,
    modelOperations,
    enumTypes,
  }: {
    name?: string | undefined;
    fields?: PrismaDMMF.SchemaArg[] | undefined;
    schemaImports?: Set<string>;
    modelOperations?: PrismaDMMF.ModelMapping[];
    enumTypes?: PrismaDMMF.SchemaEnum[];
  }) {
    this.name = name ?? '';
    this.fields = fields ?? [];
    this.modelOperations = modelOperations ?? [];
    this.schemaImports = new Set();
    this.enumTypes = enumTypes;
  }

  static setOutputPath(outPath: string) {
    this.outputPath = outPath;
  }

  static getOutputPath() {
    return this.outputPath;
  }

  addSchemaImport(name: string) {
    this.schemaImports?.add(name);
  }

  getAllSchemaImports() {
    return [...(this.schemaImports ?? [])]
      .map((name) =>
        Transformer.enumNames.includes(name)
          ? `import { ${name}Schema } from '../enums/${name}.schema';`
          : [`import { ${name}ObjectSchema } from './${name}.schema';`],
      )
      .flatMap((item) => item)
      .join(';\r\n');
  }

  getPrismaStringLine(
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArgInputType,
    inputsLength: number,
    isEnum: boolean,
  ) {
    let objectSchemaLine = `${inputType.type}ObjectSchema`;
    let enumSchemaLine = `${`${inputType.type}Schema`}`;
    if (!field.isRequired && !inputType.isList) {
      objectSchemaLine += '?.optional()';
      enumSchemaLine += '?.optional()';
    }
    if (inputType.isList) {
      if (inputType.type === this.name) {
        return inputsLength === 1
          ? `  ${field.name}: z.array(${`z.lazy(() => ${objectSchemaLine}`}))`
          : `z.array(${`z.lazy(() => ${objectSchemaLine}`}))`;
      } else {
        if (inputsLength === 1) {
          return `  ${field.name}: ${
            isEnum ? enumSchemaLine : `z.array(${objectSchemaLine})`
          }`;
        } else {
          return `${isEnum ? enumSchemaLine : `z.array(${objectSchemaLine})`}`;
        }
      }
    } else {
      if (inputType.type === this.name) {
        return inputsLength === 1
          ? `  ${field.name}: ${`z.lazy(() => ${objectSchemaLine})`}`
          : `${`z.lazy(() => ${objectSchemaLine})`}`;
      } else {
        return inputsLength === 1
          ? `  ${field.name}: ${
              isEnum ? enumSchemaLine : `${objectSchemaLine}`
            }`
          : `${isEnum ? enumSchemaLine : `${objectSchemaLine}`}`;
      }
    }
  }

  wrapWithZodArray(line: string, inputType: PrismaDMMF.SchemaArgInputType) {
    return inputType.isList ? `z.array(${line})` : line;
  }

  wrapWithZodValidators(
    mainValidator: string,
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArgInputType,
  ) {
    let line: string = '';
    line = mainValidator;
    if (!field.isRequired && !inputType.isList) {
      line += '?.optional()';
    }
    line = this.wrapWithZodArray(line, inputType);
    return line;
  }

  getObjectSchemaLine(field: PrismaDMMF.SchemaArg) {
    let lines: any = field.inputTypes;
    const inputsLength = field.inputTypes.length;
    if (inputsLength === 0) return lines;

    let alternatives = lines.reduce(
      (result: Array<string>, inputType: PrismaDMMF.SchemaArgInputType) => {
        if (inputType.type === 'String') {
          result.push(
            this.wrapWithZodValidators('z.string()', field, inputType),
          );
        } else if (inputType.type === 'Int' || inputType.type === 'Float') {
          result.push(
            this.wrapWithZodValidators('z.number()', field, inputType),
          );
        } else if (inputType.type === 'Boolean') {
          result.push(
            this.wrapWithZodValidators('z.boolean()', field, inputType),
          );
        } else if (inputType.type === 'DateTime') {
          result.push(this.wrapWithZodValidators('z.date()', field, inputType));
        } else {
          const isEnum = inputType.location === 'enumTypes';

          if (inputType.namespace === 'prisma' || isEnum) {
            if (inputType.type !== this.name) {
              this.addSchemaImport(inputType.type as string);
            }
            result.push(
              this.getPrismaStringLine(field, inputType, inputsLength, isEnum),
            );
          }
        }
        return result;
      },
      [],
    );

    if (alternatives.length > 0) {
      if (field.isNullable) {
        alternatives[alternatives.length - 1] =
          alternatives[alternatives.length - 1] + '.nullable()';
      }
      if (alternatives.length > 1) {
        alternatives = alternatives.map((alter: string) =>
          alter.replace('?.optional()', ''),
        );
      }
      lines = [
        [
          `  ${
            alternatives.some((alt: string) => alt.includes(':'))
              ? ''
              : `  ${field.name}:`
          } ${
            alternatives.length === 1
              ? alternatives.join(',\r\n')
              : `z.union([${alternatives.join(',\r\n')}])${
                  !field.isRequired ? '?.optional()' : ''
                }`
          } `,
          field,
          true,
        ],
      ];
    } else {
      return [[]];
    }

    return lines.filter(Boolean);
  }

  getFieldValidators(
    zodStringWithMainType: string,
    field: PrismaDMMF.SchemaArg,
  ) {
    let zodStringWithAllValidators = zodStringWithMainType;
    const { isRequired, isNullable } = field;
    if (!isRequired) {
      zodStringWithAllValidators += '?.optional()';
    }
    if (isNullable) {
      zodStringWithAllValidators += '.nullable()';
    }
    return zodStringWithAllValidators;
  }

  wrapWithObject({
    zodStringFields,
    isArray = true,
    forData = false,
  }: {
    zodStringFields: string;
    isArray?: boolean;
    forData?: boolean;
  }) {
    let wrapped = '{';
    wrapped += '\n';
    wrapped += isArray
      ? '  ' + (zodStringFields as unknown as Array<string>).join('\r\n,')
      : '  ' + zodStringFields;
    wrapped += '\n';
    wrapped += forData ? '  ' + '}' : '}';
    return wrapped;
  }

  getImportZod() {
    let zodImportStatement = "import { z } from 'zod';";
    zodImportStatement += '\n';
    return zodImportStatement;
  }

  getImportsForObjectSchemas() {
    let imports = this.getImportZod();
    imports += this.getAllSchemaImports();
    imports += '\n\n';
    return imports;
  }

  getImportsForSchemas(additionalImports: Array<string>) {
    let imports = this.getImportZod();
    imports += [...additionalImports].join(';\r\n');
    imports += '\n\n';
    return imports;
  }

  addExportObjectSchema(schema: string) {
    return `export const ${this.name}ObjectSchema = ${schema};`;
  }

  addExportSchema(schema: string, name: string) {
    return `export const ${name}Schema = ${schema}`;
  }

  addTsIgnore() {
    return `///@ts-ignore\r\n`;
  }

  checkIfSchemaShouldBeIgnored({
    zodStringFields,
    objectName,
  }: {
    zodStringFields: Array<string>;
    objectName: string;
  }) {
    let shouldIgnoreSchema = false;
    if (
      objectName.includes('Filter') ||
      (typeof zodStringFields === 'string' &&
        ((zodStringFields as Array<string>).includes('.lazy(') ||
          (zodStringFields as Array<string>).includes('Filter'))) ||
      (Array.isArray(zodStringFields) &&
        zodStringFields.some(
          (field) =>
            field.includes('.lazy(') ||
            field.includes('some') ||
            field.includes('every') ||
            field.includes('none') ||
            field.includes('Filter'),
        ))
    ) {
      shouldIgnoreSchema = true;
    }
    return shouldIgnoreSchema;
  }

  wrapWithZodObject({ zodStringFields }: { zodStringFields: any }) {
    let wrapped = 'z.object({';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields;
    wrapped += '\n';
    wrapped += '})';
    return wrapped;
  }

  wrapWithZodOUnion({ zodStringFields }: { zodStringFields: Array<string> }) {
    let wrapped = 'z.union([';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields.join(',');
    wrapped += '\n';
    wrapped += '])';
    return wrapped;
  }

  addFinalWrappers({ zodStringFields }: { zodStringFields: Array<string> }) {
    let wrapped = '';
    let fields = [...zodStringFields];
    const shouldWrapWithUnion = fields.some(
      (field) =>
        // TODO handle other cases if any
        // field.includes('create:') ||
        field.includes('connectOrCreate:') || field.includes('connect:'),
    );
    if (shouldWrapWithUnion) {
      fields = fields.map(
        (field) => `${this.wrapWithZodObject({ zodStringFields: field })}`,
      );
      wrapped = this.wrapWithZodOUnion({ zodStringFields: fields });
    } else {
      wrapped = 'z.object({';
      wrapped += '\n';
      wrapped += '  ' + fields;
      wrapped += '\n';
      wrapped += '})';
      wrapped = this.wrapWithZodObject({ zodStringFields: fields });
    }

    return wrapped;
  }
  getFinalForm(zodStringFields: Array<string>, objectName: string) {
    const shouldIgnoreSchema = this.checkIfSchemaShouldBeIgnored({
      zodStringFields,
      objectName,
    });
    const objectSchema = `${
      shouldIgnoreSchema ? this.addTsIgnore() : ''
    }${this.addExportObjectSchema(
      this.addFinalWrappers({ zodStringFields }),
    )}\n`;
    return `${this.getImportsForObjectSchemas()}${objectSchema}`;
  }
  async printObjectSchemas() {
    const zodStringFields: Array<string> = (this.fields ?? [])
      // TODO find a way to handle self refs, zod makes it hard to do so
      // https://github.com/colinhacks/zod#recursive-types
      .filter((field) => !['AND', 'OR', 'NOT'].includes(field.name))
      .map((field) => {
        const value = this.getObjectSchemaLine(field);
        return value;
      })
      .flatMap((item) => item)
      .filter((item) => item && item.length > 0)
      .map((item) => {
        const [zodStringWithMainType, field, skipValidators] = item;
        const value = skipValidators
          ? zodStringWithMainType
          : this.getFieldValidators(zodStringWithMainType, field);
        return value;
      })
      .map((field) => {
        return field.trim();
      });

    await writeFileSafely(
      path.join(
        Transformer.outputPath,
        `schemas/objects/${this.name}.schema.ts`,
      ),
      this.getFinalForm(zodStringFields, this.name as string),
    );
  }

  async printModelSchemas() {
    for (const model of this.modelOperations ?? []) {
      const {
        model: modelName,
        findUnique,
        findFirst,
        findMany,
        create,
        update,
        deleteMany,
        updateMany,
        upsert,
        aggregate,
        groupBy,
      } = model;

      if (findUnique) {
        const imports = [
          `import { ${modelName}WhereUniqueInputObjectSchema } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${findUnique}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereUniqueInputObjectSchema })`,
            `${modelName}FindUnique`,
          )}`,
        );
      }

      if (findFirst) {
        const imports = [
          `import { ${modelName}WhereInputObjectSchema } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithRelationInputObjectSchema } from './objects/${modelName}OrderByWithRelationInput.schema'`,
          `import { ${modelName}WhereUniqueInputObjectSchema } from './objects/${modelName}WhereUniqueInput.schema'`,
          `import { ${modelName}ScalarFieldEnumSchema } from './enums/${modelName}ScalarFieldEnum.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${findFirst}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional(), orderBy: ${modelName}OrderByWithRelationInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.array(${modelName}ScalarFieldEnumSchema).optional() })`,
            `${modelName}FindFirst`,
          )}`,
        );
      }

      if (findMany) {
        const imports = [
          `import { ${modelName}WhereInputObjectSchema } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithRelationInputObjectSchema } from './objects/${modelName}OrderByWithRelationInput.schema'`,
          `import { ${modelName}WhereUniqueInputObjectSchema } from './objects/${modelName}WhereUniqueInput.schema'`,
          `import { ${modelName}ScalarFieldEnumSchema } from './enums/${modelName}ScalarFieldEnum.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${findMany}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional(), orderBy: ${modelName}OrderByWithRelationInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.array(${modelName}ScalarFieldEnumSchema).optional()  })`,
            `${modelName}FindMany`,
          )}`,
        );
      }

      if (create) {
        const imports = [
          `import { ${modelName}CreateInputObjectSchema } from './objects/${modelName}CreateInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${create}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ data: ${modelName}CreateInputObjectSchema  })`,
            `${modelName}Create`,
          )}`,
        );
      }

      if (model.delete) {
        const imports = [
          `import { ${modelName}WhereUniqueInputObjectSchema } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(
            Transformer.outputPath,
            `schemas/${model.delete}.schema.ts`,
          ),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereUniqueInputObjectSchema  })`,
            `${modelName}DeleteOne`,
          )}`,
        );
      }

      if (deleteMany) {
        const imports = [
          `import { ${modelName}WhereInputObjectSchema } from './objects/${modelName}WhereInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${deleteMany}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional()  })`,
            `${modelName}DeleteMany`,
          )}`,
        );
      }

      if (update) {
        const imports = [
          `import { ${modelName}UpdateInputObjectSchema } from './objects/${modelName}UpdateInput.schema'`,
          `import { ${modelName}WhereUniqueInputObjectSchema } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${update}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ data: ${modelName}UpdateInputObjectSchema, where: ${modelName}WhereUniqueInputObjectSchema  })`,
            `${modelName}UpdateOne`,
          )}`,
        );
      }

      if (updateMany) {
        const imports = [
          `import { ${modelName}UpdateManyMutationInputObjectSchema } from './objects/${modelName}UpdateManyMutationInput.schema'`,
          `import { ${modelName}WhereInputObjectSchema } from './objects/${modelName}WhereInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${updateMany}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ data: ${modelName}UpdateManyMutationInputObjectSchema, where: ${modelName}WhereInputObjectSchema.optional()  })`,
            `${modelName}UpdateMany`,
          )}`,
        );
      }

      if (upsert) {
        const imports = [
          `import { ${modelName}WhereUniqueInputObjectSchema } from './objects/${modelName}WhereUniqueInput.schema'`,
          `import { ${modelName}CreateInputObjectSchema } from './objects/${modelName}CreateInput.schema'`,
          `import { ${modelName}UpdateInputObjectSchema } from './objects/${modelName}UpdateInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${upsert}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereUniqueInputObjectSchema, create: ${modelName}CreateInputObjectSchema, update: ${modelName}UpdateInputObjectSchema  })`,
            `${modelName}Upsert`,
          )}`,
        );
      }

      if (aggregate) {
        const imports = [
          `import { ${modelName}WhereInputObjectSchema } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithRelationInputObjectSchema } from './objects/${modelName}OrderByWithRelationInput.schema'`,
          `import { ${modelName}WhereUniqueInputObjectSchema } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${aggregate}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional(), orderBy: ${modelName}OrderByWithRelationInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional()  })`,
            `${modelName}Aggregate`,
          )}`,
        );
      }

      if (groupBy) {
        const imports = [
          `import { ${modelName}WhereInputObjectSchema } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithAggregationInputObjectSchema } from './objects/${modelName}OrderByWithAggregationInput.schema'`,
          `import { ${modelName}ScalarWhereWithAggregatesInputObjectSchema } from './objects/${modelName}ScalarWhereWithAggregatesInput.schema'`,
          `import { ${modelName}ScalarFieldEnumSchema } from './enums/${modelName}ScalarFieldEnum.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${groupBy}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional(), orderBy: ${modelName}OrderByWithAggregationInputObjectSchema, having: ${modelName}ScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(${modelName}ScalarFieldEnumSchema)  })`,
            `${modelName}GroupBy`,
          )}`,
        );
      }
    }
  }

  async printEnumSchemas() {
    for (const enumType of this.enumTypes ?? []) {
      const { name, values } = enumType;
      await writeFileSafely(
        path.join(Transformer.outputPath, `schemas/enums/${name}.schema.ts`),
        `${this.getImportZod()}\n${this.addExportSchema(
          `z.enum(${JSON.stringify(values)})`,
          `${name}`,
        )}`,
      );
    }
  }
}
