import { toPascalCase } from "./pascal-case";

export function formatFindManyName(operationName: string) {
    const prefix = 'findMany';
    if (operationName.startsWith(prefix)) {
        const modelName = operationName.slice(prefix.length);
        return `${prefix}${toPascalCase(modelName)}`; // Ensures modelName starts with an uppercase letter
    }
    return operationName;
}