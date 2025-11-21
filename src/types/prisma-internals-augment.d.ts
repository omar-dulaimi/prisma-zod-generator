import '@prisma/internals';
import type {
  ConfigMetaFormat,
  GetConfigOptions as PrismaGetConfigOptions,
} from '@prisma/internals/dist/engine-commands/getConfig';

declare module '@prisma/internals' {
  type LegacyGetConfigOptions = PrismaGetConfigOptions & {
    /**
     * Older Prisma internals accepted this flag; keep it optional so Pro code compiled against
     * Prisma 6 still type-checks when building with Prisma 7 typings.
     */
    ignoreEnvVarErrors?: boolean;
  };

  export function getConfig(options: LegacyGetConfigOptions): Promise<ConfigMetaFormat>;
}
