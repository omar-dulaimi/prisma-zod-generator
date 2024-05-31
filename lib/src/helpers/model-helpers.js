"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findModelByName = exports.checkIsManyModelRelationField = exports.checkIsModelRelationField = exports.checkModelHasManyModelRelation = exports.checkModelHasModelRelation = void 0;
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
exports.checkModelHasModelRelation = checkModelHasModelRelation;
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
exports.checkModelHasManyModelRelation = checkModelHasManyModelRelation;
function checkIsModelRelationField(modelField) {
    const { kind, relationName } = modelField;
    return kind === 'object' && !!relationName;
}
exports.checkIsModelRelationField = checkIsModelRelationField;
function checkIsManyModelRelationField(modelField) {
    return checkIsModelRelationField(modelField) && modelField.isList;
}
exports.checkIsManyModelRelationField = checkIsManyModelRelationField;
function findModelByName(models, modelName) {
    return models.find(({ name }) => name === modelName);
}
exports.findModelByName = findModelByName;
//# sourceMappingURL=model-helpers.js.map