import { getNodePackagesInstalledVersion } from 'node-packages-installed-version';

const getPrismaVersion = (): number => {
  const { version } = getNodePackagesInstalledVersion('prisma');
  return version.major;
};

const PRISMA_VERSION: number = getPrismaVersion();

export { PRISMA_VERSION as default };
