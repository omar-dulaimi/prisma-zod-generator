import { describe, it, expect } from 'vitest';
import {
  resolveEnumNaming,
  generateFileName,
  generateExportName,
} from '../src/utils/naming-resolver';

describe('Debug Issue #304', () => {
  it('should debug enum naming resolution', () => {
    const config = {
      naming: {
        enum: {
          filePattern: '{kebab}.ts',
          exportNamePattern: 'Zod{Enum}',
        },
      },
    };

    const enumNaming = resolveEnumNaming(config);
    console.log('Enum naming config:', enumNaming);

    const enumName = 'LoremDolarEnum';
    const fileName = generateFileName(
      enumNaming.filePattern,
      enumName,
      undefined,
      undefined,
      enumName,
    );
    console.log('Generated file name:', fileName);

    const exportName = generateExportName(
      enumNaming.exportNamePattern,
      enumName,
      undefined,
      undefined,
      enumName,
    );
    console.log('Generated export name:', exportName);

    expect(fileName).toBe('lorem-dolar-enum.ts');
    expect(exportName).toBe('ZodLoremDolarEnum');
  });
});
