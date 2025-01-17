import { DMMF } from '@prisma/generator-helper';
import { MutableDeep } from '../types';

export function changeOptionalToRequiredFields(
  inputObjectTypes: MutableDeep<DMMF.InputType>[],
) {
  inputObjectTypes.map((item) => {
    if (
      item.name.includes('WhereUniqueInput') &&
      item.constraints.fields?.length! > 0
    ) {
      item.fields = item.fields.map((subItem) => {
        if (item.constraints.fields?.includes(subItem.name)) {
          subItem.isRequired = true;
          return subItem;
        }
        return subItem;
      });
    }
    return item;
  });
}
