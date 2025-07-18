import { DMMF } from '@prisma/generator-helper';

export function changeOptionalToRequiredFields(
  inputObjectTypes: DMMF.InputType[],
) {
  inputObjectTypes.map((item) => {
    if (
      item.name.includes('WhereUniqueInput') &&
      (item.constraints.fields?.length ?? 0) > 0
    ) {
      (item as any).fields = item.fields.map((subItem) => {
        if (item.constraints.fields?.includes(subItem.name)) {
          return { ...subItem, isRequired: true };
        }
        return subItem;
      });
    }
    return item;
  });
}
