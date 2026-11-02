'use strict';
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const directory = path.join(__dirname, '..', 'assets');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="61" fill="#f2b35b"/><g fill="none" stroke="#1d2939" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"><path d="M55 90V61h29m88 0h29v29m0 82v29h-29m-88 0H55v-29"/><rect x="77" y="83" width="102" height="90" rx="13"/><path d="m80 151 27-30 22 22 16-16 31 31"/></g><circle cx="151" cy="109" r="10" fill="#1d2939"/></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await fs.writeFile(path.join(directory, 'icon.png'), png);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  await fs.writeFile(path.join(directory, 'icon.ico'), Buffer.concat([header, png]));
  process.stdout.write('Uygulama simgeleri oluşturuldu.\n');
}
main().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });
