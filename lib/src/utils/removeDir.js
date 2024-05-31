"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
async function removeDir(dirPath, onlyContent) {
    const dirEntries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
    await Promise.all(dirEntries.map(async (dirEntry) => {
        const fullPath = path_1.default.join(dirPath, dirEntry.name);
        return dirEntry.isDirectory()
            ? await removeDir(fullPath, false)
            : await fs_1.promises.unlink(fullPath);
    }));
    if (!onlyContent) {
        await fs_1.promises.rmdir(dirPath);
    }
}
exports.default = removeDir;
//# sourceMappingURL=removeDir.js.map