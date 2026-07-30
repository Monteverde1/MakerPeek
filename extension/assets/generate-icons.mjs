#!/usr/bin/env node
/**
 * Copy makerpeek-landing/favicon.svg → icon.svg and rasterize to PNGs (macOS qlmanage).
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const favicon = join(dir, '../../makerpeek-landing/favicon.svg');
const svgPath = join(dir, 'icon.svg');
const thumb = join(dir, 'icon.svg.png');

if (!existsSync(favicon)) {
  console.error('Missing makerpeek-landing/favicon.svg');
  process.exit(1);
}

copyFileSync(favicon, svgPath);

execSync(`qlmanage -t -s 512 -o "${dir}" "${svgPath}"`, { stdio: 'inherit' });

if (!existsSync(thumb)) {
  console.error('qlmanage failed — on macOS only; export PNGs manually from favicon.svg');
  process.exit(1);
}

for (const size of [16, 32, 48, 128]) {
  execSync(`magick "${thumb}" -resize ${size}x${size} "${join(dir, `icon-${size}.png`)}"`, {
    stdio: 'inherit',
  });
}

unlinkSync(thumb);
console.log('Wrote icon.svg + icon-16/32/48/128.png from makerpeek-landing/favicon.svg');
