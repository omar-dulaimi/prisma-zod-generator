import { DMMF } from '@prisma/generator-helper';

export function changeOptionalToRequiredFields(inputObjectTypes: DMMF.InputType[]) {
  inputObjectTypes.map((item) => {
    if (item.name.includes('WhereUniqueInput') && (item.constraints.fields?.length ?? 0) > 0) {
      const uniqueFields = item.constraints.fields ?? [];
      // First, mark unique fields as required
      let updatedFields = item.fields.map((subItem) => {
        if (uniqueFields.includes(subItem.name)) {
          return { ...subItem, isRequired: true };
        }
        return subItem;
      });

      // Then, restrict WhereUniqueInput to ONLY the unique identifier fields
      // This avoids leaking WhereInput-style fields (AND/OR/NOT, filters) into WhereUniqueInput
      updatedFields = updatedFields.filter((subItem) => uniqueFields.includes(subItem.name));

      (item as DMMF.InputType & { fields: DMMF.SchemaArg[] }).fields = updatedFields;
    }
    return item;
  });
}
