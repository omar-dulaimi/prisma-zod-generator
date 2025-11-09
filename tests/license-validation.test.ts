import { generateKeyPairSync, sign } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

type LicenseModule = typeof import('../src/license');

let validateLicense: LicenseModule['validateLicense'];
let tempHomeDir: string;
const originalEnv: Record<string, string | undefined> = {
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  PZG_LICENSE_KEY: process.env.PZG_LICENSE_KEY,
  PZG_LICENSE_PUBLIC_KEY: process.env.PZG_LICENSE_PUBLIC_KEY,
};

describe('license validation', () => {
  beforeAll(async () => {
    tempHomeDir = mkdtempSync(join(tmpdir(), 'pzg-license-test-'));
    process.env.HOME = tempHomeDir;
    process.env.USERPROFILE = tempHomeDir;

    ({ validateLicense } = await import('../src/license'));
  });

  afterEach(() => {
    delete process.env.PZG_LICENSE_KEY;
    delete process.env.PZG_LICENSE_PUBLIC_KEY;
    rmSync(join(tempHomeDir, '.cache'), { recursive: true, force: true });
  });

  afterAll(() => {
    if (originalEnv.HOME === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalEnv.HOME;
    }

    if (originalEnv.USERPROFILE === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = originalEnv.USERPROFILE;
    }

    if (originalEnv.PZG_LICENSE_KEY === undefined) {
      delete process.env.PZG_LICENSE_KEY;
    } else {
      process.env.PZG_LICENSE_KEY = originalEnv.PZG_LICENSE_KEY;
    }

    if (originalEnv.PZG_LICENSE_PUBLIC_KEY === undefined) {
      delete process.env.PZG_LICENSE_PUBLIC_KEY;
    } else {
      process.env.PZG_LICENSE_PUBLIC_KEY = originalEnv.PZG_LICENSE_PUBLIC_KEY;
    }

    rmSync(tempHomeDir, { recursive: true, force: true });
  });

  it('accepts licenses whose signatures contain underscores beyond the delimiter', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');

    let encodedData: string | undefined;
    let encodedSignature: string | undefined;
    let payload:
      | {
          plan: 'business';
          validUntil: string;
          maxSeats: number;
          customerId: string;
          issuedAt: string;
        }
      | undefined;

    for (let attempt = 0; attempt < 100 && !encodedSignature; attempt += 1) {
      payload = {
        plan: 'business',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxSeats: 1,
        customerId: `test-${attempt}`,
        issuedAt: new Date(Date.now() - attempt * 1000).toISOString(),
      };

      const dataBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
      const signatureBuffer = sign(null, dataBuffer, privateKey);
      const candidateSig = signatureBuffer.toString('base64url');
      const lastUnderscore = candidateSig.lastIndexOf('_');

      if (lastUnderscore !== -1 && lastUnderscore < candidateSig.length - 1) {
        encodedData = dataBuffer.toString('base64url');
        encodedSignature = candidateSig;
      }
    }

    if (!encodedSignature || !encodedData || !payload) {
      throw new Error('Failed to create a signature containing underscores');
    }

    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    process.env.PZG_LICENSE_PUBLIC_KEY = publicKeyPem;
    process.env.PZG_LICENSE_KEY = `pzg_v2_${encodedData}_${encodedSignature}`;

    const license = await validateLicense(false);

    expect(license).toBeTruthy();
    expect(license?.plan).toBe(payload.plan);
    expect(license?.maxSeats).toBe(payload.maxSeats);
  });
});
