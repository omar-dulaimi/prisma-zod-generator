/**
 * Per-field copies of Prisma's shared `<Type>FieldUpdateOperationsInput`.
 *
 * An update offers two ways to write the same column:
 *
 *     data: { label: 'nope' }
 *     data: { label: { set: 'nope' } }
 *
 * and the emitted property line is a union of the two:
 *
 *     z.union([Typed, z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)])
 *
 * `StringFieldUpdateOperationsInput` is shared by every String column in the schema, so
 * it cannot carry one column's annotation. Left as it is, the second arm accepts what
 * the first one rejects and the annotation constrains nothing.
 *
 * The fix is a copy of the shared input per annotated column - `Post.label` gets
 * `PostLabelFieldUpdateOperationsInput` - with the reference rewritten to point at it.
 * Every unannotated column keeps pointing at the shared input, which itself is never
 * touched.
 *
 * This module only plans. It rewrites the DMMF the emitters read and hands back a
 * lookup; the schemas themselves are emitted by the ordinary object-schema path, so a
 * copy is byte-identical to the shared input apart from the members that carry values.
 */

import type { DMMF } from '@prisma/generator-helper';
import type { ResolvedTypedJsonConfig } from '../config/typed-json';
import {
  isSharedFieldUpdateOperationsInput,
  resolveTypedJsonOwnerModel,
  typedFieldUpdateOperationsName,
  warnOnce,
} from '../typed-json/emission';
import { resolveTypedJsonField } from '../typed-json/resolver';

/** The model column a copy's value members take their annotation from. */
export interface TypedFieldUpdateOperationsTarget {
  modelName: string;
  field: DMMF.Field;
}

interface VariantRecord extends TypedFieldUpdateOperationsTarget {
  /** The shared input this was copied from, which is also its Prisma type. */
  sharedName: string;
}

/**
 * What the emitters need to know about the copies: which schema names are copies, what
 * column each one belongs to, and which Prisma type it still binds to.
 */
export class TypedFieldUpdateOperationsPlan {
  private readonly variants: ReadonlyMap<string, VariantRecord>;

  constructor(variants: ReadonlyMap<string, VariantRecord> = new Map()) {
    this.variants = variants;
  }

  get size(): number {
    return this.variants.size;
  }

  /**
   * The column a member of `schemaName` takes its annotation from, or null when
   * `schemaName` is not a copy or the member is not one that holds a value.
   *
   * `set` is the only member of an update-operations input that holds a value of the
   * column. `increment` and its siblings are arithmetic on whatever is already stored,
   * so an annotation has no business narrowing them: an Int column typed `1 | 2` is
   * still incremented by 5.
   */
  targetFor(schemaName: string, memberName: string): TypedFieldUpdateOperationsTarget | null {
    if (memberName !== 'set') return null;
    const record = this.variants.get(schemaName);
    return record ? { modelName: record.modelName, field: record.field } : null;
  }

  /** The model a copy belongs to, for resolving the imports its file needs. */
  ownerOf(schemaName: string): string | null {
    return this.variants.get(schemaName)?.modelName ?? null;
  }

  /**
   * The Prisma type a copy binds to.
   *
   * There is no `Prisma.PostLabelFieldUpdateOperationsInput`; the copy is structurally
   * the shared input and binds to that, so the emitted file still typechecks against the
   * client.
   */
  prismaTypeNameFor(schemaName: string): string | null {
    return this.variants.get(schemaName)?.sharedName ?? null;
  }
}

export const EMPTY_TYPED_FIELD_UPDATE_OPERATIONS_PLAN = new TypedFieldUpdateOperationsPlan();

export interface PlanTypedFieldUpdateOperationsArgs {
  inputObjectTypes: DMMF.InputType[];
  models: DMMF.Model[];
  config: ResolvedTypedJsonConfig | null | undefined;
  /**
   * The model an input-object schema's members refer to, as the emitters read it.
   * Injected rather than imported so this module stays free of the transformer.
   */
  extractModelName: (schemaName: string) => string | null;
}

export interface PlanTypedFieldUpdateOperationsResult {
  /** The input types to emit: the originals, with references rewritten, plus the copies. */
  inputObjectTypes: DMMF.InputType[];
  plan: TypedFieldUpdateOperationsPlan;
}

/**
 * Plan the copies and rewrite the references to them.
 *
 * With no `typedJson` block this returns the input untouched and an empty plan, so
 * nothing downstream behaves differently and the output is byte-identical.
 */
export function planTypedFieldUpdateOperations(
  args: PlanTypedFieldUpdateOperationsArgs,
): PlanTypedFieldUpdateOperationsResult {
  const { inputObjectTypes, models, config, extractModelName } = args;

  if (!config) {
    return { inputObjectTypes, plan: EMPTY_TYPED_FIELD_UPDATE_OPERATIONS_PLAN };
  }

  const modelsByName = new Map(models.map((model) => [model.name, model]));
  const isKnownModel = (name: string) => modelsByName.has(name);

  const annotatedColumns = collectAnnotatedColumns(models, config);
  if (annotatedColumns.size === 0) {
    return { inputObjectTypes, plan: EMPTY_TYPED_FIELD_UPDATE_OPERATIONS_PLAN };
  }

  const takenNames = new Set(inputObjectTypes.map((inputType) => inputType.name));
  const variants = new Map<string, VariantRecord>();
  /** Names this run refused to use, so the warning is decided once per name. */
  const refused = new Set<string>();

  const rewritten = inputObjectTypes.map((inputType) => {
    const owner = resolveTypedJsonOwnerModel(extractModelName(inputType.name), isKnownModel);
    if (!owner) return inputType;

    let changed = false;
    const fields = inputType.fields.map((field) => {
      const column = annotatedColumns.get(`${owner}.${field.name}`);
      if (!column) return field;

      const sharedIndex = field.inputTypes.findIndex(
        (candidate) =>
          candidate.location === 'inputObjectTypes' &&
          isSharedFieldUpdateOperationsInput(candidate.type),
      );
      if (sharedIndex < 0) return field;

      const sharedName = String(field.inputTypes[sharedIndex].type);
      const variantName = typedFieldUpdateOperationsName(owner, field.name);

      const existing = variants.get(variantName);
      if (existing) {
        if (existing.modelName !== owner || existing.field.name !== field.name) {
          refuse(variantName, owner, field.name, refused);
          return field;
        }
      } else {
        if (takenNames.has(variantName)) {
          refuse(variantName, owner, field.name, refused);
          return field;
        }
        variants.set(variantName, { modelName: owner, field: column, sharedName });
        takenNames.add(variantName);
      }

      changed = true;
      const inputTypes = [...field.inputTypes];
      inputTypes[sharedIndex] = { ...inputTypes[sharedIndex], type: variantName };
      return { ...field, inputTypes };
    });

    return changed ? { ...inputType, fields } : inputType;
  });

  if (variants.size === 0) {
    return { inputObjectTypes, plan: EMPTY_TYPED_FIELD_UPDATE_OPERATIONS_PLAN };
  }

  const byName = new Map(inputObjectTypes.map((inputType) => [inputType.name, inputType]));
  const copies: DMMF.InputType[] = [];
  for (const [variantName, record] of variants) {
    const shared = byName.get(record.sharedName);
    // Unreachable in practice: the name came off a reference in this same array.
    if (!shared) continue;
    copies.push({ ...shared, name: variantName });
  }

  return {
    inputObjectTypes: [...rewritten, ...copies],
    plan: new TypedFieldUpdateOperationsPlan(variants),
  };
}

function refuse(
  variantName: string,
  modelName: string,
  fieldName: string,
  refused: Set<string>,
): void {
  if (refused.has(variantName)) return;
  refused.add(variantName);
  warnOnce(
    `${modelName}.${fieldName}: cannot give this column its own update-operations schema ` +
      `because the name ${variantName} is already taken. Its { set: ... } form keeps the ` +
      `shared schema, so the annotation is not enforced there. Rename the column or the model.`,
  );
}

/**
 * The columns whose annotation actually resolves, keyed `Model.field`.
 *
 * An annotation that cannot be converted leaves the value arm on its default schema, so
 * a copy would be identical to the shared input and only add a file.
 */
function collectAnnotatedColumns(
  models: DMMF.Model[],
  config: ResolvedTypedJsonConfig,
): Map<string, DMMF.Field> {
  const columns = new Map<string, DMMF.Field>();

  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind !== 'scalar' || field.isList || !field.documentation) continue;

      const result = resolveTypedJsonField(
        {
          modelName: model.name,
          fieldName: field.name,
          documentation: field.documentation,
          isList: false,
        },
        config,
      );
      // Diagnostics are reported by the emitters, which see every use of the field.
      if (result.status === 'resolved') columns.set(`${model.name}.${field.name}`, field);
    }
  }

  return columns;
}
