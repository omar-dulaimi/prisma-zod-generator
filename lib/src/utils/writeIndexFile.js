"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeIndexFile = exports.addIndexExport = void 0;
const path_1 = __importDefault(require("path"));
const writeFileSafely_1 = require("./writeFileSafely");
const indexExports = new Set();
const addIndexExport = (filePath) => {
    indexExports.add(filePath);
};
exports.addIndexExport = addIndexExport;
function normalizePath(path) {
    if (typeof path !== 'string') {
        throw new TypeError('Expected argument path to be a string');
    }
    if (path === '\\' || path === '/')
        return '/';
    let len = path.length;
    if (len <= 1)
        return path;
    let prefix = '';
    if (len > 4 && path[3] === '\\') {
        let ch = path[2];
        if ((ch === '?' || ch === '.') && path.slice(0, 2) === '\\\\') {
            path = path.slice(2);
            prefix = '//';
        }
    }
    let segs = path.split(/[/\\]+/);
    return prefix + segs.join('/');
}
;
const writeIndexFile = async (indexPath) => {
    const rows = Array.from(indexExports).map((filePath) => {
        let relativePath = path_1.default.relative(path_1.default.dirname(indexPath), filePath);
        if (relativePath.endsWith('.ts')) {
            relativePath = relativePath.slice(0, relativePath.lastIndexOf('.ts'));
        }
        const normalized = normalizePath(relativePath);
        return `export * from './${normalized}'`;
    });
    const content = rows.join('\n');
    await (0, writeFileSafely_1.writeFileSafely)(indexPath, content, false);
};
exports.writeIndexFile = writeIndexFile;
//# sourceMappingURL=writeIndexFile.js.map