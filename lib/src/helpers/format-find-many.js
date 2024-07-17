"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFindManyName = formatFindManyName;
const pascal_case_1 = require("./pascal-case");
function formatFindManyName(operationName) {
    const prefix = 'findMany';
    if (operationName.startsWith(prefix)) {
        const modelName = operationName.slice(prefix.length);
        return `${prefix}${(0, pascal_case_1.toPascalCase)(modelName)}`; // Ensures modelName starts with an uppercase letter
    }
    return operationName;
}
//# sourceMappingURL=format-find-many.js.map