import { DMMF } from '@prisma/generator-helper';

export function changeOptionalToRequiredFields(
  inputObjectTypes: ReadonlyArray<DMMF.InputType>,
): DMMF.InputType[] {
  return inputObjectTypes.map((item) => {
    if (
      item.name.includes('WhereUniqueInput') &&
      item.constraints.fields?.length! > 0
    ) {
      const newFields = item.fields.map((subItem) => {
        if (item.constraints.fields?.includes(subItem.name)) {
          return { ...subItem, isRequired: true }; // Create a new object with the updated field
        }
        return subItem;
      });
      return { ...item, fields: newFields }; // Return a new item with updated fields
    }
    return item;
  });
}
