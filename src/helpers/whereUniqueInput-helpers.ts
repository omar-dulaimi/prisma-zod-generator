import { DMMF } from '@prisma/generator-helper';

export function changeOptionalToRequiredFields(inputObjectTypes: DMMF.InputType[]) {
  inputObjectTypes.map((item) => {
    if (item.name.includes('WhereUniqueInput') && (item.constraints.fields?.length ?? 0) > 0) {
      const uniqueFields = item.constraints.fields ?? [];

      // Keep original optionality; do NOT force unique fields required.
      // Restrict WhereUniqueInput to ONLY the unique identifier fields.
      // This avoids leaking WhereInput-style fields (AND/OR/NOT, filters) into WhereUniqueInput.
      //
      // Prisma emits one selector per unique constraint, so two constraints over the same
      // ordered field list arrive here as two DMMF fields with the same name. A model with
      // `@@id([a, b])` and `@@unique([a, b])` gives `constraints.fields = ['a_b', 'a_b']` and
      // two `a_b` entries. Emitting both wrote the key twice into one `z.object({ ... })`
      // literal, and TypeScript rejects that outright (TS1117, "An object literal cannot have
      // multiple properties with the same name"), so the whole generated tree stopped
      // compiling for anyone with such a model.
      //
      // Keeping the first occurrence is safe because the collided entries can never
      // legitimately differ. A selector is named `name ?? fields.join('_')` and its type is
      // `<Model><Pascal(name ?? fields)>CompoundUniqueInput`, both derived from that same
      // pair, so equal names force equal types; and the only way to reach an equal name is
      // for both constraints to omit `name` and list the same fields in the same order,
      // because Prisma rejects a repeated explicit `name` before generation ("The given
      // custom name `x` has to be unique on the model", P1012). Distinct selectors over the
      // same columns (an explicitly named `@@id`, or the reversed order) keep distinct
      // names, so both survive. See tests/compound-unique-key-collision.test.ts.
      const seen = new Set<string>();
      const updatedFields = (item.fields as DMMF.SchemaArg[]).filter((subItem) => {
        if (!uniqueFields.includes(subItem.name)) return false;
        if (seen.has(subItem.name)) return false;
        seen.add(subItem.name);
        return true;
      });

      (item as DMMF.InputType & { fields: DMMF.SchemaArg[] }).fields = updatedFields;
    }
    return item;
  });
}
