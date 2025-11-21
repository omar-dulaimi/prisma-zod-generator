import '@prisma/internals';

declare module '@prisma/internals' {
  interface GetConfigOptions {
    /**
     * Older Prisma internals accepted this flag; keep it optional so Pro code compiled against
     * Prisma 6 still type-checks when building with Prisma 7 typings.
     */
    ignoreEnvVarErrors?: boolean;
  }
}
