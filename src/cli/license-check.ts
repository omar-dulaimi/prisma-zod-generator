#!/usr/bin/env node

/**
 * PZG Pro License Status CLI
 * Usage: npx prisma-zod-generator license-check
 */

import { describePlan, getLicenseStatus, validateLicense } from '../license';

export async function runLicenseCheck(_args: string[] = []): Promise<void> {
  console.log('🔍 Checking PZG Pro license...\n');

  const status = await getLicenseStatus();

  if (!status.valid) {
    console.log('❌ No valid license found');
    console.log('\nTo get started with PZG Pro:');
    console.log('1. Get your license: https://omar-dulaimi.github.io/prisma-zod-generator/pricing');
    console.log('2. Set environment variable: export PZG_LICENSE_KEY=your_key_here');
    console.log('3. Run this command again to verify');
    process.exit(1);
  }

  console.log('✅ Valid PZG Pro license found');
  let licenseDetails: Awaited<ReturnType<typeof validateLicense>> | null = null;
  try {
    licenseDetails = await validateLicense(false);
  } catch {
    // ignore, fallback to status info
  }

  const plan = licenseDetails?.plan ?? status.plan;
  if (plan) {
    console.log(`📋 Plan: ${describePlan(plan)} (${plan})`);
  }

  if (licenseDetails?.maxSeats !== undefined) {
    console.log(`👥 Max Seats: ${licenseDetails.maxSeats}`);
  }

  if (licenseDetails?.validUntil) {
    console.log(`📅 Valid Until: ${licenseDetails.validUntil}`);
  }

  const cachedFlag = licenseDetails?.cached ?? status.cached;
  if (cachedFlag) {
    console.log('💾 Using cached license (verified within 30 days)');
  } else {
    console.log('🌐 License verified with server');
  }

  console.log('\n🚀 Ready to use PZG Pro features!');
  console.log('📚 Docs: https://omar-dulaimi.github.io/prisma-zod-generator/docs');
  console.log('💬 Support: https://github.com/omar-dulaimi/prisma-zod-generator/issues');
}

if (require.main === module) {
  runLicenseCheck().catch((error) => {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
