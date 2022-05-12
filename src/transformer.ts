import { DMMF as PrismaDMMF } from '@prisma/client/runtime';
import path from 'path';
import { writeFileSafely } from './utils/writeFileSafely';

export default class Transformer {
  name?: string;
  fields?: PrismaDMMF.SchemaArg[];
  schemaImports?: Set<string>;
  modelOperations?: PrismaDMMF.ModelMapping[];
  enumTypes?: PrismaDMMF.SchemaEnum[];
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
        name === 'SortOrder' || name === 'QueryMode'
          ? `import { ${name}Schema } from '../enums/${name}.schema';`
          : [
              `import { ${name}SchemaObject } from './${name}.schema';`,
              `import { ${name}ObjectSchema } from './${name}.schema';`,
            ],
      )
      .flatMap((item) => item)
      .join(';\r\n');
  }

  getPrismaStringLine(
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArgInputType,
    inputsLength: number,
  ) {
    if (inputsLength === 1) {
      if (inputType.isList) {
        if (inputType.type === this.name) {
          return `  ${
            field.name
          }: z.array(${`z.lazy(() => ${inputType.type}ObjectSchema`}))`;
        } else {
          return `  ${field.name}: ${
            ['SortOrder', 'QueryMode'].includes(inputType.type as string)
              ? `${`${inputType.type}Schema`}`
              : `z.array(z.object(${`${inputType.type}SchemaObject`}))`
          }`;
        }
      } else {
        if (inputType.type === this.name) {
          return `  ${
            field.name
          }: ${`z.lazy(() => ${inputType.type}ObjectSchema)`}`;
        } else {
          return `  ${field.name}: ${
            ['SortOrder', 'QueryMode'].includes(inputType.type as string)
              ? `${`${inputType.type}Schema`}`
              : `z.object(${`${inputType.type}SchemaObject`})`
          }`;
        }
      }
    }

    if (inputsLength > 1) {
      if (inputType.isList) {
        if (inputType.type === this.name) {
          return `z.array(${`z.lazy(() => ${inputType.type}ObjectSchema`}))`;
        } else {
          return `${
            ['SortOrder', 'QueryMode'].includes(inputType.type as string)
              ? `${`${inputType.type}Schema`}`
              : `z.array(z.object(${`${inputType.type}SchemaObject`}))`
          }`;
        }
      } else {
        if (inputType.type === this.name) {
          return `${`z.lazy(() => ${inputType.type}ObjectSchema)`}`;
        } else {
          return `${
            ['SortOrder', 'QueryMode'].includes(inputType.type as string)
              ? `${`${inputType.type}Schema`}`
              : `z.object(${`${inputType.type}SchemaObject`})`
          }`;
        }
      }
    }
    return '';
  }

  getSchemaObjectLine(field: PrismaDMMF.SchemaArg) {
    let lines: any = field.inputTypes;

    const inputsLength = field.inputTypes.length;
    if (inputsLength === 0) return lines;

    if (inputsLength === 1) {
      lines = lines.map((inputType: PrismaDMMF.SchemaArgInputType) => {
        if (inputType.type === 'String') {
          return [`  ${field.name}: ${'z.string()'}`, field];
        } else if (inputType.type === 'Int' || inputType.type === 'Float') {
          return [`  ${field.name}: ${'z.number()'}`, field];
        } else if (inputType.type === 'Boolean') {
          return [`  ${field.name}: ${'z.boolean()'}`, field];
        } else if (inputType.type === 'DateTime') {
          return [`  ${field.name}: ${'z.date()'}`, field];
        } else {
          if (inputType.namespace === 'prisma') {
            if (inputType.type !== this.name) {
              this.addSchemaImport(inputType.type as string);
            }

            return [
              this.getPrismaStringLine(field, inputType, inputsLength),
              field,
              true,
            ];
          }
        }
        return [];
      });
    } else {
      const alternatives = lines.reduce(
        (result: Array<string>, inputType: PrismaDMMF.SchemaArgInputType) => {
          if (inputType.type === 'String') {
            result.push(
              inputType.isList ? 'z.array(z.string())' : 'z.string()',
            );
          } else if (inputType.type === 'Int' || inputType.type === 'Float') {
            result.push(
              inputType.isList ? 'z.array(z.number())' : 'z.number()',
            );
          } else if (inputType.type === 'Boolean') {
            result.push(
              inputType.isList ? 'z.array(z.boolean())' : 'z.boolean()',
            );
          } else if (inputType.type === 'DateTime') {
            result.push(inputType.isList ? 'z.array(z.date())' : 'z.date()');
          } else {
            if (inputType.namespace === 'prisma') {
              if (inputType.type !== this.name) {
                this.addSchemaImport(inputType.type as string);
              }
              result.push(
                this.getPrismaStringLine(field, inputType, inputsLength),
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
        lines = [
          [
            `  ${field.name}: ${
              alternatives.length === 1
                ? alternatives.join(',\r\n')
                : `z.union([${alternatives.join(',\r\n')}])`
            } `,
            field,
            true,
          ],
        ];
      } else {
        return [[]];
      }
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
      zodStringWithAllValidators += '.optional()';
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

  wrapWithZodObject({ zodStringFields }: { zodStringFields: string }) {
    let wrapped = 'z.object({';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields;
    wrapped += '\n';
    wrapped += '})';
    return wrapped;
  }

  getImportZod() {
    let zodImportStatement = "import { z } from 'zod';";
    zodImportStatement += '\n';
    return zodImportStatement;
  }

  getImportsForSchemaObjects() {
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

  addExportSchemaObject(schema: string) {
    return `export const ${this.name}SchemaObject = ${schema};`;
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

  checkIfSchemaShouldBeIgnored(zodStringFields: string, objectName: string) {
    let shouldIgnoreSchema = false;
    if (
      objectName.includes('Filter') ||
      (typeof zodStringFields === 'string' &&
        (zodStringFields.includes('.lazy(') ||
          zodStringFields.includes('Filter'))) ||
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

  getFinalForm(zodStringFields: string, objectName: string) {
    const shouldIgnoreSchema = this.checkIfSchemaShouldBeIgnored(
      zodStringFields,
      objectName,
    );
    const schemaObject = `${
      shouldIgnoreSchema ? this.addTsIgnore() : ''
    }${this.addExportSchemaObject(this.wrapWithObject({ zodStringFields }))}\n`;
    const objectSchema = `${
      shouldIgnoreSchema ? this.addTsIgnore() : ''
    }${this.addExportObjectSchema(
      this.wrapWithZodObject({ zodStringFields }),
    )}\n`;
    return `${this.getImportsForSchemaObjects()}${schemaObject}\n${objectSchema}`;
  }
  async printSchemaObjects() {
    const zodStringFields = (this.fields ?? [])
      .map((field) => {
        const value = this.getSchemaObjectLine(field);
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
      this.getFinalForm(
        zodStringFields as unknown as string,
        this.name as string,
      ),
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
          `import { ${modelName}WhereUniqueInputSchemaObject } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${findUnique}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereUniqueInputSchemaObject) })`,
            `${modelName}FindUnique`,
          )}`,
        );
      }

      if (findFirst) {
        const imports = [
          `import { ${modelName}WhereInputSchemaObject } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithRelationInputSchemaObject } from './objects/${modelName}OrderByWithRelationInput.schema'`,
          `import { ${modelName}WhereUniqueInputSchemaObject } from './objects/${modelName}WhereUniqueInput.schema'`,
          `import { ${modelName}ScalarFieldEnumSchema } from './enums/${modelName}ScalarFieldEnum.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${findFirst}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereInputSchemaObject), orderBy: z.object(${modelName}OrderByWithRelationInputSchemaObject), cursor: z.object(${modelName}WhereUniqueInputSchemaObject), take: z.number(), skip: z.number(), distinct: z.array(${modelName}ScalarFieldEnumSchema) })`,
            `${modelName}FindFirst`,
          )}`,
        );
      }

      if (findMany) {
        const imports = [
          `import { ${modelName}WhereInputSchemaObject } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithRelationInputSchemaObject } from './objects/${modelName}OrderByWithRelationInput.schema'`,
          `import { ${modelName}WhereUniqueInputSchemaObject } from './objects/${modelName}WhereUniqueInput.schema'`,
          `import { ${modelName}ScalarFieldEnumSchema } from './enums/${modelName}ScalarFieldEnum.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${findMany}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereInputSchemaObject), orderBy: z.object(${modelName}OrderByWithRelationInputSchemaObject), cursor: z.object(${modelName}WhereUniqueInputSchemaObject), take: z.number(), skip: z.number(), distinct: z.array(${modelName}ScalarFieldEnumSchema)  })`,
            `${modelName}FindMany`,
          )}`,
        );
      }

      if (create) {
        const imports = [
          `import { ${modelName}CreateInputSchemaObject } from './objects/${modelName}CreateInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${create}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ data: z.object(${modelName}CreateInputSchemaObject)  })`,
            `${modelName}Create`,
          )}`,
        );
      }

      if (model.delete) {
        const imports = [
          `import { ${modelName}WhereUniqueInputSchemaObject } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(
            Transformer.outputPath,
            `schemas/${model.delete}.schema.ts`,
          ),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereUniqueInputSchemaObject)  })`,
            `${modelName}DeleteOne`,
          )}`,
        );
      }

      if (deleteMany) {
        const imports = [
          `import { ${modelName}WhereInputSchemaObject } from './objects/${modelName}WhereInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${deleteMany}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereInputSchemaObject)  })`,
            `${modelName}DeleteMany`,
          )}`,
        );
      }

      if (update) {
        const imports = [
          `import { ${modelName}UpdateInputSchemaObject } from './objects/${modelName}UpdateInput.schema'`,
          `import { ${modelName}WhereUniqueInputSchemaObject } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${update}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ data: z.object(${modelName}UpdateInputSchemaObject), where: z.object(${modelName}WhereUniqueInputSchemaObject)  })`,
            `${modelName}UpdateOne`,
          )}`,
        );
      }

      if (updateMany) {
        const imports = [
          `import { ${modelName}UpdateManyMutationInputSchemaObject } from './objects/${modelName}UpdateManyMutationInput.schema'`,
          `import { ${modelName}WhereInputSchemaObject } from './objects/${modelName}WhereInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${updateMany}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ data: z.object(${modelName}UpdateManyMutationInputSchemaObject), where: z.object(${modelName}WhereInputSchemaObject)  })`,
            `${modelName}UpdateMany`,
          )}`,
        );
      }

      if (upsert) {
        const imports = [
          `import { ${modelName}WhereUniqueInputSchemaObject } from './objects/${modelName}WhereUniqueInput.schema'`,
          `import { ${modelName}CreateInputSchemaObject } from './objects/${modelName}CreateInput.schema'`,
          `import { ${modelName}UpdateInputSchemaObject } from './objects/${modelName}UpdateInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${upsert}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereUniqueInputSchemaObject), create: z.object(${modelName}CreateInputSchemaObject), update: z.object(${modelName}UpdateInputSchemaObject)  })`,
            `${modelName}Upsert`,
          )}`,
        );
      }

      if (aggregate) {
        const imports = [
          `import { ${modelName}WhereInputSchemaObject } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithRelationInputSchemaObject } from './objects/${modelName}OrderByWithRelationInput.schema'`,
          `import { ${modelName}WhereUniqueInputSchemaObject } from './objects/${modelName}WhereUniqueInput.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${aggregate}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereInputSchemaObject), orderBy: z.object(${modelName}OrderByWithRelationInputSchemaObject), cursor: z.object(${modelName}WhereUniqueInputSchemaObject), take: z.number(), skip: z.number()  })`,
            `${modelName}Aggregate`,
          )}`,
        );
      }

      if (groupBy) {
        const imports = [
          `import { ${modelName}WhereInputSchemaObject } from './objects/${modelName}WhereInput.schema'`,
          `import { ${modelName}OrderByWithAggregationInputSchemaObject } from './objects/${modelName}OrderByWithAggregationInput.schema'`,
          `import { ${modelName}ScalarWhereWithAggregatesInputSchemaObject } from './objects/${modelName}ScalarWhereWithAggregatesInput.schema'`,
          `import { ${modelName}ScalarFieldEnumSchema } from './enums/${modelName}ScalarFieldEnum.schema'`,
        ];
        await writeFileSafely(
          path.join(Transformer.outputPath, `schemas/${groupBy}.schema.ts`),
          `${this.getImportsForSchemas(imports)}${this.addExportSchema(
            `z.object({ where: z.object(${modelName}WhereInputSchemaObject), orderBy: z.object(${modelName}OrderByWithAggregationInputSchemaObject), having: z.object(${modelName}ScalarWhereWithAggregatesInputSchemaObject), take: z.number(), skip: z.number(), by: z.array(${modelName}ScalarFieldEnumSchema)  })`,
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
