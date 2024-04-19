"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFile = void 0;
const prettier_1 = __importDefault(require("prettier"));
const formatFile = (content) => {
    return new Promise((res, rej) => prettier_1.default.resolveConfig(process.cwd()).then((options) => {
        let formatOptions = options;
        if (!options) {
            formatOptions = {
                trailingComma: 'all',
                tabWidth: 2,
                printWidth: 80,
                bracketSpacing: true,
                semi: true,
                singleQuote: true,
                useTabs: false,
            };
        }
        try {
            const formatted = prettier_1.default.format(content, {
                ...formatOptions,
                parser: 'typescript',
            });
            res(formatted);
        }
        catch (error) {
            rej(error);
        }
    }));
};
exports.formatFile = formatFile;
//# sourceMappingURL=formatFile.js.map