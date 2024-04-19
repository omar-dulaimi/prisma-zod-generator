"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMongodbRawOp = exports.addMissingInputObjectTypesForMongoDbRawOpsAndQueries = void 0;
const transformer_1 = __importDefault(require("../transformer"));
function addMissingInputObjectTypesForMongoDbRawOpsAndQueries(modelOperations, outputObjectTypes, inputObjectTypes) {
    const rawOpsMap = resolveMongoDbRawOperations(modelOperations);
    transformer_1.default.rawOpsMap = rawOpsMap !== null && rawOpsMap !== void 0 ? rawOpsMap : {};
    const mongoDbRawQueryInputObjectTypes = resolveMongoDbRawQueryInputObjectTypes(outputObjectTypes);
    for (const mongoDbRawQueryInputType of mongoDbRawQueryInputObjectTypes) {
        inputObjectTypes.push(mongoDbRawQueryInputType);
    }
}
exports.addMissingInputObjectTypesForMongoDbRawOpsAndQueries = addMissingInputObjectTypesForMongoDbRawOpsAndQueries;
function resolveMongoDbRawOperations(modelOperations) {
    const rawOpsMap = {};
    const rawOpsNames = [
        ...new Set(modelOperations.reduce((result, current) => {
            const keys = Object.keys(current);
            keys === null || keys === void 0 ? void 0 : keys.forEach((key) => {
                if (key.includes('Raw')) {
                    result.push(key);
                }
            });
            return result;
        }, [])),
    ];
    const modelNames = modelOperations.map((item) => item.model);
    rawOpsNames.forEach((opName) => {
        modelNames.forEach((modelName) => {
            const isFind = opName === 'findRaw';
            const opWithModel = `${opName.replace('Raw', '')}${modelName}Raw`;
            rawOpsMap[opWithModel] = isFind
                ? `${modelName}FindRawArgs`
                : `${modelName}AggregateRawArgs`;
        });
    });
    return rawOpsMap;
}
function resolveMongoDbRawQueryInputObjectTypes(outputObjectTypes) {
    const mongoDbRawQueries = getMongoDbRawQueries(outputObjectTypes);
    const mongoDbRawQueryInputObjectTypes = mongoDbRawQueries.map((item) => ({
        name: item.name,
        constraints: {
            maxNumFields: null,
            minNumFields: null,
        },
        fields: item.args.map((arg) => ({
            name: arg.name,
            isRequired: arg.isRequired,
            isNullable: arg.isNullable,
            inputTypes: arg.inputTypes,
        })),
    }));
    return mongoDbRawQueryInputObjectTypes;
}
function getMongoDbRawQueries(outputObjectTypes) {
    var _a;
    const queryOutputTypes = outputObjectTypes.filter((item) => item.name === 'Query');
    const mongodbRawQueries = (_a = queryOutputTypes === null || queryOutputTypes === void 0 ? void 0 : queryOutputTypes[0].fields.filter((field) => field.name.includes('Raw'))) !== null && _a !== void 0 ? _a : [];
    return mongodbRawQueries;
}
const isMongodbRawOp = (name) => /find([^]*?)Raw/.test(name) || /aggregate([^]*?)Raw/.test(name);
exports.isMongodbRawOp = isMongodbRawOp;
//# sourceMappingURL=mongodb-helpers.js.map