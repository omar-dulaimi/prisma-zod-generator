"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFileSafely = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const formatFile_1 = require("./formatFile");
const writeIndexFile_1 = require("./writeIndexFile");
const writeFileSafely = async (writeLocation, content, addToIndex = true) => {
    await promises_1.default.mkdir(path_1.default.dirname(writeLocation), {
        recursive: true,
    });
    await promises_1.default.writeFile(writeLocation, await (0, formatFile_1.formatFile)(content));
    if (addToIndex) {
        await (0, writeIndexFile_1.addIndexExport)(writeLocation);
    }
    return true;
};
exports.writeFileSafely = writeFileSafely;
//# sourceMappingURL=writeFileSafely.js.map