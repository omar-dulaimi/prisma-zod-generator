#! /usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  if (command === 'license-check') {
    const { runLicenseCheck } = await import('./cli/license-check');
    await runLicenseCheck(args.slice(1));
    return;
  }

  if (command === '--help' || command === '-h') {
    printCliHelp();
    return;
  }

  await import('./index');
}

main().catch((error) => {
  console.error('❌ Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});

function printCliHelp(): void {
  console.log(
    [
      'Prisma Zod Generator CLI',
      '',
      'Commands:',
      '  license-check        Validate your PZG Pro license',
      '',
      'Examples:',
      '  npx prisma-zod-generator license-check',
      '',
      'As a Prisma generator, include in schema.prisma:',
      '  generator zod {',
      '    provider = "prisma-zod-generator"',
      '  }',
    ].join('\n'),
  );
}
