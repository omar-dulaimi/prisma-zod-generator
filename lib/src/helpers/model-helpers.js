"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkModelHasModelRelation = checkModelHasModelRelation;
exports.checkModelHasManyModelRelation = checkModelHasManyModelRelation;
exports.checkIsModelRelationField = checkIsModelRelationField;
exports.checkIsManyModelRelationField = checkIsManyModelRelationField;
exports.findModelByName = findModelByName;
function checkModelHasModelRelation(model) {
    const { fields: modelFields } = model;
    for (const modelField of modelFields) {
        const isRelationField = checkIsModelRelationField(modelField);
        if (isRelationField) {
            return true;
        }
    }
    return false;
}
function checkModelHasManyModelRelation(model) {
    const { fields: modelFields } = model;
    for (const modelField of modelFields) {
        const isManyRelationField = checkIsManyModelRelationField(modelField);
        if (isManyRelationField) {
            return true;
        }
    }
    return false;
}
function checkIsModelRelationField(modelField) {
    const { kind, relationName } = modelField;
    return kind === 'object' && !!relationName;
}
function checkIsManyModelRelationField(modelField) {
    return checkIsModelRelationField(modelField) && modelField.isList;
}
function findModelByName(models, modelName) {
    return models.find(({ name }) => name === modelName);
}
//# sourceMappingURL=model-helpers.js.map