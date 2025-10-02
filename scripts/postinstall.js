#!/usr/bin/env node

const green = (msg) => `\x1b[32m${msg}\x1b[0m`; // green
const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`; // cyan
const bold = (msg) => `\x1b[1m${msg}\x1b[0m`; // bold

function sponsorMessageInstall() {
  console.log(`
${green('💚 Thank you for installing prisma-zod-generator!')}  

If this package saves you time, please consider sponsoring me.
Your support helps me maintain this project and hopefully upgrade
from my old Dell Latitude E6440 to a proper laptop 💻🙂  

👉 ${cyan('Sponsor here:')} ${bold('https://github.com/sponsors/omar-dulaimi')}
  `);
}

sponsorMessageInstall();
