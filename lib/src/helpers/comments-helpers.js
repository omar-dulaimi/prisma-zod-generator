"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hideInputObjectTypesAndRelatedFields = exports.resolveModelsComments = void 0;
const modelAttributeRegex = /(@@Gen\.)+([A-z])+(\()+(.+)+(\))+/;
const attributeNameRegex = /(?:\.)+([A-Za-z])+(?:\()+/;
const attributeArgsRegex = /(?:\()+([A-Za-z])+\:+(.+)+(?:\))+/;
function resolveModelsComments(models, modelOperations, enumTypes, hiddenModels, hiddenFields) {
    models = collectHiddenModels(models, hiddenModels);
    collectHiddenFields(models, hiddenModels, hiddenFields);
    hideModelOperations(models, modelOperations);
    hideEnums(enumTypes, hiddenModels);
}
exports.resolveModelsComments = resolveModelsComments;
function collectHiddenModels(models, hiddenModels) {
    return models
        .map((model) => {
        var _a, _b, _c, _d, _e, _f;
        if (model.documentation) {
            const attribute = (_b = (_a = model.documentation) === null || _a === void 0 ? void 0 : _a.match(modelAttributeRegex)) === null || _b === void 0 ? void 0 : _b[0];
            const attributeName = (_d = (_c = attribute === null || attribute === void 0 ? void 0 : attribute.match(attributeNameRegex)) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.slice(1, -1);
            if (attributeName !== 'model')
                model;
            const rawAttributeArgs = (_f = (_e = attribute === null || attribute === void 0 ? void 0 : attribute.match(attributeArgsRegex)) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.slice(1, -1);
            const parsedAttributeArgs = {};
            if (rawAttributeArgs) {
                const rawAttributeArgsParts = rawAttributeArgs
                    .split(':')
                    .map((it) => it.trim())
                    .map((part) => (part.startsWith('[') ? part : part.split(',')))
                    .flat()
                    .map((it) => it.trim());
                for (let i = 0; i < rawAttributeArgsParts.length; i += 2) {
                    const key = rawAttributeArgsParts[i];
                    const value = rawAttributeArgsParts[i + 1];
                    parsedAttributeArgs[key] = JSON.parse(value);
                }
            }
            if (parsedAttributeArgs.hide) {
                hiddenModels.push(model.name);
                return null;
            }
        }
        return model;
    })
        .filter(Boolean);
}
function collectHiddenFields(models, hiddenModels, hiddenFields) {
    models.forEach((model) => {
        model.fields.forEach((field) => {
            if (hiddenModels.includes(field.type)) {
                hiddenFields.push(field.name);
                if (field.relationFromFields) {
                    field.relationFromFields.forEach((item) => hiddenFields.push(item));
                }
            }
        });
    });
}
function hideEnums(enumTypes, hiddenModels) {
    enumTypes.prisma = enumTypes.prisma.filter((item) => !hiddenModels.find((model) => item.name.startsWith(model)));
}
function hideModelOperations(models, modelOperations) {
    let i = modelOperations.length;
    while (i >= 0) {
        --i;
        const modelOperation = modelOperations[i];
        if (modelOperation &&
            !models.find((model) => {
                return model.name === modelOperation.model;
            })) {
            modelOperations.splice(i, 1);
        }
    }
}
function hideInputObjectTypesAndRelatedFields(inputObjectTypes, hiddenModels, hiddenFields) {
    var _a, _b, _c, _d;
    let j = inputObjectTypes.length;
    while (j >= 0) {
        --j;
        const inputType = inputObjectTypes[j];
        if (inputType &&
            (hiddenModels.includes((_a = inputType === null || inputType === void 0 ? void 0 : inputType.meta) === null || _a === void 0 ? void 0 : _a.source) ||
                hiddenModels.find((model) => inputType.name.startsWith(model)))) {
            inputObjectTypes.splice(j, 1);
        }
        else {
            let k = (_c = (_b = inputType === null || inputType === void 0 ? void 0 : inputType.fields) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0;
            while (k >= 0) {
                --k;
                const field = (_d = inputType === null || inputType === void 0 ? void 0 : inputType.fields) === null || _d === void 0 ? void 0 : _d[k];
                if (field && hiddenFields.includes(field.name)) {
                    inputObjectTypes[j].fields.splice(k, 1);
                }
            }
        }
    }
}
exports.hideInputObjectTypesAndRelatedFields = hideInputObjectTypesAndRelatedFields;
//# sourceMappingURL=comments-helpers.js.map