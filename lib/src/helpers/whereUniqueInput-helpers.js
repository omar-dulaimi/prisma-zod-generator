"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeOptionalToRequiredFields = void 0;
function changeOptionalToRequiredFields(inputObjectTypes) {
    return inputObjectTypes.map((item) => {
        var _a;
        if (item.name.includes('WhereUniqueInput') &&
            ((_a = item.constraints.fields) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            const newFields = item.fields.map((subItem) => {
                var _a;
                if ((_a = item.constraints.fields) === null || _a === void 0 ? void 0 : _a.includes(subItem.name)) {
                    return { ...subItem, isRequired: true }; // Create a new object with the updated field
                }
                return subItem;
            });
            return { ...item, fields: newFields }; // Return a new item with updated fields
        }
        return item;
    });
}
exports.changeOptionalToRequiredFields = changeOptionalToRequiredFields;
//# sourceMappingURL=whereUniqueInput-helpers.js.map