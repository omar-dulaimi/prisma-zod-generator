import { describe, expect, it } from 'vitest';
import { buildProLicenseMessage, PRO_HELP_MESSAGE } from '../src/cli/pzg-pro-generator';
import { getLicenseStatus } from '../src/license';

/**
 * The Pro generator used to answer every license failure with
 * PRO_HELP_MESSAGE, which tells the reader to run
 * `git submodule update --init --recursive`. That is correct only for an OSS
 * checkout with no private submodule. A paying customer installing from npm
 * whose PZG_LICENSE_KEY is unset or expired has the modules already — they were
 * being told their install was broken and handed a remedy that cannot work,
 * with no mention of PZG_LICENSE_KEY at all.
 *
 * These tests pin the two messages apart. buildProLicenseMessage is pure, so it
 * behaves identically with or without the private `src/pro` submodule (absent
 * in CI and in forks).
 */
describe('Pro license failure messaging', () => {
  it('tells an unlicensed-but-installed user to set PZG_LICENSE_KEY', () => {
    const message = buildProLicenseMessage({
      reason: 'missing_key',
      detail: 'PZG Pro license required. Set PZG_LICENSE_KEY environment variable.',
    });

    expect(message).toContain('PZG_LICENSE_KEY');
    expect(message).toContain('license-check');
    // The remedy that cannot help an npm consumer must not appear here.
    expect(message).not.toContain('git submodule');
    expect(message).not.toContain('not available in this repository');
  });

  it('points an expired license at renewal rather than at installation', () => {
    const message = buildProLicenseMessage({
      reason: 'expired',
      detail: 'License has expired. Please renew your PZG Pro subscription.',
    });

    expect(message).toContain('expired');
    expect(message).toMatch(/renew/i);
    expect(message).not.toContain('git submodule');
  });

  it('does not offer a key-setting remedy when tampering was detected', () => {
    const message = buildProLicenseMessage({
      reason: 'code_tampering_detected',
      detail: 'PZG Pro code tampering detected. Pro features have been modified.',
    });

    expect(message).toContain('tampering');
    expect(message).not.toContain('export PZG_LICENSE_KEY');
  });

  it('still keeps submodule guidance for a genuinely missing Pro install', () => {
    expect(PRO_HELP_MESSAGE).toContain('git submodule update --init --recursive');
  });

  it('reports a machine-readable reason when validation fails', async () => {
    const status = await getLicenseStatus();

    // No license key is configured in CI or in local development, so this
    // should fail — but it must now say *why*, instead of collapsing every
    // cause into a bare { valid: false }. The specific reason differs by
    // environment (a locally built `lib/pro` trips tampering detection), so
    // only assert that a reason is present.
    if (!status.valid) {
      expect(status.reason).toBeTruthy();
    } else {
      expect(status.reason).toBeUndefined();
    }
  });
});
