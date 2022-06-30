import { DMMF as PrismaDMMF } from '@prisma/client/runtime';
import path from 'path';
import { writeFileSafely } from './utils/writeFileSafely';

export default class Transformer {
  name: string;
  fields: PrismaDMMF.SchemaArg[];
  schemaImports = new Set<string>();
  modelOperations: PrismaDMMF.ModelMapping[];
  enumTypes: PrismaDMMF.SchemaEnum[];
  static enumNames: string[] = [];
  private static outputPath: string = './generated';

  constructor(params: TransformerParams) {
    this.name = params.name ?? '';
    this.fields = params.fields ?? [];
    this.modelOperations = params.modelOperations ?? [];
    this.enumTypes = params.enumTypes ?? [];
  }

  static setOutputPath(outPath: string) {
    this.outputPath = outPath;
  }

  static getOutputPath() {
    return this.outputPath;
  }

  addSchemaImport(name: string) {
    this.schemaImports.add(name);
  }

  getAllSchemaImports() {
    return [...this.schemaImports]
      .map((name) =>
        Transformer.enumNames.includes(name)
          ? `import { ${name}Schema } from '../enums/${name}.schema';`
          : `import { ${name}ObjectSchema } from './${name}.schema';`,
      )
      .join(';\r\n');
  }

  getPrismaStringLine(
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArgInputType,
    inputsLength: number,
  ) {
    const isEnum = inputType.location === 'enumTypes';

    let objectSchemaLine = `${inputType.type}ObjectSchema`;
    let enumSchemaLine = `${inputType.type}Schema`;

    const schema =
      inputType.type === this.name
        ? objectSchemaLine
        : isEnum
        ? enumSchemaLine
        : objectSchemaLine;

    const arr = inputType.isList ? '.array()' : '';
    // is field optional - if yes, add .optional() to schema
    const opt = !field.isRequired ? '.optional()' : '';

    return inputsLength === 1
      ? `  ${field.name}: z.lazy(() => ${schema})${arr}${opt}`
      : `z.lazy(() => ${schema})${arr}${opt}`;
  }

  wrapWithZodValidators(
    mainValidator: string,
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArgInputType,
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

  getObjectSchemaLine(
    field: PrismaDMMF.SchemaArg,
  ): [string, PrismaDMMF.SchemaArg, boolean][] {
    let lines = field.inputTypes;

    if (lines.length === 0) {
      return [];
    }

    let alternatives = lines.reduce<string[]>((result, inputType) => {
      if (inputType.type === 'String') {
        result.push(this.wrapWithZodValidators('z.string()', field, inputType));
      } else if (inputType.type === 'Int' || inputType.type === 'Float') {
        result.push(this.wrapWithZodValidators('z.number()', field, inputType));
      } else if (inputType.type === 'Boolean') {
        result.push(
          this.wrapWithZodValidators('z.boolean()', field, inputType),
        );
      } else if (inputType.type === 'DateTime') {
        result.push(this.wrapWithZodValidators('z.date()', field, inputType));
      } else {
        const isEnum = inputType.location === 'enumTypes';

        if (inputType.namespace === 'prisma' || isEnum) {
          if (
            inputType.type !== this.name &&
            typeof inputType.type === 'string'
          ) {
            this.addSchemaImport(inputType.type);
          }

          result.push(this.getPrismaStringLine(field, inputType, lines.length));
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

  getFieldValidators(
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

  getImportsForSchemas(additionalImports: string[]) {
    let imports = this.getImportZod();
    imports += [...additionalImports].join(';\r\n');
    imports += '\n\n';
    return imports;
  }

  addExportObjectSchema(schema: string) {
    const end = `export const ${this.name}ObjectSchema = Schema`;
    return `const Schema: z.ZodType<Prisma.${this.name}> = ${schema};\n\n ${end}`;
  }

  addExportSchema(schema: string, name: string) {
    return `export const ${name}Schema = ${schema}`;
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

  wrapWithZodOUnion(zodStringFields: string[]) {
    let wrapped = '';

    wrapped += 'z.union([';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields.join(',');
    wrapped += '\n';
    wrapped += '])';
    return wrapped;
  }

  addFinalWrappers({ zodStringFields }: { zodStringFields: string[] }) {
    const fields = [...zodStringFields];

    const shouldWrapWithUnion = fields.some(
      (field) =>
        // TODO handle other cases if any
        // field.includes('create:') ||
        field.includes('connectOrCreate:') || field.includes('connect:'),
    );

    if (!shouldWrapWithUnion) {
      return this.wrapWithZodObject(fields) + '.strict()';
    }

    const wrapped = fields.map((field) => this.wrapWithZodObject(field));

    return this.wrapWithZodOUnion(wrapped);
  }

  getFinalForm(zodStringFields: string[]) {
    const objectSchema = `${this.addExportObjectSchema(
      this.addFinalWrappers({ zodStringFields }),
    )}\n`;

    const prismaImport = `import type { Prisma } from '@prisma/client';\n\n`;

    return `${this.getImportsForObjectSchemas()}${prismaImport}${objectSchema}`;
  }

  async printObjectSchemas() {
    const zodStringFields = this.fields
      // array with items or array without, so no need to filter out and loose types
      .map((field) => this.getObjectSchemaLine(field))
      .flatMap((item) => item)
      .map((item) => {
        const [zodStringWithMainType, field, skipValidators] = item;

        const value = skipValidators
          ? zodStringWithMainType
          : this.getFieldValidators(zodStringWithMainType, field);

        return value.trim();
      });

    await writeFileSafely(
      path.join(
        Transformer.outputPath,
        `schemas/objects/${this.name}.schema.ts`,
      ),

      this.getFinalForm(zodStringFields),
    );
  }

  async printModelSchemas() {
    for (const model of this.modelOperations) {
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
    for (const enumType of this.enumTypes) {
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

type TransformerParams = {
  enumTypes?: PrismaDMMF.SchemaEnum[];
  fields?: PrismaDMMF.SchemaArg[];
  name?: string;
  modelOperations?: PrismaDMMF.ModelMapping[];
};
